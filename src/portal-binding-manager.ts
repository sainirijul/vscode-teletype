import * as vscode from 'vscode';
//import { Emitter } from 'atom';
import { EventEmitter } from 'events';
import HostPortalBinding from './host-portal-binding';
import GuestPortalBinding from './guest-portal-binding';
import { TeletypeClient } from '@atom/teletype-client';
import { findPortalId } from './portal-id-helpers';
import NotificationManager from './notification-manager';

export default class PortalBindingManager {
  private emitter: EventEmitter;
  public client: TeletypeClient;
  public workspace: any;
  public notificationManager: NotificationManager;
  private hostPortalBindingPromise: Promise<HostPortalBinding> | null;
  private promisesByGuestPortalId: Map<number, Promise<GuestPortalBinding>>;

  constructor (client: TeletypeClient, workspace, notificationManager: NotificationManager) {
    this.emitter = new EventEmitter();
    this.client = client;
    this.workspace = workspace;
    this.notificationManager = notificationManager;
    this.hostPortalBindingPromise = null;
    this.promisesByGuestPortalId = new Map();
  }

  dispose () {
    const disposePromises = [];

    if (this.hostPortalBindingPromise) {
      const disposePromise = this.hostPortalBindingPromise.then((portalBinding) => {
        portalBinding.close();
      });
      disposePromises.push(disposePromise);
    }

    this.promisesByGuestPortalId.forEach(async (portalBindingPromise: Promise<GuestPortalBinding>) => {
      const disposePromise = portalBindingPromise.then((portalBinding) => {
        if (portalBinding) { portalBinding.leave(); }
      });
      disposePromises.push(disposePromise);
    });

    return Promise.all(disposePromises);
  }

  createHostPortalBinding () {
    if (this.hostPortalBindingPromise === null) {
      this.hostPortalBindingPromise = this._createHostPortalBinding();
      this.hostPortalBindingPromise.then((binding) => {
        if (!binding) { this.hostPortalBindingPromise = null; }
      });
    }

    return this.hostPortalBindingPromise;
  }

  async _createHostPortalBinding () : Promise<HostPortalBinding> {
    const portalBinding = new HostPortalBinding(this.client, this.workspace, this.notificationManager,
      () => { this.didDisposeHostPortalBinding(); }
    );

    if (await portalBinding.initialize()) {
      this.emitter.emit('did-change');
    }
    
    return portalBinding;
  }

  getHostPortalBinding () {
    return this.hostPortalBindingPromise
      ? this.hostPortalBindingPromise
      : Promise.resolve(null);
  }

  didDisposeHostPortalBinding () {
    this.hostPortalBindingPromise = null;
    this.emitter.emit('did-change');
  }

  createGuestPortalBinding (portalId: number) {
    let promise = this.promisesByGuestPortalId.get(portalId);
    if (promise) {
      promise.then((binding) => {
        if (binding) { binding.activate(); }
      });
    } else {
      promise = this._createGuestPortalBinding(portalId);
      promise.then((binding) => {
        const newLocal = this;
        if (!binding) { newLocal.promisesByGuestPortalId.delete(portalId); }
      });
      this.promisesByGuestPortalId.set(portalId, promise);
    }

    return promise;
  }

  async _createGuestPortalBinding (portalId: string) : Promise<GuestPortalBinding> {
    const portalBinding = new GuestPortalBinding(
        this.client, portalId, this.workspace, activeEditor, this.notificationManager,
        () => { 
          this.didDisposeGuestPortalBinding(portalBinding); 
        }
    );

    if (await portalBinding.initialize()) {
      this.workspace.getElement().classList.add('teletype-Guest');
      this.emitter.emit('did-change');
    }

    return portalBinding;
  }

  async getGuestPortalBindings () {
    const portalBindings = await Promise.all(this.promisesByGuestPortalId.values());
    return portalBindings.filter((binding) => binding);
  }

  async getRemoteEditors () : Promise<any[] | null> {
    const remoteEditors = [];
    for (const bindingPromise of this.promisesByGuestPortalId.values()) {
      const portalBinding = await bindingPromise;
      const editors = portalBinding.getRemoteEditors();
      if (editors) {
        remoteEditors.push(...editors);
      }
    }

    return remoteEditors;
  }

  async getActiveGuestPortalBinding () : Promise<GuestPortalBinding | null> {
    const activePaneItem = this.workspace.getActivePaneItem();
    for (const [_, portalBindingPromise] of this.promisesByGuestPortalId) { // eslint-disable-line no-unused-vars
      const portalBinding = await portalBindingPromise;
      if (portalBinding?.hasPaneItem(activePaneItem)) {
        return portalBinding;
      }
    }
    return null;
  }

  async hasActivePortals () {
    const hostPortalBinding = await this.getHostPortalBinding();
    const guestPortalBindings = await this.getGuestPortalBindings();

    return (hostPortalBinding) || (guestPortalBindings.length > 0);
  }

  async getRemoteEditorForURI (uri: string) : Promise<vscode.TextEditor | null> {
    const uriComponents = uri.replace('atom://teletype/', '').split('/');

    const portalId = findPortalId(uriComponents[1]);
    if (uriComponents[0] !== 'portal' || !portalId) { return null; }

    const editorProxyId = Number(uriComponents[3]);
    if (uriComponents[2] !== 'editor' || Number.isNaN(editorProxyId)) { return null; }

    const guestPortalBindingPromise = this.promisesByGuestPortalId.get(portalId);
    if (guestPortalBindingPromise) {
      const guestPortalBinding = await guestPortalBindingPromise;
      return await guestPortalBinding.getRemoteEditor(editorProxyId);
    } else {
      throw new Error('Cannot open an editor belonging to a portal that has not been joined');
    }
  }

  didDisposeGuestPortalBinding (portalBinding: GuestPortalBinding) {
    this.promisesByGuestPortalId.delete(portalBinding.portalId);
    if (this.promisesByGuestPortalId.size === 0) {
      this.workspace.getElement().classList.remove('teletype-Guest');
    }
    this.emitter.emit('did-change');
  }

  onDidChange (callback: () => void): EventEmitter {
    return this.emitter.on('did-change', callback);
  }
}
