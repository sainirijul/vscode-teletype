import * as vscode from 'vscode';
//import {EventEmitter} from 'events';
//import {CompositeDisposable} from 'atom';
import {TeletypeClient, Errors} from '@atom/teletype-client';
import PortalBindingManager from './portal-binding-manager';
import NotificationManager from './notification-manager';
// import PortalStatusBarIndicator from './portal-status-bar-indicator';
import { AuthenticationProvider } from './authentication-provider';
// import CredentialCache = from './credential-cache';
import TeletypeService from './teletype-service';
import { findPortalId } from './portal-id-helpers';
import { CredentialCache } from './credential-cache';
// import JoinViaExternalAppDialog from './join-via-external-app-dialog';

export default class TeletypePackage {
  config: any;
  workspace: any;
  notificationManager: NotificationManager;
  packageManager: any;
  commandRegistry: any;
  tooltipManager: any;
  clipboard: any;
  pubSubGateway: any;
  pusherKey: any;
  pusherOptions: any;
  baseURL: any;
  getAtomVersion: any;
  peerConnectionTimeout: any;
  tetherDisconnectWindow: any;
  credentialCache: any;
  client: TeletypeClient;
  portalBindingManagerPromise: Promise<PortalBindingManager | null> | null;
  joinViaExternalAppDialog: any;
  subscriptions: any[];
  initializationError: any;
  portalStatusBarIndicator: any;
  isClientOutdated: any;
  authenticationProviderPromise: any;

  constructor (options: any) {
    const {
      baseURL, config, clipboard, commandRegistry, credentialCache, getAtomVersion,
      notificationManager, packageManager, peerConnectionTimeout, pubSubGateway,
      pusherKey, pusherOptions, tetherDisconnectWindow, tooltipManager,
      workspace, subscriptions
    } = options;

    this.config = config;
    this.workspace = workspace;
    this.notificationManager = notificationManager;
    this.packageManager = packageManager;
    this.commandRegistry = commandRegistry;
    this.tooltipManager = tooltipManager;
    this.clipboard = clipboard;
    this.pubSubGateway = pubSubGateway;
    this.pusherKey = pusherKey;
    this.pusherOptions = pusherOptions;
    this.baseURL = baseURL;
    this.getAtomVersion = getAtomVersion;
    this.peerConnectionTimeout = peerConnectionTimeout;
    this.tetherDisconnectWindow = tetherDisconnectWindow;
    this.credentialCache = credentialCache || new CredentialCache();
    this.client = new TeletypeClient({
      pusherKey: this.pusherKey,
      pusherOptions: this.pusherOptions,
      baseURL: this.baseURL,
      pubSubGateway: this.pubSubGateway,
      connectionTimeout: this.peerConnectionTimeout,
      tetherDisconnectWindow: this.tetherDisconnectWindow
    });
    this.client.onConnectionError(this.handleConnectionError.bind(this));
    this.portalBindingManagerPromise = null;
    // this.joinViaExternalAppDialog = new JoinViaExternalAppDialog({config, commandRegistry, workspace});
    this.subscriptions = subscriptions;
  }

  activate () {
    console.log('teletype: Using pusher key:', this.pusherKey);
    console.log('teletype: Using base URL:', this.baseURL);
  
    this.subscriptions.push(vscode.commands.registerCommand('teletype:sign-out', () => {
      this.signOut();
    }));
    this.subscriptions.push(vscode.commands.registerCommand('teletype:share-portal', () => {
      this.sharePortal();
    }));
    this.subscriptions.push(vscode.commands.registerCommand('teletype:join-portal', () => {
      this.joinPortal();
    }));
    this.subscriptions.push(vscode.commands.registerCommand('teletype:leave-portal', () => {
      this.leavePortal();
    }));
    this.subscriptions.push(vscode.commands.registerCommand('teletype:copy-portal-url', () => {
      this.copyHostPortalURI();
    }));
    this.subscriptions.push(vscode.commands.registerCommand('teletype:close-portal', () => {
      this.closeHostPortal();
    }));

    // Initiate sign-in, which will continue asynchronously, since we don't want
    // to block here.
    this.signInUsingSavedToken();
    this.registerRemoteEditorOpener();
  }

  async deactivate () {
    this.initializationError = null;

    // this.subscriptions.dispose();
    // this.subscriptions = new CompositeDisposable();

    if (this.portalStatusBarIndicator) { this.portalStatusBarIndicator.destroy(); }

    if (this.portalBindingManagerPromise) {
      const manager = await this.portalBindingManagerPromise;
      await manager?.dispose();
    }
  }

  async handleURI (parsedURI: vscode.Uri, rawURI: string) {
    const portalId = findPortalId(parsedURI.fsPath) || rawURI;

    if (this.config.get('teletype.askBeforeJoiningPortalViaExternalApp')) {
      //const {EXIT_STATUS} = JoinViaExternalAppDialog;

      // const status = await this.joinViaExternalAppDialog.show(rawURI);
      // switch (portalID) {
      //   case EXIT_STATUS.CONFIRM_ONCE:
      //     return this.joinPortal(portalId);
      //   case EXIT_STATUS.CONFIRM_ALWAYS:
      //     this.config.set('teletype.askBeforeJoiningPortalViaExternalApp', false);
      //     return this.joinPortal(portalId);
      //   default:
      //     break;
      // }
      const portalID = await vscode.window.showInputBox({ prompt: 'Enter ID of the Portal you wish to join' });
      return this.joinPortal(portalId);
    } else {
      return this.joinPortal(portalId);
    }
  }

  async sharePortal () {
    this.showPopover();

    if (await this.isSignedIn()) {
      const manager = await this.getPortalBindingManager();
      const portalBinding = await manager?.createHostPortalBinding();
      if (portalBinding) { return portalBinding.portal; }
    }
  }

  async joinPortal (id: string = '') {
    this.showPopover();

    if (await this.isSignedIn()) {
      if (id) {
        const manager = await this.getPortalBindingManager();
        const portalBinding = await manager?.createGuestPortalBinding(id);
        if (portalBinding) { return portalBinding.portal; }
      } else {
        await this.showJoinPortalPrompt();
      }
    }
  }

  async closeHostPortal () {
    this.showPopover();

    const manager = await this.getPortalBindingManager();
    const hostPortalBinding = await manager?.getHostPortalBinding();
    hostPortalBinding?.close();
  }

  async copyHostPortalURI () {
    const manager = await this.getPortalBindingManager();
    const hostPortalBinding = await manager?.getHostPortalBinding();
    this.clipboard.write(hostPortalBinding?.uri);
  }

  async leavePortal () {
    this.showPopover();

    const manager = await this.getPortalBindingManager();
    const guestPortalBinding = await manager?.getActiveGuestPortalBinding();
    guestPortalBinding?.leave();
  }

  provideTeletype () {
    return new TeletypeService(this);
  }

  // async consumeStatusBar (statusBar) {
  //   const teletypeClient = await this.getClient();
  //   const portalBindingManager = await this.getPortalBindingManager();
  //   const authenticationProvider = await this.getAuthenticationProvider();
  //   this.portalStatusBarIndicator = new PortalStatusBarIndicator({
  //     statusBar,
  //     teletypeClient,
  //     portalBindingManager,
  //     authenticationProvider,
  //     isClientOutdated: this.isClientOutdated,
  //     initializationError: this.initializationError,
  //     tooltipManager: this.tooltipManager,
  //     commandRegistry: this.commandRegistry,
  //     clipboard: this.clipboard,
  //     workspace: this.workspace,
  //     notificationManager: this.notificationManager,
  //     packageManager: this.packageManager,
  //     getAtomVersion: this.getAtomVersion
  //   });

  //   this.portalStatusBarIndicator.attach();
  // }

  registerRemoteEditorOpener () {
    // this.subscriptions.add(this.workspace.addOpener((uri) => {
    //   if (uri.startsWith('atom://teletype/')) {
    //     return this.getRemoteEditorForURI(uri);
    //   } else {
    //     return null;
    //   }
    // }));
  }

  async getRemoteEditorForURI (uri: string) {
    const portalBindingManager = await this.getPortalBindingManager();
    if (portalBindingManager && await this.isSignedIn()) {
      return portalBindingManager.getRemoteEditorForURI(uri);
    }
  }

  async signInUsingSavedToken () {
    const authenticationProvider = await this.getAuthenticationProvider();
    if (authenticationProvider) {
      return authenticationProvider.signInUsingSavedToken();
    } else {
      return false;
    }
  }

  async signOut () {
    const authenticationProvider = await this.getAuthenticationProvider();
    if (authenticationProvider) {
      this.portalStatusBarIndicator.showPopover();
      await authenticationProvider.signOut();
    }
  }

  async isSignedIn () {
    const authenticationProvider = await this.getAuthenticationProvider();
    if (authenticationProvider) {
      return authenticationProvider.isSignedIn();
    } else {
      return false;
    }
  }

  showPopover () {
    if (!this.portalStatusBarIndicator) { return; }

    this.portalStatusBarIndicator.showPopover();
  }

  async showJoinPortalPrompt () {
    if (!this.portalStatusBarIndicator) { return; }

    const {popoverComponent} = this.portalStatusBarIndicator;
    const {portalListComponent} = popoverComponent.refs;
    await portalListComponent.showJoinPortalPrompt();
  }

  handleConnectionError (event: Error) {
    const message = 'Connection Error';
    const description = `An error occurred with a teletype connection: <code>${event.message}</code>`;
    this.notificationManager.addError(message, {
      description,
      dismissable: true
    });
  }

  getAuthenticationProvider () {
    if (!this.authenticationProviderPromise) {
      this.authenticationProviderPromise = new Promise(async (resolve, reject) => {
        const client = await this.getClient();
        if (client) {
          resolve(new AuthenticationProvider(
            client, this.notificationManager, this.credentialCache, this.workspace
          ));
        } else {
          this.authenticationProviderPromise = null;
          resolve(null);
        }
      });
    }

    return this.authenticationProviderPromise;
  }

  getPortalBindingManager () : Promise<PortalBindingManager | null> {
    if (!this.portalBindingManagerPromise) {
      this.portalBindingManagerPromise = new Promise(async (resolve, reject) => {
        const client = await this.getClient();
        if (client) {
          resolve(new PortalBindingManager(client, this.workspace, this.notificationManager));
        } else {
          this.portalBindingManagerPromise = null;
          resolve(null);
        }
      });
    }

    return this.portalBindingManagerPromise;
  }

  async getClient () {
    if (this.initializationError) { return null; }
    if (this.isClientOutdated) { return null; }

    try {
      await this.client.initialize();
      return this.client;
    } catch (error) {
      if (error instanceof Errors.ClientOutOfDateError) {
        this.isClientOutdated = true;
      } else {
        this.initializationError = error;
      }
    }
  }
}
