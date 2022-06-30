import * as vscode from 'vscode';
import * as converter from './teletype-converter';
import * as fs from 'fs';
import * as path from 'path';
import {EventEmitter} from 'events';
// const {Emitter, Range, CompositeDisposable, TextBuffer} = require('atom')
import { Position, Range, TextUdpate } from './teletype-types';
import { BufferProxy, Checkpoint, IBufferDelegate, Portal } from '@atom/teletype-client';
import getPathWithNativeSeparators from './get-path-with-native-separators';
import WorkspaceManager from './workspace-manager';

function doNothing () {}

export default class BufferBinding extends vscode.Disposable implements IBufferDelegate {
  public uri: string;
  // public textBuffer: string = '';
	public buffer?: vscode.TextDocument;
  public bufferProxy!: BufferProxy;
  // public portal!: Portal;
  public title: string | undefined;
	// public editor?: vscode.TextEditor;
	// private readonly isHost: boolean;
  // emitDidDispose: Function;
  public pendingUpdates: any[];
  private pendingChanges: vscode.TextDocumentContentChangeEvent[];
  disposed: boolean;
  disableHistory: boolean;
  // subscriptions: Disposable;
  bufferDestroySubscription: any;
  remoteFile?: RemoteFile;
  fsPath?: string;
  isUpdating: boolean = false;
  changeCnt: number = 0;
  private emitter: EventEmitter;

//	constructor(buffer: vscode.TextDocument | undefined, portal: Portal, title: string | undefined, editor: vscode.TextEditor | undefined, isHost: boolean = false, didDispose: Function = doNothing) {
  constructor(uri: string, buffer: vscode.TextDocument | undefined, bufferProxy: BufferProxy, title: string | undefined, didDispose: Function = doNothing) {  
    super(didDispose);

    this.uri = uri;
    this.buffer = buffer;
    // this.bufferProxy = bufferProxy;

    // this.portal = portal;
    // this.path = path ?? buffer.uri.toString();
    this.title = title ?? uri;
    // this.editor = editor;
    // this.isHost = isHost;
    // this.emitDidDispose = didDispose || doNothing;
    this.pendingChanges = [];
    this.disposed = false;
    this.disableHistory = false;
    if (bufferProxy.isHost) {
      // this.subscriptions.add(buffer.onDidChangePath(this.relayURIChange.bind(this)));
    }
    this.pendingUpdates = [];

    this.emitter = new EventEmitter();

    this.setBufferProxy(bufferProxy);

    this.monkeyPatchBufferMethods(this.buffer);
  }

  // @override
  dispose () {
    if (this.disposed) { return; }

    this.unbinding(this.bufferProxy.isHost);

    // this.subscriptions.dispose();
    // if (this.buffer) {
      // this.buffer.restoreDefaultHistoryProvider(this.bufferProxy.getHistory(this.buffer.maxUndoEntries));
      // this.buffer = undefined;
    // }
    if (this.bufferDestroySubscription) { this.bufferDestroySubscription.dispose(); }
    if (this.remoteFile) { this.remoteFile.dispose(); }
    // this.emitDidDispose();

    this.disposed = true;
  }

  isBinded() : boolean {
    return this.buffer !== undefined;
  }

  unbinding(isHost: boolean) {
    if (!isHost && this.fsPath) {
      fs.unlinkSync(this.fsPath);
    }
    this.buffer = undefined;
  }

  setBuffer(buffer: vscode.TextDocument | undefined) {
    this.buffer = buffer;
  }

  setBufferProxy (bufferProxy: BufferProxy) {
    this.bufferProxy = bufferProxy;

    // // this.buffer?.setHistoryProvider(this);
    while (this.pendingChanges.length > 0) {
      this.pushChange(this.pendingChanges.shift());
    }
    if (!this.bufferProxy.isHost) {
      this.remoteFile = new RemoteFile(bufferProxy.uri);
      // this.buffer?.setFile(this.remoteFile);
    }

    // this.bufferDestroySubscription = this.buffer?.onDidDestroy(() => {
    //   if (this.isHost) {
    //     bufferProxy.dispose();
    //   } else {
    //     this.dispose();
    //   }
    // });
  }

  monkeyPatchBufferMethods (buffer: any) {
    // vscode의 document는 extensible하지 않기 때문에 monkey patch가 안 된다.

  }
    
  // @override
  setText (text: string) : void {
    this.disableHistory = true;
    // this.buffer?.setTextInRange(this.buffer?.getRange(), text);
    if (this.fsPath) {
		  fs.writeFileSync(this.fsPath, text);
    }
    this.changeCnt++;
    this.disableHistory = false;
  }

  pushChange (change: vscode.TextDocumentContentChangeEvent | undefined) {
    if (this.disableHistory) { return; }
    if (!change) { return; }

    if (this.bufferProxy) {
      this.bufferProxy.setTextInRange(
        {row: change.range.start.line, column: change.range.start.character},
        {row: change.range.end.line, column: change.range.end.character},
        change.text
      ); 
      this.changeCnt++;
    } else {
      this.pendingChanges.push(change);
    }
  }

  pushChanges (changes: vscode.TextDocumentContentChangeEvent[]) {
    if (this.disableHistory) { return; }

    for (let i = changes.length - 1; i >= 0; i--) {
      this.pushChange(changes[i]);
    }
  }

  public applyUpdate(editor: vscode.TextEditor) : void {
    if (this.pendingUpdates.length <= 0) {
      return;
    }

    editor.edit(builder => {
        this.isUpdating = true;
        this.pendingUpdates.forEach(textUpdate => {
          this.disableHistory = true;
          builder.replace(this.createRange(textUpdate.oldStart, textUpdate.oldEnd), textUpdate.newText);
          this.disableHistory = false;
        });
        // this.isUpdating = false;
      }, { undoStopBefore: false, undoStopAfter: false });

    this.pendingUpdates = [];
  }

  // @override
  async updateText (textUpdates: any[]) {
    if (!textUpdates || textUpdates.length <= 0) { return; }

    // if (!this.buffer) { return; }
    // if (this.buffer.isClosed) { return; }

    try {
      // if (this.editor) {
        // this.editor.edit(builder => {
        //     this.isUpdating = true;
        //     textUpdates.forEach(textUpdate => {
        //       this.disableHistory = true;
        //       builder.replace(this.createRange(textUpdate.oldStart, textUpdate.oldEnd), textUpdate.newText);
        //       this.disableHistory = false;
        //     });
        //     // this.isUpdating = false;
        //   }, { undoStopBefore: false, undoStopAfter: false });

        textUpdates.forEach(textUpdate => {
          // this.bufferHistory.push(textUpdate.oldStart, textUpdate.oldEnd, textUpdate.newText);
          this.pendingUpdates.push({oldStart: textUpdate.oldStart, oldEnd: textUpdate.oldEnd, newText: textUpdate.newText});
        });
        this.emitter.emit('require-update', this);
      // }
    } catch(e) {
      console.log(e);
    }
  }

  onRequireUpdate(callback: (bufferBinding: BufferBinding) => void) {
    this.emitter.on('require-update', callback);
  }

  undo () {
    const result = this.bufferProxy.undo();
    if (result) {
      this.convertMarkerRanges(result.markers);
      return result;
    } else {
      return null;
    }
  }

  redo () {
    const result = this.bufferProxy.redo();
    if (result) {
      this.convertMarkerRanges(result.markers);
      return result;
    } else {
      return null;
    }
  }

	createRange(start: Position, end: Position): vscode.Range {
		return new vscode.Range(
			new vscode.Position(start.row, start.column),
			new vscode.Position(end.row, end.column)
		);
	}

  convertMarkerRanges (layersById: any[]) {
    for (const layerId in layersById) {
      const markersById = layersById[layerId];
      for (const markerId in markersById) {
        const marker = markersById[markerId];
        marker.range = converter.convertToVSCodeRange(marker.range);
      }
    }
  }

  getChangesSinceCheckpoint (checkpoint: Checkpoint) {
    return this.bufferProxy.getChangesSinceCheckpoint(checkpoint);
  }

  createCheckpoint (options: any[]) : Checkpoint | null {
    if (this.disableHistory) { return null; }

    return this.bufferProxy.createCheckpoint(options);
  }

  groupChangesSinceCheckpoint (checkpoint: any, options: any[]) {
    if (this.disableHistory) { return; }

    return this.bufferProxy.groupChangesSinceCheckpoint(checkpoint, options);
  }

  revertToCheckpoint (checkpoint: any, options: any[]) {
    if (this.disableHistory) { return; }

    const result = this.bufferProxy.revertToCheckpoint(checkpoint, options);
    if (result) {
      this.convertMarkerRanges(result.markers);
      return result;
    } else {
      return false;
    }
  }

  groupLastChanges () {
    if (this.disableHistory) { return; }

    return this.bufferProxy.groupLastChanges();
  }

  applyGroupingInterval (groupingInterval: number) {
    if (this.disableHistory) { return; }

    this.bufferProxy.applyGroupingInterval(groupingInterval);
  }

  enforceUndoStackSizeLimit () {}

  // @override
  save () : void {
    // 수신이 완료됨
    //if (this.buffer?.uri) { 
      //this.buffer.save();
    //}
    this.emitter.emit('did-save', this);
  }

  relayURIChange () {
    this.bufferProxy.setURI(this.getBufferProxyURI());
  }

  // @override
  didChangeURI (uri: string) : void {
    if (this.remoteFile) { this.remoteFile.setURI(uri); }
  }

  getBufferProxyURI () {
    return this.title ?? 'untitled';
    // if (!this.buffer.uri.fsPath) { return 'untitled'; }
    // const [projectPath, relativePath] = atom.workspace.project.relativizePath(this.buffer.uri.fsPath);
    // if (projectPath) {
    //   const projectName = path.basename(projectPath);
    //   return path.join(projectName, relativePath);
    // } else {
    //   return relativePath;
    // }
    // return this.buffer.uri.toString();
    // return path.basename(this.buffer.fileName);
  }

  serialize (options: any[]) {
    // return this.serializeUsingDefaultHistoryProviderFormat(options);
    return null;
  }

  // serializeUsingDefaultHistoryProviderFormat (options: any[]) {
  //   const {maxUndoEntries} = this.buffer;
  //   this.buffer.restoreDefaultHistoryProvider(this.bufferProxy.getHistory(maxUndoEntries));
  //   const serializedDefaultHistoryProvider = this.buffer.historyProvider.serialize(options);

  //   this.buffer.setHistoryProvider(this);

  //   return serializedDefaultHistoryProvider;
  // }

	// onDidChangeBuffer(changes: ReadonlyArray<vscode.TextDocumentContentChangeEvent>) {
	// 	this.bufferProxy.onDidChangeBuffer(changes.map(change => {
	// 	 	const { start, end } = change.range;

	// 		return {
	// 			oldStart: { row: start.line, column: start.character },
	// 			oldEnd: { row: end.line, column: end.character },
	// 			newText: change.text
	// 		};
	// 	}));
	// }

	changeBuffer(changes: ReadonlyArray<vscode.TextDocumentContentChangeEvent>) {
    if (!changes) { return; }

    // if (this.changeCnt <= 1) {
    //   return;
    // }

    changes.forEach(change => {
      const { start, end } = change.range;

      this.bufferProxy.setTextInRange(
        { row: start.line, column: start.character },
        { row: end.line, column: end.character },
        change.text
      );
    });
    
  }

  //requestSavePromise(): Promise<vscode.TextEditor[]> {
  requestSavePromise(): Promise<void> {
		return new Promise(() => {
			this.bufferProxy.requestSave();
		});
  }
}

class RemoteFile {
  public uri: string;
  private emitter: EventEmitter | null;

  constructor (uri: string) {
    this.uri = uri;
    this.emitter = new EventEmitter();
  }

  dispose () {
    // this.emitter.dispose();
    this.emitter = null;
  }

  getPath (): string {
    return getPathWithNativeSeparators(this.uri);
  }

  setURI (uri: string) {
    this.uri = uri;
    this.emitter?.emit('did-rename');
  }

  onDidRename (callback: (...args: any[]) => void) {
    return this.emitter?.on('did-rename', callback);
  }

  existsSync () {
    return false;
  }
 
}
