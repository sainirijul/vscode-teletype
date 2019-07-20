'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import Pusher = require('pusher-js');

// import { TeletypeClient } from "teletype-client";
// const TeletypeClient = require('teletype-client/lib/teletype-client');
// import { TeletypeClient } from "teletype-client/lib/teletype-client";
// import { web_rtc } from "electron-webrtc-patched";


import * as tc from '@atom/teletype-client';

// const TeletypeClient= require('@atom/teletype-client');
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

	// const params = {databaseURL: process.env.TEST_DATABASE_URL};
    // // Uncomment and provide credentials to test against Pusher.
    // params.pusherCredentials = {
    //   appId: '123',
    //   key: '123',
    //   secret: '123'
    // };
    // let server = await startTestServer(params);


	try {
		let client = new tc.TeletypeClient(
			{
				restGateway: {}
			},
			{
				pubSubGateway: {}
			},
			{
				connectionTimeout: 5000
			},
			{
				tetherDisconnectWindow: 100
			},
			{
				testEpoch: {}
			},
			{
				pusherKey: 'f119821248b7429bece3'
			},
			{
				pusherOptions: {
					cluster: 'mt1'
				}
			},
			{
				baseURL: 'https://api.teletype.atom.io'
			},
			{
				didCreateOrJoinPortal: {}
			});

		client.onConnectionError = (event: any) => {
			throw (newFunction("${event.message}"));
		};
		await client.initialize();

		await client.signIn(process.env.AUTH_TOKEN);

		// const portalBinding = new GuestPortalBinding({
		// 	portalId,
		// 	client,
		// 	editor: vscode.window.activeTextEditor
		// });
		// await portalBinding.initialize();


	} catch (e) {
		console.log("Error in creating teletype client " + e);
	}


	vscode.window.showInformationMessage('Joining Portal with ID' + ' ' + portalId + ' ');


	function newFunction(msg: string) {
		let event_message = msg;
		return "Connection Error: An error occurred with a teletype connection:" + event_message;
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
