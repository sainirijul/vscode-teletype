import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import PortalBindingManager from './portal-binding-manager';
import { PortalBinding } from './portal-binding';
import HostPortalBinding from './host-portal-binding';
import GuestPortalBinding from './guest-portal-binding';
// import { IMemberIdentify } from '@atom/teletype-client';

export class AccountNodeProvider implements vscode.TreeDataProvider<Dependency> {
	public static readonly viewType = 'teletype.accountsView';

	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private portalBindingManager: PortalBindingManager) {
		portalBindingManager?.onDidChange(this.refresh.bind(this));
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Dependency): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: Dependency): Promise<Dependency[]> {
		if (!this.portalBindingManager) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return [];
		}

		let lst: Dependency[] = [];

		if (!element) {
			const host = await this.portalBindingManager.getHostPortalBinding();
			if (host) {
				lst.push(new Dependency('Host', host.portal?.id, host));
			}
			const guest = await this.portalBindingManager.getGuestPortalBindings();
			if (guest) {
				guest.forEach(element => {
					lst.push(new Dependency(element.portalId, element.portal?.id, element));
				});
			}
		} else if(element.value instanceof PortalBinding){
			const ids = element.value.portal?.getActiveSiteIds();
			if (ids) {
				ids.map(siteId => {
					const identify = element.value.portal.getSiteIdentity(siteId);					
					lst.push(new Dependency(identify.login, siteId, identify));
				});
			}
		}

		return lst;
	}
}

export class Dependency extends vscode.TreeItem {

	constructor(
		label: string,
		id?: any,
		public readonly value?: any,
		iconUri?: vscode.Uri,
		collapsibleState?: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);

		if (value instanceof PortalBinding) {
			this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
			if (value instanceof HostPortalBinding) {
				this.contextValue = 'Host';
			} else if (value instanceof GuestPortalBinding) {
				this.contextValue = 'Guest';
			}
		} else if ('login' in value) {
			this.description = (id === 1)? '(Me)' : undefined;
		}

		// this.id = id;
		this.iconPath = iconUri;
		this.tooltip = `${this.label}`;
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	// contextValue = 'dependency';
}
