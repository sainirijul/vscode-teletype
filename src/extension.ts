'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const fetch = require('node-fetch');

const constants = require('./constants');
// const adapter = require('electron-webrtc')();
// const adapter = require('electron-webrtc')({ headless: true });
const globalAny: any = global;

// const { RTCSessionDescription } = require('wrtc');
globalAny.window = {};
globalAny.window = global;
globalAny.window.fetch = fetch;
// globalAny.events = require('events').EventEmitter;
// globalAny.RTCPeerConnection = require('electron-webrtc')().RTCPeerConnection;
// globalAny.BlobBuilder = require("BlobBuilder");


// globalAny.BinaryPack = require("binary-pack");
// globalAny.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const wrtc = require('wrtc');


globalAny.RTCPeerConnection = wrtc.RTCPeerConnection;
globalAny.RTCSessionDescription = wrtc.RTCSessionDescription;
globalAny.RTCIceCandidate = wrtc.RTCIceCandidate;

// globalAny.WebSocket = require('ws');

// globalAny.RTCPeerConnection = rtc.RTCPeerConnection;
// globalAny.RTCSessionDescription = rtc.RTCSessionDescription;
// globalAny.RTCIceCandidate = rtc.RTCIceCandidate;

// const WebSocket = require('ws');
// const localConnection = new wrtc.RTCPeerConnection();

// globalAny.RTCIceCandidate = wrtc.RTCIceCandidate;
// globalAny.RTCPeerConnection = wrtc.RTCPeerConnection;

// globalAny.RTCSessionDescription = wrtc.RTCSessionDescription;
// import Pusher = require('pusher-js');

// import { TeletypeClient } from "teletype-client";
// import TeletypeClient = require('@atom/teletype-client/lib/teletype-client');
// import { TeletypeClient } from "teletype-client/lib/teletype-client";
// import { web_rtc } from "electron-webrtc-patched";
import { RestGateway, PusherPubSubGateway, Portal, TeletypeClient } from '@atom/teletype-client';
// import * as tc from '@atom/teletype-client';
import GuestPortalBinding from './GuestPortalBinding';


// import { TeletypeClient } from '@atom/teletype-client';
// const teletype = require('teletype')



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Great, your extension "vscode-teletype" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.join-portal', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		const portalId = await vscode.window.showInputBox({ prompt: 'Enter ID of the Portal you wish to join' });
		await joinPortal(portalId);

	});

	context.subscriptions.push(disposable);
}



async function joinPortal(portalId: any) {

	if (!portalId) {
		vscode.window.showErrorMessage('This doesn\'t look like a valid portal identifier. Please ask your host to provide you with their current portal URL and try again.');
		return;
	}
	else {
		try {

			const gateway = new RestGateway({
				baseURL: 'https://api.teletype.atom.io',
				oauthToken: 'b35cfaa6349f7cd26a2071ae70153b9faf89890f'
			});

			const client = new TeletypeClient({
				restGateway: gateway,
				pubSubGateway: new PusherPubSubGateway({key: constants.PUSHER_KEY, options: {cluster: constants.PUSHER_CLUSTER}}),
				connectionTimeout: 5000,
				tetherDisconnectWindow: 1000,
				testEpoch: 10,
				// activePubSubGateway: 'socketcluster',
				pusherKey: constants.PUSHER_KEY,
				pusherOptions: {
					cluster: constants.PUSHER_CLUSTER,
					disableStats: true
				},
				baseURL: constants.API_URL_BASE,
				didCreateOrJoinPortal: {},
			}
			);

			await client.initialize();

			// let result = await gateway.get('/identity');

			await client.signIn(constants.AUTH_TOKEN);

			let textEditor = vscode.window.activeTextEditor;

			const portalBinding = new GuestPortalBinding({ client, portalId, editor: textEditor });
			await portalBinding.initialize();

			vscode.window.showInformationMessage('Joining Portal with ID' + ' ' + portalId + ' ');

		} catch (e) {
			console.log("Exception Error Message " + e);
		}
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
