import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import PortalBindingManager from './portal-binding-manager';
import { PortalBinding } from './portal-binding';
import HostPortalBinding from './host-portal-binding';
import GuestPortalBinding from './guest-portal-binding';
import getAvatarUrl from './get-avatar-url';
import { AuthenticationProvider } from './authentication-provider';
// import { IMemberIdentify } from '@atom/teletype-client';

export class AccountNodeProvider implements vscode.TreeDataProvider<Dependency> {
	public isSignin : boolean = true;
	
	public static readonly viewType = 'teletype.accountsView';

    private portalBindingUri: string | undefined;
    private identify: any;
    //private items: Dependency[] = [];

	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private authenticationProvider?: AuthenticationProvider, private portalBindingManager?: PortalBindingManager) {
		authenticationProvider?.onDidChange(this.didChangeLogin.bind(this));
		portalBindingManager?.onDidChange(this.didPortalBindingChanged.bind(this));
  
		//this.refreshIdentify();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

    // refreshIdentify(): void {
	// 	if (this.identify) {
	// 	  //const avatarUrl = getAvatarUrl(this.identify.login, 64);
	// 	  //this.webView?.postMessage({command: 'identify', text: {loginId: this.identify.login, avatarUrl}});
	// 	  //this.items =[new Dependency(this.identify.login, null, this.identify, vscode.Uri.parse(avatarUrl))];
	// 	} else {
	// 	  //this.items =[];
	// 	}
	// 	this.refresh();
	// }

	didChangeLogin(): void {
		this.identify = this.authenticationProvider?.getIdentity();
		this.refresh();
	}

	didPortalBindingChanged(event: any): void {
		if (event) {
			if (event.type === 'share-portal') {
				this.portalBindingUri = event.uri;
				//this.webView?.postMessage({command: 'host-uri', text: this.portalBindingUri});
				vscode.commands.executeCommand('extension.copy-portal-url');			
			} else if (event.type === 'close-portal') {
				this.portalBindingUri = undefined;
				//this.webView?.postMessage({command: 'host-uri', text: ''});
			}
		}
		this.refresh();
	}

	copyPortalBindingUrl() {

	}

	getTreeItem(element: Dependency): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: Dependency): Promise<Dependency[] | null> {
		if (!this.portalBindingManager) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return [];
		}

		if (!this.identify) {
			return null;
		}

		let lst: Dependency[] = [];

		if (!element) {
			// lst.push(new Dependency(this.identify.login, undefined, this.identify, vscode.Uri.parse(getAvatarUrl(this.identify.login, 32))));
			lst.push(new Dependency(this.identify.login, undefined, null, vscode.Uri.parse(getAvatarUrl(this.identify.login, 32))));

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
					const avatarUrl = getAvatarUrl(identify.login, 32);
					lst.push(new Dependency(identify.login, siteId, {portal: element.value.portal, siteId, identify}, vscode.Uri.parse(avatarUrl)));
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

		if (value) {
			if (value instanceof PortalBinding) {
				this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
				if (value instanceof HostPortalBinding) {
					this.contextValue = 'Host';
				} else if (value instanceof GuestPortalBinding) {
					this.contextValue = 'Guest';
				}
			} else if ('portal' in value) {
				if (id === value.portal.getLocalSiteId()) {
					this.description = '(me)';
					this.contextValue = 'Member';
				} else {
					if (value.portal.isHost) {
						this.contextValue = 'Member';
					} else {
						if (id === value.portal.getFollowedSiteId()) {
							this.description = (id === 1)? '(Host) *' : '*';
							this.contextValue = 'FollowedMember';
						} else {
							this.description = (id === 1)? '(Host)' : undefined;
							this.contextValue = 'FollowableMember';
						}
					}
				}

				// this.command = {title: 'Follow', command: 'teletype.follow-portal',
				// 	arguments: [value.portal, value.identify]	
			}
		} else {
			this.description = '(signed)';
			this.contextValue = 'Identify';
			console.log(this);
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

// if (siteId === this.guest.getFollowedSiteId()) {
// 	guest.portal.unfollow()
//   } else {
// 	guest.portal.follow(siteId)
//   }
// }
