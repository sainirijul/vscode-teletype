import * as vscode from 'vscode';
import { TeletypeClient, Errors, FollowState, Portal, EditorProxy, BufferProxy } from '@atom/teletype-client';
// import Portal from '@atom/teletype-client/lib/portal';
// import EditorProxy from '@atom/teletype-client/lib/editor-proxy';
// import BufferProxy from '@atom/teletype-client/lib/buffer-proxy';

import BufferBinding from './BufferBinding';
import EditorBinding from './EditorBinding';

import {NotImplementedError} from './error';

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export default class GuestPortalBinding {
	public client: TeletypeClient;
	private readonly portalId: string;
	private readonly editor: vscode.TextEditor;
    private portal!: Portal;
	private lastEditorProxyChangePromise: Promise<void>;
	private editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;
	private bufferBindingsByBufferProxy: Map<BufferProxy, BufferBinding>;
	private bufferBindingsByBuffer: Map<vscode.TextDocument, BufferBinding>;
	private editorBindingsByEditor: Map<vscode.TextEditor, EditorBinding>;
	private editorProxiesByEditor: WeakMap<vscode.TextEditor, EditorProxy>;
	
	constructor({ client, portalId, editor }: { client: any; portalId: any; editor: any; }) {
		console.log("Reaching inside constructor" + client + "prtalid" + portalId + "editor" + editor);
		this.client = client;
		this.portalId = portalId;
		this.editor = editor;
		this.lastEditorProxyChangePromise = Promise.resolve();
		this.editorBindingsByEditorProxy = new Map();
		this.bufferBindingsByBufferProxy = new Map();
		this.bufferBindingsByBuffer = new Map();
		this.editorBindingsByEditor = new Map();
		this.editorProxiesByEditor = new WeakMap();
	}

	async initialize() {
		try {
			 this.portal = await this.client.joinPortal(this.portalId);
			await this.portal.setDelegate(this);

			this.registerWorkspaceEvents();
		} catch (error) {
			let message, description, shortMessage;
			if (error instanceof Errors.PortalNotFoundError) {
				message = 'Portal not found';
				description = 'No portal exists with that ID. Please check again the portal ID you entered.';
				shortMessage = `${message}`;
			} else {
				message = 'Failed to join portal';
				description =
					`Attempting to join portal ${this.portalId} failed with error: ${error.message}\n\n` +
					'Please wait for sometime and then try again.';
				shortMessage = `${message}: ${error.message}`;
			}
			vscode.window.showErrorMessage(shortMessage);
			console.error(error);
			console.error(`${message}: ${description}`);
		}
	}

	siteDidJoin(siteId: any) {
		if(this.portal){
		const { login: hostLogin } = this.portal.getSiteIdentity(1);
		const { login: siteLogin } = this.portal.getSiteIdentity(siteId);
		vscode.window.showInformationMessage(`@${siteLogin} has joined @${hostLogin}'s portal`);
		}
		else{
			vscode.window.showErrorMessage("Portal is undefined");
		}
	}

	siteDidLeave(siteId: any) {
		if(this.portal){
		const { login: hostLogin } = this.portal.getSiteIdentity(1);
		const { login: siteLogin } = this.portal.getSiteIdentity(siteId);
		vscode.window.showInformationMessage(`@${siteLogin} has left @${hostLogin}'s portal`);
		}
		else{
			vscode.window.showErrorMessage("Portal is undefined");
		}
	}

	addEditorProxy(editorProxy: any) {
		// throw('Not implemented yet')
	}

	removeEditorProxy(editorProxy: any) {
		console.error('removeEditorProxy');
		throw NotImplementedError;
	}

	updateActivePositions(positionsBySiteId: any) {
		// throw NotImplementedError
	}

	hostDidClosePortal() {
		vscode.window.showInformationMessage('Portal closed: Your host stopped sharing their editor.');
	}

	hostDidLoseConnection() {
		vscode.window.showInformationMessage('Portal closed');
	}

	updateTether(followState: any, editorProxy: any, position: any) {
		if (editorProxy) {
			this.lastEditorProxyChangePromise = this.lastEditorProxyChangePromise.then(() =>
				this._updateTether(followState, editorProxy, position)
			);
		}

		return this.lastEditorProxyChangePromise;
	}

	dispose() {
		console.error('dispose');
		// throw NotImplementedError

		// TODO: unregisterTextDocumentChangeEvent
	}

	private async _updateTether(followState: any, editorProxy: any, position: any) {
		if (followState === FollowState.RETRACTED) {
			const editor = await this.findOrCreateEditorForEditorProxy(editorProxy);
			// await this.toggleEmptyPortalPaneItem()
		} else {
			// FIXME: WTF, upstream bug
			this.editorBindingsByEditorProxy.forEach((b) => b.updateTether(followState, undefined));
		}

		const editorBinding = this.editorBindingsByEditorProxy.get(editorProxy);
		if (editorBinding && position) {
			editorBinding.updateTether(followState, position);
		}
	}

	private async findOrCreateEditorForEditorProxy(editorProxy: any): Promise<vscode.TextEditor> {
		let editor: vscode.TextEditor;
		let editorBinding = this.editorBindingsByEditorProxy.get(editorProxy);
		if (editorBinding) {
			editor = editorBinding.editor;
		} else {
			const { bufferProxy } = editorProxy;
			const buffer = await this.findOrCreateBufferForBufferProxy(bufferProxy);
			const bufferBinding = this.bufferBindingsByBufferProxy.get(bufferProxy);

			// thinks reload
			await vscode.workspace.openTextDocument(buffer.uri);

			console.log('find buffer, now show it');
			editor = await vscode.window.showTextDocument(buffer);
			editorBinding = new EditorBinding({
				editor},
				{portal: this.portal},
				{isHost: false
			});
			// keep open editor
			await vscode.commands.executeCommand('workbench.action.keepEditor');
			// bind editor to bufferBinding lately
			// since we need vscode.TextEditor instance to apply edit operations
			if (bufferBinding) {
				bufferBinding.setEditor(editor);
			}

			editorBinding.setEditorProxy(editorProxy);
			editorProxy.setDelegate(editorBinding);

			this.editorBindingsByEditorProxy.set(editorProxy, editorBinding);
			this.editorProxiesByEditor.set(editor, editorProxy);
			this.editorBindingsByEditor.set(editor, editorBinding);

			editorBinding.onDidDispose(() => {
				this.editorProxiesByEditor.delete(editor);
				this.editorBindingsByEditorProxy.delete(editorProxy);
			});

			// this.sitePositionsController.addEditorBinding(editorBinding)
		}
		return editor;
	}

	private async findOrCreateBufferForBufferProxy(bufferProxy: any): Promise<vscode.TextDocument> {
		let buffer: vscode.TextDocument;
		let bufferBinding = this.bufferBindingsByBufferProxy.get(bufferProxy);
		if (bufferBinding) {
			buffer = bufferBinding.buffer;
		} else {
			// TODO: cross platform
			const bufferURI = vscode.Uri.parse(`file://${path.join(os.tmpdir(), `/${this.portalId}/`, bufferProxy.uri)}`);

			/* prepare file */
			await require('mkdirp-promise')(path.dirname(bufferURI.fsPath));
			fs.writeFileSync(bufferURI.fsPath, '');

			buffer = await vscode.workspace.openTextDocument(bufferURI);

			bufferBinding = new BufferBinding({
				buffer
			},
				{ isHost: false },
				{
					didDispose: () => this.bufferBindingsByBufferProxy.delete(bufferProxy)
				});

			bufferBinding.setBufferProxy(bufferProxy);
			bufferProxy.setDelegate(bufferBinding);

			this.bufferBindingsByBuffer.set(buffer, bufferBinding);
			this.bufferBindingsByBufferProxy.set(bufferProxy, bufferBinding);
		}
		return buffer;
	}

	private registerWorkspaceEvents() {
		vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this));
		vscode.workspace.onWillSaveTextDocument(this.saveDocument.bind(this));
		vscode.window.onDidChangeTextEditorSelection(this.triggerSelectionChanges.bind(this));
	}

	private onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
		const bufferBinding = this.bufferBindingsByBuffer.get(event.document);
		if (bufferBinding) {
			bufferBinding.onDidChangeBuffer(event.contentChanges);
		}
	}

	private saveDocument(event: vscode.TextDocumentWillSaveEvent) {
		const bufferBinding = this.bufferBindingsByBuffer.get(event.document);
		if (bufferBinding) {
			event.waitUntil(bufferBinding.requestSavePromise());
		}
	}

	private triggerSelectionChanges(event: vscode.TextEditorSelectionChangeEvent) {
		const editorBinding = this.editorBindingsByEditor.get(event.textEditor);
		if (editorBinding) {
			editorBinding.updateSelections(event.selections);
		}
	}

}
