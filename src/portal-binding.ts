import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { Portal, TeletypeClient } from "@atom/teletype-client";

export interface IPortalBinding {
    portal?: Portal;
}

export class PortalBinding extends vscode.Disposable implements IPortalBinding {
    portal?: Portal;
    emitter: EventEmitter;

    constructor (public client: TeletypeClient, didDispose: Function) {
        super(didDispose);
        this.emitter = new EventEmitter();
    }
}
