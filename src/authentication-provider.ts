import * as vscode from 'vscode';
import { TeletypeClient } from '@atom/teletype-client';
import { EventEmitter } from 'events';
import { CredentialCache } from './credential-cache';
import NotificationManager from './notification-manager';

export class AuthenticationProvider {
  client: TeletypeClient;
  credentialCache: CredentialCache;
  notificationManager: NotificationManager;
  emitter: EventEmitter;
  signingIn: boolean = false;

  constructor (client: TeletypeClient, notificationManager: NotificationManager, credentialCache: CredentialCache) {
    this.client = client;
    this.credentialCache = credentialCache;
    this.notificationManager = notificationManager;
    this.emitter = new EventEmitter();

    this.client.onSignInChange(() => {
      this.emitter.emit('did-change');
    });
  }

  public async signInUsingSavedToken () : Promise<boolean> {
    console.log('start signInUsingSavedToken...');
    if (this.isSignedIn()) { return true; }

    const token = await this.credentialCache.get('oauth-token');
    if (token) {
      return await this._signIn(token);
    } else {
      return false;
    }
  }

  public async signIn (token: string) : Promise<boolean> {
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

  public async signOut () {
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

  public isSigningIn () : boolean {
    return this.signingIn;
  }

  public isSignedIn () : boolean {
    console.log('check signin...');
    return this.client.isSignedIn();
  }

  public getIdentity () : any {
    return this.client.getLocalUserIdentity();
  }

  public onDidChange (callback: () => void) {
    return this.emitter.on('did-change', callback);
  }

  private didChangeSignIn () : void {
    
  }
}
