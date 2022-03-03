import * as vscode from 'vscode';
import {EventEmitter} from 'events';
//import {CompositeDisposable, Emitter} from 'atom';
import { SelectionMap, Selection, Position, Range } from './teletype-types';
import {TeletypeClient, EditorProxy, BufferProxy, FollowState, Portal, IPortalDelegate} from '@atom/teletype-client';
import BufferBinding from './buffer-binding';
import EditorBinding from './editor-binding';
import {getPortalURI} from './uri-helpers';
import NotificationManager from './notification-manager';

export default class HostPortalBinding implements IPortalDelegate {
  client: TeletypeClient;
  public readonly workspace: vscode.WorkspaceFolder;
  // public readonly editor: vscode.TextEditor;
  notificationManager: NotificationManager;
  editorBindingsByEditor: WeakMap<vscode.TextEditor, EditorBinding>;
  editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;
  bufferBindingsByBuffer: WeakMap<vscode.TextDocument, BufferBinding>;
  // disposables: any;
  private emitter: EventEmitter;
  lastUpdateTetherPromise: Promise<void>;
  didDispose: Function | undefined;
  portal: Portal | undefined;
  uri: string | undefined;
  // sitePositionsComponent: SitePositionsComponent | undefined;

  constructor (client: TeletypeClient, workspace: vscode.WorkspaceFolder, notificationManager: NotificationManager, didDispose: Function | undefined = undefined) {
    this.client = client;
    this.workspace = workspace;
    // this.editor = editor;
    this.notificationManager = notificationManager;
    this.editorBindingsByEditor = new WeakMap();
    this.editorBindingsByEditorProxy = new Map();
    this.bufferBindingsByBuffer = new WeakMap();
    // this.disposables = new CompositeDisposable();
    this.emitter = new EventEmitter();
    this.lastUpdateTetherPromise = Promise.resolve();
    this.didDispose = didDispose;
  }

  // @override
  hostDidLoseConnection(): void {
  }

  // @override
  hostDidClosePortal(): void {
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
      vscode.window.showInformationMessage(`Create Portal with ID ${this.uri}`);

      this.portal.setDelegate(this);
      // this.disposables.add(
      //   this.workspace.observeTextEditors(this.didAddTextEditor.bind(this)),
      //   this.workspace.observeActiveTextEditor(this.didChangeActiveTextEditor.bind(this))
      // );
      vscode.window.onDidChangeActiveTextEditor((e) => {
        this.didChangeActiveTextEditor(e);
      });
      vscode.workspace.onDidOpenTextDocument(async (e) => {
        const editor = await vscode.window.showTextDocument(e);
        this.didAddTextEditor(editor);
      });

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

  dispose () {
    // this.workspace.getElement().classList.remove('teletype-Host');
    // this.sitePositionsComponent.destroy();
    // this.disposables.dispose();
    if(this.didDispose) {
      this.didDispose();
    }
  }

  close () {
    this.portal?.dispose();
  }

  siteDidJoin (siteId: number) {
    const {login} = this.portal?.getSiteIdentity(siteId);
    this.notificationManager.addInfo(`@${login} has joined your portal`);
    this.emitter.emit('did-change');
  }

  siteDidLeave (siteId: number) {
    const {login} = this.portal?.getSiteIdentity(siteId);
    this.notificationManager.addInfo(`@${login} has left your portal`);
    this.emitter.emit('did-change');
  }

  onDidChange (callback: (...args: any[]) => void) {
    return this.emitter.on('did-change', callback);
  }

  didChangeActiveTextEditor (editor: vscode.TextEditor | undefined) {
    //if (editor && !editor.isRemote) {
    if (editor) {
      const editorProxy = this.findOrCreateEditorProxyForEditor(editor);
      this.portal?.activateEditorProxy(editorProxy);
      // this.sitePositionsComponent.show(editor.element);
    } else {
      this.portal?.activateEditorProxy(null);
      // this.sitePositionsComponent.hide();
    }
  }

  updateActivePositions (positionsBySiteId: Position[]) {
    // this.sitePositionsComponent.update({positionsBySiteId});
  }

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
    const editorBinding = this.editorBindingsByEditorProxy.get(editorProxy);

    if (followState === FollowState.RETRACTED) {
      // await vscode.workspace.openTextDocument(editorBinding?.editor, {searchAllPanes: true});
      if (position) { editorBinding?.updateTether(followState, position); }
    } else {
      if (position) { this.editorBindingsByEditorProxy.forEach((a,b) => a?.updateTether(followState, position)); }
    }
  }

  didAddTextEditor (editor: vscode.TextEditor) {
    //if (!editor.isRemote) { 
      this.findOrCreateEditorProxyForEditor(editor); 
    //}
  }

  findOrCreateEditorProxyForEditor (editor: vscode.TextEditor) : EditorProxy | undefined {
    let editorBinding = this.editorBindingsByEditor.get(editor);
    if (editorBinding) {
      return editorBinding.editorProxy;
    } else {
      if (this.portal) {
        const bufferProxy = this.findOrCreateBufferProxyForBuffer(editor.document, editor);
        const editorProxy = this.portal.createEditorProxy({bufferProxy});
        editorBinding = new EditorBinding(editor, this.portal, true);
        editorBinding.setEditorProxy(editorProxy);
        editorProxy?.setDelegate(editorBinding);

        this.editorBindingsByEditor.set(editor, editorBinding);
        this.editorBindingsByEditorProxy.set(editorProxy, editorBinding);

        // const didDestroyEditorSubscription = editor.onDidDestroy(() => editorProxy.dispose());
        editorBinding.onDidDispose(() => {
        //   didDestroyEditorSubscription.dispose();
           this.editorBindingsByEditorProxy.delete(editorProxy);
        });

        return editorProxy;
      }
    }
    return undefined;
  }

  findOrCreateBufferProxyForBuffer (buffer: vscode.TextDocument, editor: vscode.TextEditor) : BufferProxy | null {
    let bufferBinding = this.bufferBindingsByBuffer.get(buffer);
    if (bufferBinding) {
      return bufferBinding.bufferProxy;
    } else {
      if(this.portal) {
        bufferBinding = new BufferBinding(buffer, editor, true);
        const bufferProxy = this.portal.createBufferProxy({
          uri: bufferBinding.getBufferProxyURI(),
          // history: buffer.getHistory()
        });
        bufferBinding.setBufferProxy(bufferProxy);
        bufferProxy.setDelegate(bufferBinding);

        this.bufferBindingsByBuffer.set(buffer, bufferBinding);

        return bufferProxy;
      }
    }

    return null;
  }
}
