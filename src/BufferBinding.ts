import * as fs from 'fs';
import * as vscode from 'vscode';

import {BufferProxy} from '@atom/teletype-client';

import { Position, TextUdpate } from './teletype_types';

// Buffer is TextDocument in vscode
export default class BufferBinding {
	public readonly buffer : vscode.TextDocument;
	// private readonly editor : vscode.TextEditor;
	private editor : vscode.TextEditor | undefined;
	private readonly isHost : boolean;
	private bufferProxy : BufferProxy | undefined;
	public didDispose : Function;
	private updatingText : boolean;
	private updateTextSync : Function | undefined;

	constructor (buffer:any, isHost:any, didDispose:any) {
		this.buffer = buffer;
		this.isHost = isHost;
		this.didDispose = didDispose;
		this.updatingText = false;
	}

	dispose () {
		// TODO:
	}

	setBufferProxy (bufferProxy : BufferProxy) {
		this.bufferProxy = bufferProxy;
	}

	/**
	 * Set text value of the buffer
	 * Will only be called once after `bufferProxy.setDelegate(bufferBinding)`
	 */
	setText (text : string) {
		fs.writeFileSync(this.buffer.uri.fsPath, text);
	}

	setEditor (editor : vscode.TextEditor) {
		this.editor = editor;
	}

	updateText (textUpdates: TextUdpate[]) {
		if(this.editor) {
		return this.editor.edit(builder => {
			for (let i = textUpdates.length - 1; i >= 0; i--) {
				const {oldStart, oldEnd, newText} = textUpdates[i];
				builder.replace(this.createRange(oldStart, oldEnd), newText);
			}
		}, { undoStopBefore: false, undoStopAfter: true });
		}
	}

	private createRange (start : Position, end : Position) : vscode.Range {
		return new vscode.Range(
			new vscode.Position(start.row, start.column),
			new vscode.Position(end.row, end.column)
		);
	}

	onDidChangeBuffer (changes : vscode.TextDocumentContentChangeEvent[]) {
		if(this.bufferProxy) {
		this.bufferProxy.onDidUpdateText(changes.map(change => {
			const { start, end } = change.range;

			return {
				oldStart: { row: start.line, column: start.character },
				oldEnd: { row: end.line, column: end.character },
				newText: change.text
			};
		}));
		}
	}

	requestSavePromise () {
		// never ending promise? 
		// Guest cannot save document
		return new Promise(() => {
			if(this.bufferProxy) {
			this.bufferProxy.requestSave();
			}
		});
	}

	save () {
		// NOTE: guest will not recieve save event
		this.buffer.save();
	}
}
