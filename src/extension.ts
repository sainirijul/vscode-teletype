'use strict';

import * as vscode from 'vscode';
import { TeletypeClient } from '@atom/teletype-client';
import GuestPortalBinding from './guest-portal-binding';
import HostPortalBinding from './host-portal-binding';
import * as constants from './constants';
import NotificationManager from './notification-manager';
import PortalBindingManager from './portal-binding-manager';
import { AuthenticationProvider } from './authentication-provider';
import TeletypePackage from './teletype-package';

const fetch = require('node-fetch');
const wrtc = require('wrtc');

const globalAny: any = global;
globalAny.window = {};
globalAny.window = global;
globalAny.window.fetch = fetch;
globalAny.RTCPeerConnection = wrtc.RTCPeerConnection;

globalAny.portalBindingManagerPromise = null;
globalAny.notificationManager = null;

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
	// atom 공용 서버와의 node 버전 차이로 인한 문제 임시로 피하기 위해
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	globalAny.teletype = new TeletypePackage({
		baseURL: constants.API_URL_BASE,
		config: {}, 
		// vscode.clipboard, 
		// vscode.commandRegistry, 
		// credentialCache,
		// getAtomVersion,
		notificationManager: new NotificationManager(), 
		// packageManager, 
		// peerConnectionTimeout, 
		// pubSubGateway,
		pusherKey: constants.PUSHER_KEY, 
		pusherOptions: { 
			cluster: constants.PUSHER_CLUSTER,
			disableStats: true
		},
		// tetherDisconnectWindow, tooltipManager,
		// workspace  
	});

	console.log('Great, your extension "vscode-teletype" is now active!');
	let disposable = vscode.commands.registerCommand('extension.join-portal', async () => {

		let portalIdInput = await getPortalID();
		if (!portalIdInput) {
			vscode.window.showInformationMessage("No Portal ID has been entered. Please try again");
		}
		else {
			vscode.window.showInformationMessage('Trying to Join Portal with ID' + ' ' + portalIdInput + ' ');
			await globalAny.teletype.joinPortal(portalIdInput);
		}

	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('extension.share-portal', async () => {

		vscode.window.showInformationMessage('Trying to Share Portal');
		await globalAny.teletype.sharePortal();

	});
	context.subscriptions.push(disposable);
	  
    globalAny.teletype.activate();
}

async function getPortalID() {
	let portalID = await vscode.window.showInputBox({ prompt: 'Enter ID of the Portal you wish to join' });
	return portalID;
}

export function deactivate() { }
