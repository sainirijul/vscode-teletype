import * as vscode from 'vscode';
import * as converter from './teletype-converter';
import * as fs from 'fs';
import * as path from 'path';
import {EventEmitter} from 'events';
// const {Emitter, Range, CompositeDisposable, TextBuffer} = require('atom')
import { Position, Range, TextUdpate } from './teletype-types';
import { BufferProxy, Checkpoint, IBufferDelegate } from '@atom/teletype-client';
import getPathWithNativeSeparators from './get-path-with-native-separators';

function doNothing () {}

export default class BufferBinding implements IBufferDelegate {
  // private uri: string;
	public buffer!: vscode.TextDocument;
	private editor!: vscode.TextEditor;
	private readonly isHost: boolean;
  emitDidDispose: Function;
  private pendingChanges: vscode.TextDocumentContentChangeEvent[];
  disposed: boolean;
  disableHistory: boolean;
  // subscriptions: Disposable;
  public bufferProxy!: BufferProxy;
  bufferDestroySubscription: any;
  remoteFile: any;
  isUpdating: boolean = false;

	constructor(buffer: vscode.TextDocument, editor: vscode.TextEditor, isHost: boolean, didDispose: Function = doNothing) {
    this.buffer = buffer;
    this.editor = editor;
    this.isHost = isHost;
    this.emitDidDispose = didDispose || doNothing;
    this.pendingChanges = [];
    this.disposed = false;
    this.disableHistory = false;
    if (isHost) {
      // this.subscriptions.add(buffer.onDidChangePath(this.relayURIChange.bind(this)));
    }
  }

  // @override
  dispose () {
    if (this.disposed) { return; }

    this.disposed = true;
    // this.subscriptions.dispose();
    if (this.buffer) {
      // this.buffer.restoreDefaultHistoryProvider(this.bufferProxy.getHistory(this.buffer.maxUndoEntries));
      // this.buffer = undefined;
    }
    if (this.bufferDestroySubscription) { this.bufferDestroySubscription.dispose(); }
    if (this.remoteFile) { this.remoteFile.dispose(); }
    this.emitDidDispose();
  }

  setBufferProxy (bufferProxy: BufferProxy) {
    this.bufferProxy = bufferProxy;
    // // this.buffer?.setHistoryProvider(this);
    while (this.pendingChanges.length > 0) {
      this.pushChange(this.pendingChanges.shift());
    }
    if (!this.isHost) {
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

  // @override
  setText (text: string) {
    // this.disableHistory = true;
    // this.buffer?.setTextInRange(this.buffer?.getRange(), text);
    // this.disableHistory = false;
		fs.writeFileSync(this.buffer.uri.fsPath, text);
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

  // @override
  updateText (textUpdates: any[]) {
		return this.editor.edit(builder => {
      if (textUpdates) {
        this.isUpdating = true;
        for (let i = textUpdates.length - 1; i >= 0; i--) {
          const textUpdate = textUpdates[i];
          this.disableHistory = true;
          builder.replace(this.createRange(textUpdate.oldStart, textUpdate.oldEnd), textUpdate.newText);
          this.disableHistory = false;
        }
        // this.isUpdating = false;
      }
		}, { undoStopBefore: false, undoStopAfter: true });
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
  save () {
    if (this.buffer?.uri) { return this.buffer.save(); }
  }

  relayURIChange () {
    this.bufferProxy.setURI(this.getBufferProxyURI());
  }

  // @override
  didChangeURI (uri: string) {
    if (this.remoteFile) { this.remoteFile.setURI(uri); }
  }

  getBufferProxyURI () {
    if (!this.buffer.uri.fsPath) { return 'untitled'; }
    // const [projectPath, relativePath] = atom.workspace.project.relativizePath(this.buffer.uri.fsPath);
    // if (projectPath) {
    //   const projectName = path.basename(projectPath);
    //   return path.join(projectName, relativePath);
    // } else {
    //   return relativePath;
    // }
    return this.buffer.uri.fsPath;
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

	onDidChangeBuffer(changes: ReadonlyArray<vscode.TextDocumentContentChangeEvent>) {
		this.bufferProxy.onDidChangeBuffer(changes.map(change => {
    // this.bufferProxy.onDidUpdateText(changes.map(change => {
		 	const { start, end } = changes[0].range;

			return {
				oldStart: { row: start.line, column: start.character },
				oldEnd: { row: end.line, column: end.character },
				newText: change.text
			};
		}));
	}

	changeBuffer(changes: ReadonlyArray<vscode.TextDocumentContentChangeEvent>) {
		//this.bufferProxy.onDidChangeBuffer(changes.map(change => {
    // this.bufferProxy.onDidUpdateText(changes.map(change => {
		 	const { start, end } = changes[0].range;

		// 	return {
		// 		oldStart: { row: start.line, column: start.character },
		// 		oldEnd: { row: end.line, column: end.character },
		// 		newText: change.text
		// 	};
		// }));
    this.bufferProxy.setTextInRange(
      { row: start.line, column: start.character },
      { row: end.line, column: end.character },
      changes[0].text
    );
	}

  //requestSavePromise(): Promise<vscode.TextEditor[]> {
  requestSavePromise(): Promise<void> {
		return new Promise(() => {
			this.bufferProxy.requestSave();
		});
  }
}

class RemoteFile {
  uri: vscode.Uri;
  emitter: EventEmitter | null;

  constructor (uri: vscode.Uri) {
    this.uri = uri;
    this.emitter = new EventEmitter();
  }

  dispose () {
    // this.emitter.dispose();
    this.emitter = null;
  }

  getPath (): string {
    return getPathWithNativeSeparators(this.uri.path);
  }

  setURI (uri: vscode.Uri) {
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
