import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import WorkspaceManager from './workspace-manager';
import EditorBinding from './editor-binding';

export class EditorNodeProvider implements vscode.TreeDataProvider<Dependency> {
	public static readonly viewType = 'teletype.accountsView';

	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private workspaceManager: WorkspaceManager) {
		workspaceManager?.onDidChange(this.refresh.bind(this));
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Dependency): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Dependency): Thenable<Dependency[]> {
		if (!this.workspaceManager) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		let lst: Dependency[] = [];

		if (!element) {
			this.workspaceManager.getEditorBindings().forEach(editorBinding => {
				lst.push(new Dependency(editorBinding.bufferBinding.getBufferProxyURI()));
			});
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
