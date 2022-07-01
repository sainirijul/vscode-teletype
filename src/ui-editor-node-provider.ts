import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import WorkspaceManager from './workspace-manager';
import EditorBinding from './editor-binding';
import PortalBindingManager from './portal-binding-manager';

export class EditorNodeProvider implements vscode.TreeDataProvider<Dependency> {
	public static readonly viewType = 'teletype.accountsView';

	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private portalBindingManager: PortalBindingManager, private workspaceManager: WorkspaceManager) {
		portalBindingManager.onDidChange(this.refresh.bind(this));
		workspaceManager.onDidChange(this.refresh.bind(this));
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Dependency): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: Dependency): Promise<Dependency[]> {
		if (!this.workspaceManager) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		let lst: Dependency[] = [];

		if (!element) {
			const host = await this.portalBindingManager.getHostPortalBinding();

			if (host) {
				host.portal?.bufferProxiesById.forEach((a,_) => {
					lst.push(new Dependency(a.uri));
				});
				// host.portal?.editorProxiesById.forEach((a,_) => {
				// 	lst.push(new Dependency(a.bufferProxy.uri));
				// });
			}
			const guests = await this.portalBindingManager.getGuestPortalBindings();
			if (guests) {
				guests.forEach(guest => {
					guest.portal?.bufferProxiesById.forEach((a,_) => {
						lst.push(new Dependency(`* ${a.uri}`));
					});
					// guest.portal?.editorProxiesById.forEach((a,_) => {
					// 	lst.push(new Dependency(`* ${a.bufferProxy.uri}`));
					// });
				});				
			}

			// this.workspaceManager.getEditorBindings().forEach(editorBinding => {
			// 	const filePath = editorBinding.bufferBinding.getBufferProxyURI();
			// 	if (!editorBinding.isRemote) {
			// 		lst.push(new Dependency(filePath));
			// 	} else {
			// 		lst.push(new Dependency(`* ${filePath}`));
			// 	}
			// });
		}

		return Promise.resolve(lst);
	}
}

export class Dependency extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		public readonly iconUri?: vscode.Uri,
		public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);

		this.iconPath = iconUri;
		this.tooltip = `${this.label}`;
		// this.description = `${this.label}`;
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'dependency';
}
