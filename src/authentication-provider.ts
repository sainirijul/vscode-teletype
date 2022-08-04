import * as vscode from 'vscode';
import { TeletypeClient } from '@atom/teletype-client';
import { EventEmitter } from 'events';
import { CredentialCache } from './credential-cache';
import NotificationManager from './notification-manager';

export class AuthenticationProvider {
  client: TeletypeClient;
  credentialCache: CredentialCache;
  notificationManager: NotificationManager;
  workspace: vscode.WorkspaceFolder;
  emitter: EventEmitter;
  signingIn: boolean = false;

  constructor (client: TeletypeClient, notificationManager: NotificationManager, workspace: vscode.WorkspaceFolder, credentialCache: CredentialCache) {
    this.client = client;
    this.client.onSignInChange(this.didChangeSignIn.bind(this));
    this.credentialCache = credentialCache;
    this.notificationManager = notificationManager;
    this.workspace = workspace;
    this.emitter = new EventEmitter();
  }

  async signInUsingSavedToken () : Promise<boolean> {
    console.log('start signInUsingSavedToken...');
    if (this.isSignedIn()) { return true; }

    const token = await this.credentialCache.get('oauth-token');
    if (token) {
      return await this._signIn(token);
    } else {
      return false;
    }
  }

  async signIn (token: string) : Promise<boolean> {
    if (this.isSignedIn()) { return true; }

    if (await this._signIn(token)) {
      vscode.commands.executeCommand('setContext', 'teletype:isSignin', true);
      await this.credentialCache.set('oauth-token', token);
      return true;
    } else {
      vscode.commands.executeCommand('setContext', 'teletype:isSignin', false);
      return false;
    }
  }

  async signOut () {
    if (!this.isSignedIn()) { return; }

    this.client.signOut();
    vscode.commands.executeCommand('setContext', 'teletype:isSignin', false);
    
    await this.credentialCache.delete('oauth-token');
  }

  private async _signIn (token: string) : Promise<boolean> {
    let signedIn = false;
    try {
      this.signingIn = true;
      signedIn = await this.client.signIn(token);
    } catch (error) {
      this.notificationManager.addError('Failed to authenticate to teletype', {
        description: `Signing in failed with error: <code>${(error as Error).message}</code>`,
        dismissable: true
      });
    } finally {
      this.signingIn = false;
    }
    return signedIn;
  }

  isSigningIn () : boolean {
    return this.signingIn;
  }

  isSignedIn () : boolean {
    console.log('check signin...');
    return this.client.isSignedIn();
  }

  getIdentity () : any {
    return this.client.getLocalUserIdentity();
  }

  onDidChange (callback: () => void) {
    return this.emitter.on('did-change', callback);
  }

  didChangeSignIn () : void {
    // const workspaceElement = this.workspace.getElement();
    // if (this.isSignedIn()) {
    //   workspaceElement.classList.add('teletype-Authenticated');
    // } else {
    //   workspaceElement.classList.remove('teletype-Authenticated');
    // }

    this.emitter.emit('did-change');
  }
}
