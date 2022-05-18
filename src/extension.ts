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
import { findPortalId } from './portal-id-helpers';
import WorkspaceManager from './workspace-manager';
import AccountManager from './account-manager';
import { AccountNodeProvider } from './ui-account-node-provider';
import { TeleteypStatusProvider } from './ui-status-provider';
import { EditorNodeProvider } from './ui-editor-node-provider';

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
export async function activate(context: vscode.ExtensionContext) {
	// atom 공용 서버와의 node 버전 차이로 인한 문제 임시로 피하기 위해.
	// (private 서버의 경우엔 적절한 node 버전을 조정하면 해당 코드가 필요 없어짐)
	// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

	const notificationManager = new NotificationManager();
	const workspaceManager = new WorkspaceManager(notificationManager);
	const accountManager = new AccountManager(notificationManager);

	globalAny.teletype = new TeletypePackage({
		baseURL: constants.API_URL_BASE,
		config: {}, 
		// vscode.clipboard, 
		// vscode.commandRegistry, 
		// credentialCache,
		// getAtomVersion,
		notificationManager: notificationManager, 
		workspaceManager: workspaceManager,
		accountManager: accountManager,
		// packageManager, 
		// peerConnectionTimeout, 
		// pubSubGateway,
		pusherKey: constants.PUSHER_KEY, 
		pusherOptions: { 
			cluster: constants.PUSHER_CLUSTER,
			encrypted: true,
			// wsHost: '127.0.0.1',
			// wsPort: 6001,
			// forceTLS: false,
			// disableStats: true,
			// enabledTransports: ['ws', 'wss'],
		},
		
		// tetherDisconnectWindow, tooltipManager,
		workspace: (vscode.workspace.workspaceFolders)? vscode.workspace.workspaceFolders[0] : undefined
	});

	const manager = await globalAny.teletype.getPortalBindingManager();
	createViews(workspaceManager, manager);

	console.log('Great, your extension "vscode-teletype" is now active!');

	let disposable = vscode.commands.registerCommand('extension.teletype-signin', async () => {

		let token = await getTeletypeToken();
		if (!token) {
			vscode.window.showInformationMessage("No Toekn has been entered. Please try again");
		} else {
			vscode.window.showInformationMessage('Trying to SignIn...');
			if (await globalAny.teletype.signIn(token)) {
				vscode.window.showInformationMessage("SignIn successeded.");
			} else {
				vscode.window.showErrorMessage("SignIn failed.");
			}
		}

	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('extension.teletype-signout', async () => {

		await globalAny.teletype.signOut();

	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('extension.join-portal', async () => {

		let portalIdInput = await getPortalID();
		if (!portalIdInput) {
			vscode.window.showInformationMessage("No Portal ID has been entered. Please try again");
		}
		else {
			vscode.window.showInformationMessage('Trying to Join Portal with ID' + ' ' + portalIdInput + ' ');
			await (globalAny.teletype as TeletypePackage).joinPortal(portalIdInput);
		}

	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('extension.leave-portal', async () => {

		vscode.window.showInformationMessage('Leave Portal');
		await (globalAny.teletype as TeletypePackage).leavePortal();

	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('extension.share-portal', async () => {

		vscode.window.showInformationMessage('Trying to Share Portal');
		await (globalAny.teletype as TeletypePackage).sharePortal();

	});
	context.subscriptions.push(disposable);
	  
	disposable = vscode.commands.registerCommand('extension.close-host-portal', async () => {

		vscode.window.showInformationMessage('Cose Host Portal');
		await (globalAny.teletype as TeletypePackage).closeHostPortal();

	});
	context.subscriptions.push(disposable);

	(globalAny.teletype as TeletypePackage).activate();
}

async function getPortalID() {
	let url = await vscode.window.showInputBox({ prompt: 'Enter ID of the Portal you wish to join' });
	if (url) {
		let portalID = findPortalId(url);
		return portalID;
	}

	return undefined;
}

async function getTeletypeToken() {
	let token = await vscode.window.showInputBox({ prompt: 'Enter Teletype Authentication Token' });
	return token;
}

function createViews(workspaceManager: WorkspaceManager, portalBindingManager: PortalBindingManager) {
	const nodeDependenciesProvider0 = new TeleteypStatusProvider(undefined, portalBindingManager);
	vscode.window.registerWebviewViewProvider('teletype.statusView', nodeDependenciesProvider0);

	const nodeDependenciesProvider1 = new EditorNodeProvider(workspaceManager);
	vscode.window.registerTreeDataProvider('teletype.targetDocumentView', nodeDependenciesProvider1);

	const nodeDependenciesProvider = new AccountNodeProvider('D:/__Work2/teletype');
	vscode.window.registerTreeDataProvider('teletype.accountsView', nodeDependenciesProvider);
}

export function deactivate() { }
