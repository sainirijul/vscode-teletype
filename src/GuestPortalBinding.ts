const assert = require('assert');
import * as vscode from 'vscode';
import { TeletypeClient, Errors, Portal } from '@atom/teletype-client';


export default class GuestPortalBinding {
	public client: TeletypeClient;
	private readonly portalId: string;
	private readonly editor: vscode.TextEditor;
	private portal!: Portal;
	private onUpdateTether: any;
	private tetherState: any;
	private tetherEditorProxy: any;
	private tetherEditorProxyChangeCount: any;
	private tetherPosition: any;
	private disposed!: boolean;
	private hostClosedPortal!: boolean;
	private hostLostConnection!: boolean;
	private onAddEditorProxy: any;
	private editorProxies: any;
	private onRemoveEditorProxy: any;
	private joinEvents: any;
	private leaveEvents: any;


	constructor({ client, portalId, editor }: { client: any; portalId: any; editor: any; }) {
		this.client = client;
		this.portalId = portalId;
		this.editor = editor;
	}

	async initialize() {
		try {
			this.portal = await this.client.joinPortal(this.portalId);
			await this.portal.setDelegate(this);
			// this.registerWorkspaceEvents();
		} catch (error) {
			let message, description, shortMessage;
			if (error instanceof Errors.PortalNotFoundError) {
				message = 'Portal not found';
				description = 'No portal exists with that ID. Please check again the portal ID you entered.';
				shortMessage = `${message}`;
			} else {
				message = 'Failed to join portal';
				description =
					`The attempt to join portal with portal ID ${this.portalId} failed with error: ${error.message}\n\n`;
				shortMessage = `${message}`;
			}
			vscode.window.showErrorMessage(shortMessage);
			console.error(error);
			console.error(`${message}: ${description}`);
		}
	}

	dispose() {
		this.disposed = true;
	}

	isDisposed() {
		return this.disposed;
	}

	hostDidClosePortal() {
		this.hostClosedPortal = true;
	}

	hasHostClosedPortal() {
		return this.hostClosedPortal;
	}

	hostDidLoseConnection() {
		this.hostLostConnection = true;
	}

	hasHostLostConnection() {
		return this.hostLostConnection;
	}

	addEditorProxy(editorProxy: any) {
		if(editorProxy && this.editorProxies){
		if (typeof this.onAddEditorProxy === "function") {
			this.onAddEditorProxy(editorProxy);
		}
		console.log("addEditorProxy: " + editorProxy.bufferProxy.uri);
		if (!this.editorProxies.has(editorProxy)) {
			console.log('Cannot add the same editor proxy multiple times remove/add again');
			this.editorProxies.delete(editorProxy);
		}

		this.editorProxies.add(editorProxy);
	}
}

	removeEditorProxy(editorProxy: any) {
		if (typeof this.onRemoveEditorProxy === "function") {
			this.onRemoveEditorProxy(editorProxy);
		}
		assert(this.editorProxies.has(editorProxy), 'Can only remove editor proxies that had previously been added');
		this.editorProxies.delete(editorProxy);
		if (this.tetherEditorProxy === editorProxy) {
			this.tetherEditorProxy = null;
			this.tetherEditorProxyChangeCount++;
		}
	}

	editorProxyForURI(uri: any) {
		return Array.from(this.editorProxies).find((e: any) => e.bufferProxy.uri === uri);
	}

	getTetherEditorProxy() {
		return this.tetherEditorProxy;
	}

	getTetherBufferProxyURI() {
		return (this.tetherEditorProxy) ? this.tetherEditorProxy.bufferProxy.uri : null;
	}

	getEditorProxies() {
		return Array.from(this.editorProxies);
	}

	updateTether(state: any, editorProxy: any, position: any) {
		if(editorProxy){
		if (typeof this.onUpdateTether === "function") {
			this.onUpdateTether(state, editorProxy, position);
		}
		console.log("updateTether: " + editorProxy.bufferProxy.uri);
		this.addEditorProxy(editorProxy);
		this.tetherState = state;
		if (editorProxy !== this.tetherEditorProxy) {
			this.tetherEditorProxy = editorProxy;
			this.tetherEditorProxyChangeCount++;
		}
		this.tetherPosition = position;
	}
	}


	getTetherState() {
		return this.tetherState;
	}

	getTetherPosition() {
		return this.tetherPosition;
	}

	updateActivePositions(positionsBySiteId: any) {
		this.doUpdateActivePositions(positionsBySiteId);
	}
	doUpdateActivePositions(positionsBySiteId: any) {
		throw new Error("Method not implemented.");
	}

	siteDidJoin(siteId: any) {
		this.joinEvents.push(siteId);
	}

	siteDidLeave(siteId: any) {
		this.leaveEvents.push(siteId);
	}

	didChangeEditorProxies() { }
}
