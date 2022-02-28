import * as vscode from 'vscode';
import {EventEmitter} from 'events';
//const {CompositeDisposable, Emitter, TextEditor, TextBuffer} = require('atom');
import { SelectionMap, Selection, Position, Range} from './teletype-types';
import {BufferProxy, EditorProxy, Errors, FollowState, TeletypeClient, Portal, IPortalDelegate, EditorProxyMetadata} from '@atom/teletype-client';
import BufferBinding from './buffer-binding';
import EditorBinding from './editor-binding';
import getPathWithNativeSeparators from './get-path-with-native-separators';
import {getEditorURI} from './uri-helpers';
import NotificationManager from './notification-manager';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const NOOP = () => {};

export default class GuestPortalBinding implements IPortalDelegate {
  client: TeletypeClient;
  portalId: string;
  // public readonly workspace: vscode.WorkspaceFolder;
	// public readonly editor: vscode.TextEditor;
  notificationManager: NotificationManager;
  emitDidDispose: any;
  lastActivePaneItem: null;
	// private editorBindingsByEditorProxy : Map<EditorProxy, EditorBinding>;
  // private bufferBindingsByBufferProxy : Map<BufferProxy, BufferBinding>;
  private bufferBindingsByBuffer : Map<vscode.TextDocument, BufferBinding>;
	private editorBindingsByEditor : Map<vscode.TextEditor, EditorBinding>;
	private editorProxiesByEditor : WeakMap<vscode.TextEditor, EditorProxy>;
  editorBindingsByEditorProxyId: Map<number, EditorBinding>;
  // private editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;
  bufferBindingsByBufferProxyId: Map<number, BufferBinding>;
  editorProxiesMetadataById: Map<number, EditorProxyMetadata>;
  emitter: EventEmitter;
  // subscriptions: any;
  lastEditorProxyChangePromise: Promise<void>;
  shouldRelayActiveEditorChanges: boolean;
  public portal: Portal | null = null;
  // sitePositionsComponent: SitePositionsComponent;
  newActivePaneItem: any;
  triggerSelectionChanges: any;

  constructor (client: TeletypeClient, portalId: string, notificationManager: NotificationManager, didDispose: Function) {
    this.client = client;
    this.portalId = portalId;
    // this.workspace = workspace;
    // this.editor = editor;
    this.notificationManager = notificationManager;
    this.emitDidDispose = didDispose || NOOP;
    this.lastActivePaneItem = null;
    this.editorBindingsByEditorProxyId = new Map();
    this.bufferBindingsByBufferProxyId = new Map();
    this.editorProxiesByEditor = new WeakMap();
    this.editorProxiesMetadataById = new Map();
		this.bufferBindingsByBuffer = new Map();
    this.editorBindingsByEditor = new Map();
    this.emitter = new EventEmitter();
    // this.subscriptions = new CompositeDisposable();
    this.lastEditorProxyChangePromise = Promise.resolve();
    this.shouldRelayActiveEditorChanges = true;
  }

  async initialize () {
    try {
      this.portal = await this.client.joinPortal(this.portalId);
      if (!this.portal) { return false; }

      // this.sitePositionsComponent = new SitePositionsComponent({portal: this.portal, workspace: this.workspace});
      // this.subscriptions.add(this.workspace.onDidChangeActivePaneItem(this.didChangeActivePaneItem.bind(this)));

      await this.portal.setDelegate(this);
			//vscode.window.showInformationMessage('Joined Portal with ID' + ' ' + this.portalId + ' ');
			this.registerWorkspaceEvents();

      this.notificationManager.addInfo(`Joined Portal with ID ${this.portalId}`, {
        description: '',
        dismissable: true
      });
  
      return true;
    } catch (error) {
      this.didFailToJoin(error as Error);
      return false;
    }
  }

  dispose () {
    // this.subscriptions.dispose();
    // this.sitePositionsComponent.destroy();

    this.emitDidDispose();
  }

  siteDidJoin (siteId: number) {
    const {login: hostLogin} = this.portal?.getSiteIdentity(1);
    const {login: siteLogin} = this.portal?.getSiteIdentity(siteId);
    this.notificationManager.addInfo(`@${siteLogin} has joined @${hostLogin}'s portal`);
    this.emitter.emit('did-change');
    vscode.window.showInformationMessage('Joined Portal with ID' + ' ' + this.portalId + ' ');
  }

  siteDidLeave (siteId: number) {
    const {login: hostLogin} = this.portal?.getSiteIdentity(1);
    const {login: siteLogin} = this.portal?.getSiteIdentity(siteId);
    this.notificationManager.addInfo(`@${siteLogin} has left @${hostLogin}'s portal`);
    this.emitter.emit('did-change');
    vscode.window.showInformationMessage('Leaved Portal with ID' + ' ' + this.portalId + ' ');
  }

  didChangeEditorProxies () {}

  getRemoteEditors (): any[] | null {
    if (!this.portal) { return null; }

    const hostIdentity = this.portal?.getSiteIdentity(1);
    const bufferProxyIds = new Set();
    const remoteEditors = [];
    const editorProxiesMetadata = this.portal?.getEditorProxiesMetadata();

    if(editorProxiesMetadata){
      for (let i = 0; i < editorProxiesMetadata.length; i++) {
        const {id, bufferProxyId, bufferProxyURI} = editorProxiesMetadata[i];
        if (bufferProxyIds.has(bufferProxyId)) { continue; }

        remoteEditors.push({
          hostGitHubUsername: hostIdentity.login,
          uri: getEditorURI(this.portal.id, id),
          path: getPathWithNativeSeparators(bufferProxyURI)
        });
        bufferProxyIds.add(bufferProxyId);
      }
    }

    return remoteEditors;
  }

  async getRemoteEditor (editorProxyId: number) : Promise<vscode.TextEditor | null> {
    const editorProxy = await this.portal?.findOrFetchEditorProxy(editorProxyId);
    if (editorProxy) {
      return this.findOrCreateEditorForEditorProxy(editorProxy);
    } else {
      return null;
    }
  }

  updateActivePositions (positionsBySiteId: Position[]) : void {
    // this.sitePositionsComponent.update({positionsBySiteId});
  }

  // @override
  updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
    if (editorProxy) {
      this.lastEditorProxyChangePromise = this.lastEditorProxyChangePromise.then(() =>
        this._updateTether(followState, editorProxy, position)
      );
    }

    return this.lastEditorProxyChangePromise;
  }

  // Private
  async _updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
    if (followState === FollowState.RETRACTED) {
      const editor = this.findOrCreateEditorForEditorProxy(editorProxy);
      this.shouldRelayActiveEditorChanges = false;
      // await this.openPaneItem(editor);
      this.shouldRelayActiveEditorChanges = true;
    } else {
      if (position) { this.editorBindingsByEditorProxyId.forEach((a,b) => a.updateTether(followState, position)); }
    }

    const editorBinding = this.editorBindingsByEditorProxyId.get(editorProxy.id);
    if (editorBinding && position) {
      editorBinding.updateTether(followState, position);
    }
  }

  // Private
  async findOrCreateEditorForEditorProxy (editorProxy: EditorProxy) : Promise<vscode.TextEditor | null> {
    let editor: vscode.TextEditor;
    let editorBinding = this.editorBindingsByEditorProxyId.get(editorProxy.id);
    if (editorBinding) {
      editor = editorBinding.editor;
    } else {
      const {bufferProxy} = editorProxy;
      const buffer = await this.findOrCreateBufferForBufferProxy(bufferProxy);
      if (buffer && this.portal) {
        const document = await vscode.workspace.openTextDocument(buffer.uri);
        editor = await vscode.window.showTextDocument(document);
        if (editor !== null) {
          editorBinding = new EditorBinding(editor, this.portal, false);
          editorBinding.setEditorProxy(editorProxy);
          editorProxy.setDelegate(editorBinding);

          this.editorBindingsByEditorProxyId.set(editorProxy.id, editorBinding);
          this.editorProxiesByEditor.set(editor, editorProxy);

          // const didDestroyEditorSubscription = vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => editorBinding.dispose());
          editorBinding.onDidDispose(() => {
          //   didDestroyEditorSubscription.dispose();

          //   const isRetracted = this.portal?.resolveFollowState() === FollowState.RETRACTED;
          //   this.shouldRelayActiveEditorChanges = !isRetracted;
          //   editor.close();
          //   this.shouldRelayActiveEditorChanges = true;

            this.editorProxiesByEditor.delete(editor);
            this.editorBindingsByEditorProxyId.delete(editorProxy.id);
          });
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    return editor;
  }

  private async findOrCreateBufferForBufferProxy (bufferProxy: BufferProxy) : Promise<vscode.TextDocument | undefined>{
		let buffer : vscode.TextDocument | undefined;
    let bufferBinding = this.bufferBindingsByBufferProxyId.get(bufferProxy.id);
    if (bufferBinding) {
      buffer = bufferBinding.buffer;
    } else {
			const filePath = path.join(os.tmpdir(), this.portalId, bufferProxy.uri);
			const bufferURI = vscode.Uri.file(filePath);
			await require('mkdirp-promise')(path.dirname(filePath));
			fs.writeFileSync(filePath, '');

			buffer = await vscode.workspace.openTextDocument(bufferURI);
			const editor = await vscode.window.showTextDocument(buffer);
      bufferBinding = new BufferBinding(
        buffer, editor, false, () => this.bufferBindingsByBufferProxyId.delete(bufferProxy.id)
      );

      bufferBinding.setBufferProxy(bufferProxy);
      bufferProxy.setDelegate(bufferBinding);

      this.bufferBindingsByBufferProxyId.set(bufferProxy.id, bufferBinding);
			this.bufferBindingsByBuffer.set(buffer, bufferBinding);
    }
    return buffer;
  }

  activate () {
    // const paneItem = this.lastActivePaneItem;
    // const pane = this.workspace.paneForItem(paneItem);
    // if (pane && paneItem) {
    //   pane.activateItem(paneItem);
    //   pane.activate();
    // }
  }

  didFailToJoin (error: Error) {
    let message, description;
    if (error instanceof Errors.PortalNotFoundError) {
      message = 'Portal not found';
      description =
        'The portal you were trying to join does not exist. ' +
        'Please ask your host to provide you with their current portal URL.';
    } else {
      message = 'Failed to join portal';
      description =
        `Attempting to join portal failed with error: <code>${error.message}</code>\n\n` +
        'Please wait a few moments and try again.';
    }
    this.notificationManager.addError(message, {
      description,
      dismissable: true
    });
  }

  hostDidClosePortal () {
    this.notificationManager.addInfo('Portal closed', {
      description: 'Your host stopped sharing their editor.',
      dismissable: true
    });
  }

  hostDidLoseConnection () {
    this.notificationManager.addInfo('Portal closed', {
      description: (
        'We haven\'t heard from the host in a while.\n' +
        'Once your host is back online, they can share a new portal with you to resume collaborating.'
      ),
      dismissable: true
    });
  }

  leave () {
    if (this.portal) { this.portal.dispose(); }
  }

  // async openPaneItem (newActivePaneItem) {
  //   this.newActivePaneItem = newActivePaneItem;
  //   await this.workspace.open(newActivePaneItem, {searchAllPanes: true});
  //   this.lastActivePaneItem = this.newActivePaneItem;
  //   this.newActivePaneItem = null;
  // }

  // didChangeActivePaneItem (paneItem) {
  //   const editorProxy = this.editorProxiesByEditor.get(paneItem);

  //   if (editorProxy) {
  //     this.sitePositionsComponent.show(paneItem.element);
  //   } else {
  //     this.sitePositionsComponent.hide();
  //   }

  //   if (this.shouldRelayActiveEditorChanges) {
  //     this.portal.activateEditorProxy(editorProxy);
  //   }
  // }

  hasPaneItem(paneItem: vscode.TextEditor) : boolean {
    return this.editorProxiesByEditor.has(paneItem);
  }

  getActivePaneItem() : vscode.TextEditor {
    return this.newActivePaneItem || vscode.window.activeTextEditor;
  }

  onDidChange(callback: Function) {
    // return this.emitter.on('did-change', callback);
  }


	private registerWorkspaceEvents () {
		// vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this));
		// vscode.workspace.onWillSaveTextDocument(this.saveDocument.bind(this));
		// vscode.window.onDidChangeTextEditorSelection(this.triggerSelectionChanges.bind(this));
	}

	private onDidChangeTextDocument (event : vscode.TextDocumentChangeEvent) {
		if(this.bufferBindingsByBuffer){
			const bufferBinding = this.bufferBindingsByBuffer.get(event.document);
			if (bufferBinding) {
				bufferBinding.onDidChangeBuffer(event.contentChanges);
			}
		}
	}

	private saveDocument (event : vscode.TextDocumentWillSaveEvent) {
		if(this.bufferBindingsByBuffer){
      const bufferBinding = this.bufferBindingsByBuffer.get(event.document);
      if (bufferBinding) {
        event.waitUntil(bufferBinding.requestSavePromise());
      }
    }
  }
}
