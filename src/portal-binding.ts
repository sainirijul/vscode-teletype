import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { SelectionMap, Selection, Position, Range } from './teletype-types';
import { EditorProxy, FollowState, IPortalDelegate, Portal, TeletypeClient, UpdatePosition } from "@atom/teletype-client";
import NotificationManager from './notification-manager';
import WorkspaceManager from './workspace-manager';
import BufferBinding, { IBufferProxyExt } from './buffer-binding';

export interface IPortalBinding {
    portal?: Portal;
}

export class PortalBinding extends vscode.Disposable implements IPortalBinding, IPortalDelegate {
    portal?: Portal;
    // lastUpdateTetherPromise: Promise<void>;
    emitter: EventEmitter;
    private resIdxTable: Array<Number | undefined>;

    constructor(public client: TeletypeClient, public workspaceManager: WorkspaceManager, public notificationManager: NotificationManager, didDispose: Function) {
        super(didDispose);

        // this.lastUpdateTetherPromise = Promise.resolve();
        this.emitter = new EventEmitter();

        this.resIdxTable = [undefined, undefined, undefined];
    }

    public async setPortalAsync(portal: Portal) {
        this.portal = portal;
        await this.portal.setDelegate(this);
        this.monkeyPatch();
    }

    private monkeyPatch() {
        (this.portal as any).portalBinding = this;
    }

    public getResIndexBySiteId(siteId: number): number | undefined {
        let idx = undefined;
        for (let i = 0; i < this.resIdxTable.length; i++) {
            if (!this.resIdxTable[i]) {
                this.resIdxTable[i] = siteId;
                idx = i;
                break;
            }
        }
        return idx;
    }

    public removeResIndexBySiteId(siteId: number): void {
        for (let i = 0; i < this.resIdxTable.length; i++) {
            if (this.resIdxTable[i] === siteId) {
                this.resIdxTable[i] = undefined;
                break;
            }
        }
    }

    public async closePortalAsync() {
        if (this.portal) {
            for (const [_, proxy] of this.portal.bufferProxiesById) {
                const getBufferBindingFunc = (proxy as unknown as IBufferProxyExt)?.getBufferBinding;
                if (getBufferBindingFunc) {
                    const bufferBinding = getBufferBindingFunc();
                    if (bufferBinding?.pendingUpdates?.length > 0) {
                        const reply = await this.notificationManager.confirmAsync('There are changes that have not been reflected yet.\nAre you sure you want to quit?');
                        if (!reply) { return; }
                    }
                } else {
                    console.error(proxy);
                }
            }
            this.portal.dispose();
        }
    }

    // @override
    dispose(): any {
        this.workspaceManager.removeDocuments(this.portal?.id);
        this.portal = undefined;
        return super.dispose();
    }

    // @override
    hostDidClosePortal() {
        this.emitter.emit('did-change', { type: 'close-portal' });

        // guest:
        this.notificationManager.addInfo('Portal closed', {
            description: 'Your host stopped sharing their editor.',
            dismissable: true
        });
    }

    // @override
    hostDidLoseConnection() {
        this.emitter.emit('did-change', { type: 'close-portal' });

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
        this.notificationManager.addInfo(`@${siteLogin?.login} has joined @${hostLogin?.login}'s Portal (${this.portal?.id})`);
        this.emitter.emit('did-change');
    }

    // @override
    siteDidLeave(siteId: number): void {
        // host:
        // const site = this.portal?.getSiteIdentity(siteId);
        // this.notificationManager.addInfo(`@${site?.login} has left your portal`);
        // this.emitter.emit('did-change', {type: 'leave-portal', portal: this.portal});

        this.removeResIndexBySiteId(siteId);

        // guest:
        const hostLogin = this.portal?.getSiteIdentity(1);
        const siteLogin = this.portal?.getSiteIdentity(siteId);
        this.notificationManager.addInfo(`@${siteLogin?.login} has left @${hostLogin?.login}'s Portal (${this.portal?.id})`);
        // this.emitter.emit('did-change');
        this.emitter.emit('did-change', { type: 'leave-portal', portal: this.portal });
    }

    // @override
    didChangeEditorProxies(): void {
        this.emitter.emit('did-change', { type: 'change-editor-proxies' });
    }

    // @override
    updateActivePositions(positionsBySiteId: UpdatePosition[]) {
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
    async updateTether(followState: number, editorProxy: EditorProxy, position: Position) {
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
