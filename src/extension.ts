'use strict';

import * as vscode from 'vscode';
import { TeletypeClient } from '@atom/teletype-client';
import NotificationManager from './notification-manager';
import PortalBindingManager from './portal-binding-manager';
import { AuthenticationProvider } from './authentication-provider';
import TeletypePackage from './teletype-package';
import { findPortalId } from './portal-id-helpers';
import WorkspaceManager from './workspace-manager';
import { AccountNodeProvider, Dependency } from './ui-account-node-provider';
import { EditorNodeProvider } from './ui-editor-node-provider';
import { MemFS } from './memfs-filesystem-provider';
import { isPortalURI } from './uri-helpers';

const fetch = require('node-fetch');
const wrtc = require('wrtc');

const globalAny: any = global;
globalAny.window = {};
globalAny.window = global;
globalAny.window.fetch = fetch;
globalAny.RTCPeerConnection = wrtc.RTCPeerConnection;

globalAny.portalBindingManagerPromise = null;
globalAny.notificationManager = null;

const version = '0.0.1';

// this method is called when the extension is activated
// the extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    // atom 공용 서버와의 node 버전 차이로 인한 문제 임시로 피하기 위해.
    // (private 서버의 경우엔 적절한 node 버전을 조정하면 해당 코드가 필요 없어짐)
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const settings = vscode.workspace.getConfiguration('teletype.settings');

    const memFs = new MemFS();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('memfs', memFs, { isCaseSensitive: true }));

    const notificationManager = new NotificationManager();
    const workspaceManager = new WorkspaceManager(memFs, notificationManager);

    let pusherOptions: any = {
        cluster: settings.get('pusher.cluster'),
        encrypted: true,
        // forceTLS: false,
        // disableStats: true,
        // enabledTransports: ['ws', 'wss'],
    };

    if (settings.get('pusher.wsHost')) {
        pusherOptions.wsHost = settings.get('pusher.wsHost');
        if (settings.get('pusher.wsPort')) {
            pusherOptions.wsPort = settings.get('pusher.wsPort');
        }
        pusherOptions.forceTLS = false;
        pusherOptions.disableStats = true;
        pusherOptions.enabledTransports = ['ws', 'wss'];
    }

    // 컨텍스트 변수 세팅 (팝업 메뉴를 위해)
    vscode.commands.executeCommand('setContext', 'teletype.status.isSignin', false);
    vscode.commands.executeCommand('setContext', 'teletype.status.isShared', false);

    const teletype = new TeletypePackage({
        fs: memFs,
        baseURL: settings.get('apiHostUrl'),
        config: {},
        clipboard: vscode.env.clipboard,
        // vscode.commandRegistry, 
        // credentialCache,
        notificationManager: notificationManager,
        workspaceManager: workspaceManager,
        // packageManager, 
        // peerConnectionTimeout, 
        // pubSubGateway,
        pusherKey: settings.get('pusher.key'),
        pusherOptions: pusherOptions,

        // tetherDisconnectWindow, tooltipManager,
        workspace: (vscode.workspace.workspaceFolders) ? vscode.workspace.workspaceFolders[0] : undefined,
        authToken: settings.get('authToken')
    });
    globalAny.teletype = teletype;

    const manager = await teletype.getPortalBindingManagerAsync();
    if (!manager) {
        notificationManager.addError("Failed to connect to server.");
        return;
    }

    createViews(await teletype.getAuthenticationProviderAsync(), workspaceManager, manager);

    console.log('Great, your extension "vscode-teletype" is now active!');

    let disposable = vscode.commands.registerCommand('extension.teletype-about', async () => {
        notificationManager.addInfo(`Teletype Version ${version}`);
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.teletype-signin', async () => {
        const token = await getTeletypeTokenAsync();
        if (!token) {
            notificationManager.addError("No Token has been entered. Please try again");
        } else {
            notificationManager.addTrace('Trying to SignIn...');
            if (await (globalAny.teletype as TeletypeClient).signIn(token)) {
                vscode.commands.executeCommand('setContext', 'teletype.status.isSignin', true);
                notificationManager.addInfo("SignIn successeded.");
            } else {
                vscode.commands.executeCommand('setContext', 'teletype.status.isSignin', false);
                notificationManager.addError("SignIn failed.");
            }
        }
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.teletype-signout', async () => {
        await (globalAny.teletype as TeletypeClient).signOut();
        vscode.commands.executeCommand('setContext', 'teletype.status.isSignin', false);
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.join-portal', async () => {
        const portalIdInput = await getPortalIDAsync();
        if (!portalIdInput) {
            notificationManager.addError("No Portal ID has been entered. Please try again");
        }
        else {
            notificationManager.addTrace('Trying to Join Portal with ID' + ' ' + portalIdInput + ' ');
            await (globalAny.teletype as TeletypePackage).joinPortalAsync(portalIdInput);
        }
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.leave-portal', (item: vscode.TreeItem) => {
        notificationManager.addInfo('Leave Portal');
        (globalAny.teletype as TeletypePackage).leavePortalAsync((item as Dependency)?.value);
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.share-portal', () => {
        notificationManager.addTrace('Trying to Share Portal');
        (globalAny.teletype as TeletypePackage).sharePortalAsync();
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.close-host-portal', () => {
        notificationManager.addInfo('Close Host Portal');
        (globalAny.teletype as TeletypePackage).closeHostPortalAsync();
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.copy-portal-url', () => {
        notificationManager.addInfo('Copy Portal URL to Clipboard');
        (globalAny.teletype as TeletypePackage).copyHostPortalURIAsync();
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.show-editor', (item: any) => {
        (globalAny.teletype as TeletypePackage).showEditor(item);
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.follow-portal', (item: any) => {
        notificationManager.addInfo('Follow portal');
        (globalAny.teletype as TeletypePackage).followPortal(item);
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.unfollow-portal', (item: any) => {
        notificationManager.addInfo('Unfollow portal');
        (globalAny.teletype as TeletypePackage).unfollowPortal(item);
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.test', () => {
        notificationManager.addInfo('test');
        (globalAny.teletype as TeletypePackage).test();
    });
    context.subscriptions.push(disposable);

    await (globalAny.teletype as TeletypePackage).activateAsync();
}

async function getPortalIDAsync(): Promise<string | undefined | null> {
    let text = await vscode.env.clipboard.readText();
    if (!isPortalURI(text)) {
        text = '';
    }
    let url = await vscode.window.showInputBox({ prompt: 'Enter ID of the Portal you wish to join', value: text });
    if (url) {
        let portalID = findPortalId(url);
        return portalID;
    }

    return undefined;
}

async function getTeletypeTokenAsync(): Promise<string | undefined> {
    const token = await vscode.window.showInputBox({ prompt: 'Enter Teletype Authentication Token' });
    return token;
}

function createViews(authenticationProvider: AuthenticationProvider, workspaceManager: WorkspaceManager, portalBindingManager: PortalBindingManager) {
    const nodeDependenciesProvider = new AccountNodeProvider(authenticationProvider, portalBindingManager);
    vscode.window.registerTreeDataProvider('teletype.accountsView', nodeDependenciesProvider);

    const nodeDependenciesProvider1 = new EditorNodeProvider(portalBindingManager, workspaceManager);
    vscode.window.registerTreeDataProvider('teletype.targetDocumentView', nodeDependenciesProvider1);
}

export function deactivate() { }
