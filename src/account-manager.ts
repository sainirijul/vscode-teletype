import * as vscode from 'vscode';
import {EventEmitter} from 'events';
import NotificationManager from './notification-manager';

export default class AccountManager {
	// public editorBindingsByEditorProxy : Map<EditorProxy, EditorBinding>;
  // public bufferBindingsByBufferProxy : Map<BufferProxy, BufferBinding>;
  private emitter: EventEmitter;
  private notificationManager?: NotificationManager;

  constructor (notificationManager?: NotificationManager) {
    // this.workspace = workspace;
    // this.editor = editor;
    this.emitter = new EventEmitter();
    this.notificationManager = notificationManager;
  }

  public async initialize () {
    this.registerWorkspaceEvents();
    return true;
  }

  dispose () {
    // this.emitDidDispose();
  }

  update(siteId: number) {
    // throw new Error('Method not implemented.');
  }

  onDidChange(callback: Function) {
    // return this.emitter.on('did-change', callback);
  }

	private registerWorkspaceEvents () {
    // vscode.workspace.onDidCloseTextDocument(async (e) => {
    //   this.didRemoveTextEditor(e);
    // });
	}
}
