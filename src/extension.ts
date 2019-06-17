// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const path = require('path');
const globalAny : any = global;

const fetch = require('node-fetch');
const wrtc = require('electron-webrtc')()

import {TeletypeClient} from '@atom/teletype-client';



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
		console.log('Congratulations, your extension "vscode-teletype" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.join-portal', async () => {
		// The code you place here will be executed every time your command is executed
		const portalId = await vscode.window.showInputBox({prompt: 'Enter ID of the Portal you wish to join'})
		await joinPortal(portalId);
		// Display a message box to the user
		vscode.window.showInformationMessage('Joining Portal with ID' + ' ' + portalId);
	});

	context.subscriptions.push(disposable);
}

async function joinPortal (portalId:any) {

	const client = new TeletypeClient({
		baseURL: {},
		pubSubGateway: {}
	  })
	  await client.initialize()
	  await client.signIn('some-token')

	client.onConnectionError = (event:any) => {
		throw(`Connection Error: An error occurred with a teletype connection: ${event.message}`);
	}

	// await client.initialize();

	// await client.signIn(process.env.AUTH_TOKEN)

	const portalBinding = new TeletypeClient.GuestPortalBinding({
		portalId,
		client,
		editor: vscode.window.activeTextEditor
	});
	await portalBinding.initialize()
}

// this method is called when your extension is deactivated
export function deactivate() {}
