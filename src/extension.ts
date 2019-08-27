'use strict';

import * as vscode from 'vscode';
import { TeletypeClient } from '@atom/teletype-client';
import GuestPortalBinding from './GuestPortalBinding';
import FakeBufferDelegate from './FakeBufferDelegate';
const FakeEditorDelegate = require('./FakeEditorDelegate');


const fetch = require('node-fetch');
const constants = require('./constants');
const globalAny: any = global;
const wrtc = require('wrtc');

globalAny.window = {};
globalAny.window = global;
globalAny.window.fetch = fetch;
globalAny.RTCPeerConnection = wrtc.RTCPeerConnection;

// this method is called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Great, your extension "vscode-teletype" is now active!');
	let disposable = vscode.commands.registerCommand('extension.join-portal', async () => {

		let portalIdInput = await getPortalID();
		if (!portalIdInput) {
			vscode.window.showInformationMessage("No Portal ID has been entered. Please try again");
		}
		else {
			vscode.window.showInformationMessage('Trying to Join Portal with ID' + ' ' + portalIdInput + ' ');
			await joinPortal(portalIdInput);
		}

	});
	context.subscriptions.push(disposable);
}

async function getPortalID() {
	let portalID = await vscode.window.showInputBox({ prompt: 'Enter ID of the Portal you wish to join' });
	return portalID;
}


async function joinPortal(portalId: any) {
	let textEditor = vscode.window.activeTextEditor;
	let client, guest_portal_binding, guestEditorProxy, guestBufferProxy, guestBufferDelegate;

	try {
		client = new TeletypeClient({
			// restGateway: gateway,
			// pubSubGateway: new PusherPubSubGateway({key: constants.PUSHER_KEY, options: {cluster: constants.PUSHER_CLUSTER}}),
			// connectionTimeout: 50000,
			// tetherDisconnectWindow: 1000,
			// testEpoch: 100,
			// activePubSubGateway: 'socketcluster',
			pusherKey: constants.PUSHER_KEY,
			pusherOptions: {
				cluster: constants.PUSHER_CLUSTER
			},
			baseURL: constants.API_URL_BASE,
			// didCreateOrJoinPortal: {},
		}
		);

		await client.initialize();
		await client.signIn(constants.AUTH_TOKEN);

	} catch (e) {
		console.log("Exception Error Message " + e);
	}

	guest_portal_binding = new GuestPortalBinding({ client: client, portalId: portalId, editor: textEditor });
	await guest_portal_binding.initialize();

	console.log("activebufferproxyuri : " + guest_portal_binding.getTetherBufferProxyURI());

	guestEditorProxy = guest_portal_binding.getTetherEditorProxy();
	guestBufferProxy = guestEditorProxy.bufferProxy;
	guestBufferDelegate = new FakeBufferDelegate({ text: {}, didSetText: {} });
	guestBufferProxy.setDelegate(guestBufferDelegate);
	guestBufferProxy.setTextInRange(...guestBufferDelegate.insert({ row: 0, column: 0 }, 'hello people\n'));

}


// }

// this method is called when your extension is deactivated
export function deactivate() { }
