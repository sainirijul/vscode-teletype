import * as vscode from 'vscode';
import {EventEmitter} from 'events';
//import {CompositeDisposable, Emitter} from 'atom';
import { SelectionMap, Selection, Position, Range } from './teletype-types';
import {TeletypeClient, EditorProxy, BufferProxy, FollowState, Portal, IPortalDelegate} from '@atom/teletype-client';
import BufferBinding from './buffer-binding';
import EditorBinding from './editor-binding';
import {getPortalURI} from './uri-helpers';
import NotificationManager from './notification-manager';
import WorkspaceManager from './workspace-manager';
import { IPortalBinding, PortalBinding } from './portal-binding';


export default class HostPortalBinding extends PortalBinding {
  client: TeletypeClient;
  public readonly workspace: vscode.WorkspaceFolder;
  // public readonly editor: vscode.TextEditor;
  notificationManager: NotificationManager;
  workspaceManager: WorkspaceManager;
  // private editorBindingsByEditor: WeakMap<vscode.TextEditor, EditorBinding>;
  // private editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;
  // private bufferBindingsByBuffer: WeakMap<vscode.TextDocument, BufferBinding>;
  // disposables: any;
  // private emitter: EventEmitter;
  lastUpdateTetherPromise: Promise<void>;
  // didDispose: Function | undefined;
  // portal?: Portal;
  uri: string | undefined;
  // sitePositionsComponent: SitePositionsComponent | undefined;

  constructor (client: TeletypeClient, workspace: vscode.WorkspaceFolder, notificationManager: NotificationManager, workspaceManager: WorkspaceManager, didDispose: Function) {
    super(client, didDispose);

    this.client = client;
    this.workspace = workspace;
    // this.editor = editor;
    this.notificationManager = notificationManager;
    this.workspaceManager = workspaceManager;
    // this.editorBindingsByEditor = new WeakMap();
    // this.editorBindingsByEditorProxy = new Map();
    // this.bufferBindingsByBuffer = new WeakMap();
    // this.disposables = new CompositeDisposable();
    // this.emitter = new EventEmitter();
    this.lastUpdateTetherPromise = Promise.resolve();
    // this.didDispose = didDispose;
  }

  // @override
  hostDidLoseConnection(): void {
    this.emitter.emit('did-change', {type: 'close-portal'});
  }

  // @override
  hostDidClosePortal(): void {
    this.emitter.emit('did-change', {type: 'close-portal'});
  }

  // @override
  didChangeEditorProxies(): void {
  }

  async initialize (): Promise<boolean> {
    try {
      this.portal = await this.client.createPortal();
      if (!this.portal) { return false; }

      this.uri = getPortalURI(this.portal.id);
      // this.sitePositionsComponent = new SitePositionsComponent({portal: this.portal, workspace: this.workspace});
      this.notificationManager?.addInfo(`Create Portal with ID ${this.uri}`);
      vscode.env.clipboard.writeText(this.uri);

      this.portal.setDelegate(this);
      // this.disposables.add(
      //   this.workspace.observeTextEditors(this.didAddTextEditor.bind(this)),
      //   this.workspace.observeActiveTextEditor(this.didChangeActiveTextEditor.bind(this))
      // );
      vscode.window.onDidChangeActiveTextEditor((e) => {
        const editor = e as vscode.TextEditor;
        const doc = editor.document as vscode.TextDocument;
        if (doc.uri.scheme === 'file'){
          this.didChangeActiveTextEditor(editor);
        }
      });
      vscode.workspace.onDidOpenTextDocument(async (e) => {
        if (e.uri.scheme === 'file'){
          //if (e.isClosed) {
          const editor = await vscode.window.showTextDocument(e);
          await this.didAddTextEditor(editor);
          //}
        }
      });
      // vscode.workspace.onDidCloseTextDocument(async (e) => {
      //   this.didRemoveTextEditor(e);
      // });

      // this.workspace.getElement().classList.add('teletype-Host');
      return true;
    } catch (error) {
      this.notificationManager.addError('Failed to share portal', {
        description: `Attempting to share a portal failed with error: <code>${(error as Error).message}</code>`,
        dismissable: true
      });
      return false;
    }
  }

  // @override
  dispose () {
    this.emitter.emit('did-change', {type: 'close-portal'});

    // this.workspace.getElement().classList.remove('teletype-Host');
    // this.sitePositionsComponent.destroy();
    // this.disposables.dispose();
    // if(this.didDispose) {
    //   this.didDispose();
    // }
    super.dispose();
  }

  close () {
    this.portal?.dispose();
  }

  // @override
  siteDidJoin (siteId: number) {
    const site = this.portal?.getSiteIdentity(siteId);
    this.notificationManager.addInfo(`@${site?.login} has joined your portal`);
    this.emitter.emit('did-change', {type: 'join-portal', portal: this.portal});
  }

  // @override
  siteDidLeave (siteId: number) {
    const site = this.portal?.getSiteIdentity(siteId);
    this.notificationManager.addInfo(`@${site?.login} has left your portal`);
    this.emitter.emit('did-change', {type: 'leave-portal', portal: this.portal});
  }

  onDidChange (callback: (...args: any[]) => void) {
    return this.emitter.on('did-change', callback);
  }

  async didChangeActiveTextEditor (editor?: vscode.TextEditor) {
    if (editor && !this.workspaceManager.editorBindingsByEditorDocument.get(editor.document)?.isRemote) {
      const editorProxy = await this.workspaceManager.findOrCreateEditorProxyForEditor(editor, this.portal);
      if (editorProxy !== this.portal?.activateEditorProxy) {
        this.portal?.activateEditorProxy(editorProxy);
        // this.sitePositionsComponent.show(editor.element);
      }
    } else {
      this.portal?.activateEditorProxy(null);
      // this.sitePositionsComponent.hide();
    }
  }

  // @override
  updateActivePositions (positionsBySiteId: Position[]) {
    // this.sitePositionsComponent.update({positionsBySiteId});
  }

  // @override
  updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
    if (editorProxy) {
      this.lastUpdateTetherPromise = this.lastUpdateTetherPromise.then(() =>
        this._updateTether(followState, editorProxy, position)
      );
    }

    return this.lastUpdateTetherPromise;
  }

  // Private
  async _updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
    const editorBinding = this.workspaceManager.editorBindingsByEditorProxy.get(editorProxy);

    if (followState === FollowState.RETRACTED) {
      // await vscode.workspace.openTextDocument(editorBinding?.editor, {searchAllPanes: true});
      if (position) { editorBinding?.updateTether(followState, position); }
    } else {
      if (position) { this.workspaceManager.editorBindingsByEditorProxy.forEach((a,b) => a?.updateTether(followState, position)); }
    }
  }

  async didAddTextEditor (editor: vscode.TextEditor) {
    if (!this.workspaceManager.editorBindingsByEditorDocument.get(editor.document)?.isRemote) {
      await this.workspaceManager.findOrCreateEditorProxyForEditor(editor, this.portal); 
    }
  }

  // didRemoveTextEditor (buffer: vscode.TextDocument) {
  //   const bufferBiding = this.workspaceManager.bufferBindingsByBuffer.get(buffer);
  //   if (bufferBiding?.editor){
  //     const editorProxy = this.workspaceManager.editorProxiesByEditor.get(bufferBiding.editor);
  //     editorProxy?.dispose();
  //   }
  // }
}
