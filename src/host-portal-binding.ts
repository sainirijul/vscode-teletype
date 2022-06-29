import * as vscode from 'vscode';
import {EventEmitter} from 'events';
import { SelectionMap, Selection, Position, Range } from './teletype-types';
import {TeletypeClient, EditorProxy, BufferProxy, FollowState, Portal, IPortalDelegate} from '@atom/teletype-client';
import BufferBinding from './buffer-binding';
import EditorBinding from './editor-binding';
import {getPortalURI} from './uri-helpers';
import NotificationManager from './notification-manager';
import WorkspaceManager from './workspace-manager';
import { IPortalBinding, PortalBinding } from './portal-binding';
import * as path from 'path';


export default class HostPortalBinding extends PortalBinding implements IPortalDelegate {
  client: TeletypeClient;
  public readonly workspace: vscode.WorkspaceFolder;
  // public readonly editor: vscode.TextEditor;
  notificationManager: NotificationManager;
  // workspaceManager: WorkspaceManager;
  // private editorBindingsByEditor: WeakMap<vscode.TextEditor, EditorBinding>;
  // private editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;
  // private bufferBindingsByBuffer: WeakMap<vscode.TextDocument, BufferBinding>;
  // disposables: any;
  // private emitter: EventEmitter;
  lastUpdateTetherPromise: Promise<void>;
  // didDispose: Function | undefined;
  // portal?: Portal;
  uri: string | undefined;
  closeDocumentEventListener?: vscode.Disposable;
  changeActiveEditorEventListener?: vscode.Disposable;
  openDocumentEventListener?: vscode.Disposable;
  // sitePositionsComponent: SitePositionsComponent | undefined;

  constructor (client: TeletypeClient, workspace: vscode.WorkspaceFolder, notificationManager: NotificationManager, workspaceManager: WorkspaceManager, didDispose: Function) {
    super(workspaceManager, client, didDispose);

    this.client = client;
    this.workspace = workspace;
    // this.editor = editor;
    this.notificationManager = notificationManager;
    // this.workspaceManager = workspaceManager;
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

      this.changeActiveEditorEventListener = vscode.window.onDidChangeActiveTextEditor(this.didChangeActiveTextEditor.bind(this));
      this.openDocumentEventListener = vscode.workspace.onDidOpenTextDocument(this.didOpenTextDocument.bind(this));
      this.closeDocumentEventListener = vscode.workspace.onDidCloseTextDocument(this.didCloseTextDocument.bind(this));

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

    this.closeDocumentEventListener?.dispose();
    this.changeActiveEditorEventListener?.dispose();
    this.openDocumentEventListener?.dispose();

    super.dispose();
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

  isWorkspaceFiles(fsPath: string) : boolean {
    fsPath = path.normalize(fsPath);
    const parentPath = path.normalize(this.workspace.uri.fsPath);
    const relPath = path.relative(this.workspace.uri.fsPath, fsPath);
    return fsPath.startsWith(parentPath);
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
  _updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
    if (followState === FollowState.RETRACTED) {
      const editorBinding = this.workspaceManager.getEditorBindingByEditorProxy(editorProxy);
      // await vscode.workspace.openTextDocument(editorBinding?.editor, {searchAllPanes: true});
      if (position) { 
        editorBinding?.updateTether(followState, position); 
      }
    } else {
      if (position) { 
        this.workspaceManager.getEditorBindings().forEach(editorBinding => {
          editorBinding.updateTether(followState, position);
        });
      }
    }
  }

  private async didOpenTextDocument(document: vscode.TextDocument) {
    if (document.uri.scheme === 'file' && this.isWorkspaceFiles(document.uri.fsPath)) {
      const bufferBinding = await this.workspaceManager.findOrCreateBufferBindingForBuffer(document, this.portal);
        // this.portal?.activateEditorProxy(editorBinding?.editorProxy);
         // this.sitePositionsComponent.show(editor.element);
      this.workspaceManager.addHostTextDocument(document);
    }
  }

  private didChangeActiveTextEditor (editor?: vscode.TextEditor) {
    if (editor) {
      const doc = editor.document;
      if (doc.uri.scheme === 'file' && this.isWorkspaceFiles(doc.uri.fsPath) && this.workspaceManager.getBufferBindingByBuffer(doc)?.bufferProxy.isHost) {
        //const editorProxy = await this.workspaceManager.findOrCreateEditorProxyForEditor(editor, this.portal);
        //const editorBinding = this.workspaceManager.getEditorBindingByEditor(editor);
        const editorBinding = this.workspaceManager.findOrCreateEditorBindingForEditor(editor, this.portal);
        if (editorBinding?.editorProxy !== this.portal?.activateEditorProxy) {
          this.portal?.activateEditorProxy(editorBinding?.editorProxy);
        // this.sitePositionsComponent.show(editor.element);
        }
      }
    } else {
      this.portal?.activateEditorProxy(null);
      // this.sitePositionsComponent.hide();
    }
  }

  didAddTextEditor (editor: vscode.TextEditor) {
    if (this.workspaceManager.getBufferBindingByBuffer(editor?.document)?.bufferProxy.isHost) {
      this.workspaceManager.findOrCreateEditorBindingForEditor(editor, this.portal); 
    }
  }

  didCloseTextDocument (buffer: vscode.TextDocument) {
    const bufferBiding = this.workspaceManager.getBufferBindingByBuffer(buffer);
    if (bufferBiding){
      // const editorProxy = this.workspaceManager.editorBindingsByBuffer.get(bufferBiding.buffer);
      bufferBiding.bufferProxy?.dispose();
    }
  }
}
