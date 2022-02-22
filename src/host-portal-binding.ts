import * as vscode from 'vscode';
import {EventEmitter} from 'events';
//import {CompositeDisposable, Emitter} from 'atom';
import { SelectionMap, Selection, Position, Range } from './teletype-types';
import {TeletypeClient, EditorProxy, BufferProxy, FollowState} from '@atom/teletype-client';
import BufferBinding from './buffer-binding';
import EditorBinding from './editor-binding';
import {getPortalURI} from './uri-helpers';
import NotificationManager from './notification-manager';

export default class HostPortalBinding {
  client: TeletypeClient;
  workspace: any;
  notificationManager: NotificationManager;
  editorBindingsByEditor: WeakMap<object, any>;
  editorBindingsByEditorProxy: Map<any, any>;
  bufferBindingsByBuffer: WeakMap<object, any>;
  // disposables: any;
  private emitter: EventEmitter;
  lastUpdateTetherPromise: Promise<void>;
  didDispose: Function | undefined;
  portal: any;
  uri: string | undefined;
  // sitePositionsComponent: SitePositionsComponent | undefined;

  constructor (client: TeletypeClient, workspace, notificationManager: NotificationManager, didDispose: Function | undefined = undefined) {
    this.client = client;
    this.workspace = workspace;
    this.notificationManager = notificationManager;
    this.editorBindingsByEditor = new WeakMap();
    this.editorBindingsByEditorProxy = new Map();
    this.bufferBindingsByBuffer = new WeakMap();
    // this.disposables = new CompositeDisposable();
    this.emitter = new EventEmitter();
    this.lastUpdateTetherPromise = Promise.resolve();
    this.didDispose = didDispose;
  }

  async initialize (): Promise<boolean> {
    try {
      this.portal = await this.client.createPortal();
      if (!this.portal) { return false; }

      this.uri = getPortalURI(this.portal.id);
      // this.sitePositionsComponent = new SitePositionsComponent({portal: this.portal, workspace: this.workspace});

      this.portal.setDelegate(this);
      this.disposables.add(
        this.workspace.observeTextEditors(this.didAddTextEditor.bind(this)),
        this.workspace.observeActiveTextEditor(this.didChangeActiveTextEditor.bind(this))
      );

      this.workspace.getElement().classList.add('teletype-Host');
      return true;
    } catch (error) {
      this.notificationManager.addError('Failed to share portal', {
        description: `Attempting to share a portal failed with error: <code>${error.message}</code>`,
        dismissable: true
      });
      return false;
    }
  }

  dispose () {
    this.workspace.getElement().classList.remove('teletype-Host');
    // this.sitePositionsComponent.destroy();
    this.disposables.dispose();
    if(this.didDispose) {
      this.didDispose();
    }
  }

  close () {
    this.portal.dispose();
  }

  siteDidJoin (siteId: string) {
    const {login} = this.portal.getSiteIdentity(siteId);
    this.notificationManager.addInfo(`@${login} has joined your portal`);
    this.emitter.emit('did-change');
  }

  siteDidLeave (siteId: string) {
    const {login} = this.portal.getSiteIdentity(siteId);
    this.notificationManager.addInfo(`@${login} has left your portal`);
    this.emitter.emit('did-change');
  }

  onDidChange (callback: (...args: any[]) => void) {
    return this.emitter.on('did-change', callback);
  }

  didChangeActiveTextEditor (editor: vscode.TextEditor) {
    if (editor && !editor.isRemote) {
      const editorProxy = this.findOrCreateEditorProxyForEditor(editor);
      this.portal.activateEditorProxy(editorProxy);
      // this.sitePositionsComponent.show(editor.element);
    } else {
      this.portal.activateEditorProxy(null);
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
      await this.workspace.open(editorBinding.editor, {searchAllPanes: true});
      if (position) { editorBinding.updateTether(followState, position); }
    } else {
      this.editorBindingsByEditorProxy.forEach((b) => b.updateTether(followState));
    }
  }

  didAddTextEditor (editor: vscode.TextEditor) {
    if (!editor.isRemote) { this.findOrCreateEditorProxyForEditor(editor); }
  }

  findOrCreateEditorProxyForEditor (editor: vscode.TextEditor) {
    let editorBinding = this.editorBindingsByEditor.get(editor);
    if (editorBinding) {
      return editorBinding.editorProxy;
    } else {
      const bufferProxy = this.findOrCreateBufferProxyForBuffer(editor.getBuffer());
      const editorProxy = this.portal.createEditorProxy({bufferProxy});
      editorBinding = new EditorBinding(editor, this.portal, true);
      editorBinding.setEditorProxy(editorProxy);
      editorProxy.setDelegate(editorBinding);

      this.editorBindingsByEditor.set(editor, editorBinding);
      this.editorBindingsByEditorProxy.set(editorProxy, editorBinding);

      const didDestroyEditorSubscription = editor.onDidDestroy(() => editorProxy.dispose());
      editorBinding.onDidDispose(() => {
        didDestroyEditorSubscription.dispose();
        this.editorBindingsByEditorProxy.delete(editorProxy);
      });

      return editorProxy;
    }
  }

  findOrCreateBufferProxyForBuffer (buffer: vscode.TextDocument) {
    let bufferBinding = this.bufferBindingsByBuffer.get(buffer);
    if (bufferBinding) {
      return bufferBinding.bufferProxy;
    } else {
      bufferBinding = new BufferBinding(buffer, true);
      const bufferProxy = this.portal.createBufferProxy({
        uri: bufferBinding.getBufferProxyURI(),
        history: buffer.getHistory()
      });
      bufferBinding.setBufferProxy(bufferProxy);
      bufferProxy.setDelegate(bufferBinding);

      this.bufferBindingsByBuffer.set(buffer, bufferBinding);

      return bufferProxy;
    }
  }
}
