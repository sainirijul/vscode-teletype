import * as vscode from 'vscode';
import {EventEmitter } from 'events';
import {SelectionMap, Selection, Position, Range} from './teletype-types';
import {EditorProxy, FollowState, IPortalDelegate, Portal, TeletypeClient, UpdatePosition } from "@atom/teletype-client";
import NotificationManager from './notification-manager';
import WorkspaceManager from './workspace-manager';

export interface IPortalBinding {
    portal?: Portal;
}

export class PortalBinding extends vscode.Disposable implements IPortalBinding, IPortalDelegate {
    portal?: Portal;
    // lastUpdateTetherPromise: Promise<void>;
    emitter: EventEmitter;

    constructor (public client: TeletypeClient, public workspaceManager: WorkspaceManager, public notificationManager: NotificationManager, didDispose: Function) {
        super(didDispose);

        // this.lastUpdateTetherPromise = Promise.resolve();
        this.emitter = new EventEmitter();
    }

    public closePortal () {
        if (this.portal) {
            this.portal.dispose();
        }
    }

    // @override
    dispose (): any {
        this.workspaceManager.removeDocuments(this.portal?.id);
        this.portal = undefined;
        return super.dispose();        
    }

    // @override
    hostDidClosePortal () {
        this.emitter.emit('did-change', {type: 'close-portal'});

        // guest:
        this.notificationManager.addInfo('Portal closed', {
            description: 'Your host stopped sharing their editor.',
            dismissable: true
        });
    }

    // @override
    hostDidLoseConnection () {
        this.emitter.emit('did-change', {type: 'close-portal'});

        // guest:
        this.notificationManager.addInfo('Portal closed', {
            description: (
            'We haven\'t heard from the host in a while.\n' +
            'Once your host is back online, they can share a new portal with you to resume collaborating.'
            ),
            dismissable: true
        });
    }

    // @override
    siteDidJoin(siteId: number): void {
        // host:
        // const site = this.portal?.getSiteIdentity(siteId);
        // this.notificationManager.addInfo(`@${site?.login} has joined your portal`);
        // this.emitter.emit('did-change', {type: 'join-portal', portal: this.portal});
    
        // guest:
        const hostLogin = this.portal?.getSiteIdentity(1);
        const siteLogin = this.portal?.getSiteIdentity(siteId);
        this.notificationManager.addInfo(`@${siteLogin?.login} has joined @${hostLogin?.login}'s portal`);
        this.emitter.emit('did-change');

        this.notificationManager?.addInfo(`Joined Portal with ID ${this.portal?.id}`);
    }

    // @override
    siteDidLeave(siteId: number): void {
        // host:
        // const site = this.portal?.getSiteIdentity(siteId);
        // this.notificationManager.addInfo(`@${site?.login} has left your portal`);
        // this.emitter.emit('did-change', {type: 'leave-portal', portal: this.portal});

        // guest:
        const hostLogin = this.portal?.getSiteIdentity(1);
        const siteLogin = this.portal?.getSiteIdentity(siteId);
        this.notificationManager.addInfo(`@${siteLogin?.login} has left @${hostLogin?.login}'s portal`);
        this.emitter.emit('did-change');

        this.notificationManager?.addInfo(`Leaved Portal with ID ${this.portal?.id}`);
    }
    
    // @override
    didChangeEditorProxies(): void {
        this.emitter.emit('did-change', {type: 'change-editor-proxies'});
    }

    // @override
    updateActivePositions (positionsBySiteId: UpdatePosition[]) {
        // if (positionsBySiteId) { 
        //     this.workspaceManager.getEditorBindings().forEach(editorBinding => {
        //         editorBinding.updateActivePositions(positionsBySiteId);
        //     });
        // }

        // this.sitePositionsComponent.update({positionsBySiteId});
        this.emitter.emit('did-change');
    }

    // @override
    // async updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
    //     if (editorProxy) {
    //         // this.lastUpdateTetherPromise = this.lastUpdateTetherPromise.then(() => {
    //             await this._updateTether(followState, editorProxy, position);
    //         // });
    //     }

    //     // return this.lastUpdateTetherPromise;
    // }

    // async _updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
    // }

    // Private
    // async _updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
    //     // guest:
    //     if (followState === FollowState.RETRACTED) {
    //         // this.shouldRelayActiveEditorChanges = false;
    //         const editor = await this.workspaceManager.findOrCreateEditorForEditorProxy(editorProxy, this.portal);
    //         if (editor) {
    //             // await this.openPaneItem(editor);
    //             vscode.window.showTextDocument(editor.document);
    //         }
    //         // this.shouldRelayActiveEditorChanges = true;
    //     } else {
    //         if (position) { 
    //             this.workspaceManager.getEditorBindings().forEach(editorBinding => {
    //                 editorBinding.updateTether(followState, position);
    //             }); 
    //         }
    //     }

    //     const editorBinding = this.workspaceManager.getEditorBindingByEditorProxy(editorProxy);
    //     if (editorBinding && position) {
    //         editorBinding.updateTether(followState, position);
    //     }
    // }

    // @override
    async updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
        if (!editorProxy) { return; }

        if (followState === FollowState.RETRACTED) {
            const editorBinding = this.workspaceManager.getEditorBindingByEditorProxy(editorProxy);
            // await vscode.workspace.openTextDocument(editorBinding?.editor, {searchAllPanes: true});
            if (editorBinding && position) {
                // editorBinding.updateTether(followState, position); 
            }
        } else {
            //if (position) { 
                //this.workspaceManager.getEditorBindings().forEach(editorBinding => {
                    // editorBinding.updateTether(followState, position);
                //});
            //}
        }
    }

    onDidChange(callback: (event: any) => void) {
        return this.emitter.on('did-change', callback);
    }
}
