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
					const binding = this.workspaceManager.getBufferBindingByBufferProxy(a);
					if (binding) {
						lst.push(new Dependency(binding.uri.toString(), binding.fsPath ?? binding.uri, true));
					} else {
						lst.push(new Dependency(`(unbinded) ${a.uri}`, undefined, true));
					}
				});
				// host.portal?.editorProxiesById.forEach((a,_) => {
				//  	lst.push(new Dependency(` > (editor) ${a.bufferProxy.uri}`, undefined, true));
				// });
			}
			const guests = await this.portalBindingManager.getGuestPortalBindings();
			if (guests) {
				guests.forEach(guest => {
					guest.portal?.bufferProxiesById.forEach((a,_) => {
						const binding = this.workspaceManager.getBufferBindingByBufferProxy(a);
						if (binding) {
							lst.push(new Dependency(binding.uri.toString(), binding.fsPath));
						} else {
							lst.push(new Dependency(`(unbinded) ${a.uri}`));
						}
					});
					// guest.portal?.editorProxiesById.forEach((a,_) => {
					// 	lst.push(new Dependency(` > (editor) ${a.bufferProxy.uri}`));
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
		public readonly path?: vscode.Uri,
		public readonly isHost?: boolean,
		public readonly iconPath?: vscode.Uri | string | vscode.ThemeIcon,
		public readonly collapsibleState?: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);

		if (iconPath) {
			this.iconPath = iconPath;
		} else if (!isHost) {
			this.iconPath = new vscode.ThemeIcon('link');
		}

		this.tooltip = `${this.label}`;
		// this.description = `${this.label}`;

		if (this.path) {
			this.command = {title: 'Open Editor', command: 'extension.show-editor',
							// arguments: [this.isHost ? vscode.Uri.parse(label) : this.path? vscode.Uri.file(this.path) : '']
							arguments: [this.path ?? '']
						};
		}
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'dependency';
}
