'use strict';

import * as vscode from 'vscode';
import { TeletypeClient } from '@atom/teletype-client';
import GuestPortalBinding from './guest-portal-binding';
import HostPortalBinding from './host-portal-binding';
import * as constants from './constants';

const fetch = require('node-fetch');
const wrtc = require('wrtc');

const globalAny: any = global;
globalAny.window = {};
globalAny.window = global;
globalAny.window.fetch = fetch;
globalAny.RTCPeerConnection = wrtc.RTCPeerConnection;

globalAny.portalBindingManagerPromise = null;

// module.exports = new TeletypePackage({
// 	config: atom.config,
// 	workspace: atom.workspace,
// 	notificationManager: atom.notifications,
// 	packageManager: atom.packages,
// 	commandRegistry: atom.commands,
// 	tooltipManager: atom.tooltips,
// 	clipboard: atom.clipboard,
// 	pusherKey: atom.config.get('teletype.dev.pusherKey'),
// 	pusherOptions: {
// 	  cluster: atom.config.get('teletype.dev.pusherCluster'),
// 	  disableStats: true
// 	},
// 	baseURL: atom.config.get('teletype.dev.baseURL'),
// 	getAtomVersion: atom.getVersion.bind(atom)
//   })
  
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

	disposable = vscode.commands.registerCommand('extension.share-portal', async () => {

		vscode.window.showInformationMessage('Trying to Share Portal');
		//await TeletypePackage.sharePortal();

	});
	context.subscriptions.push(disposable);
}

async function getPortalID() {
	let portalID = await vscode.window.showInputBox({ prompt: 'Enter ID of the Portal you wish to join' });
	return portalID;
}

// async function isSignedIn () {
//     const authenticationProvider = await this.getAuthenticationProvider();
//     if (authenticationProvider) {
//       return authenticationProvider.isSignedIn();
//     } else {
//       return false;
//     }
// }

async function joinPortal(portalId: any) {
	let textEditor = vscode.window.activeTextEditor;
	let client, portal_binding;
	if (constants.AUTH_TOKEN) {
		try {
			client = new TeletypeClient({
				pusherKey: constants.PUSHER_KEY,
				pusherOptions: {
					cluster: constants.PUSHER_CLUSTER
				},
				baseURL: constants.API_URL_BASE,
			});

			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

			await client.signIn(constants.AUTH_TOKEN);
			await client.initialize();

		} catch (e) {
			console.log("Exception Error Message " + e);
		}

		portal_binding = new GuestPortalBinding(client, portalId, workspace, textEditor);
		await portal_binding.initialize();
	}
	else {
		vscode.window.showErrorMessage("GitHub Auth Token. Please provide it in the constants.ts file");
	}
}

export function deactivate() { }
