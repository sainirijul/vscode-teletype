import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { Portal, TeletypeClient } from "@atom/teletype-client";
import WorkspaceManager from './workspace-manager';

export interface IPortalBinding {
    portal?: Portal;
}

export class PortalBinding extends vscode.Disposable implements IPortalBinding {
    portal?: Portal;
    emitter: EventEmitter;

    constructor (public workspaceManager: WorkspaceManager, public client: TeletypeClient, didDispose: Function) {
        super(didDispose);
        this.emitter = new EventEmitter();
    }

    // @override
    dispose(): any {
        this.workspaceManager.removeDocuments(this.portal?.id);
        this.portal = undefined;
        return super.dispose();        
    }

    close () {
        if (this.portal) {
            this.portal.dispose();
        }
    }
}
