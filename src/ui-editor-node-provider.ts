import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import WorkspaceManager from './workspace-manager';

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

		let xx: Dependency[] = [];

		// if (!element) {
		// 	xx.push(new Dependency('Host'));
		// 	xx.push(new Dependency('Guest'));
		// } else {
		// 	if (element.label === 'Host') {
		// 		this.accountManager.accountList.forEach(element => {
		// 			xx.push(new Dependency(element.buffer.uri.toString()));
		// 		});
		// 	} else if (element.label === 'Guest') {
		// 		xx.push(new Dependency('yyy'));
		// 		// this.accountManager.accountList.forEach(element => {
		// 		// 	xx.push(new Dependency(element.buffer.uri.toString()));
		// 		// });
		// 	}
		// }

 this.workspaceManager.editorBindingsByBuffer.forEach((value, key) => {
	//  if (value.getBufferProxyURI()){
	// 	xx.push(new Dependency(value.editorProxy?.bufferProxy.uri));
	//  } else {
	// 	xx.push(new Dependency(key.uri.fsPath));
	//  }
	xx.push(new Dependency(value.bufferBinding.getBufferProxyURI()));
 });


		return Promise.resolve(xx);
	}

	/**
	 * Given the path to package.json, read all its dependencies and devDependencies.
	 */
	// private getDepsInPackageJson(packageJsonPath: string): Dependency[] {
		// return [];
		// if (this.pathExists(packageJsonPath)) {
		// 	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

		// 	const toDep = (moduleName: string, version: string): Dependency => {
		// 		if (this.pathExists(path.join(this.workspaceManager, 'node_modules', moduleName))) {
		// 			return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.Collapsed);
		// 		} else {
		// 			return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.None, {
		// 				command: 'extension.openPackageOnNpm',
		// 				title: '',
		// 				arguments: [moduleName]
		// 			});
		// 		}
		// 	};

		// 	const deps = packageJson.dependencies
		// 		? Object.keys(packageJson.dependencies).map(dep => toDep(dep, packageJson.dependencies[dep]))
		// 		: [];
		// 	const devDeps = packageJson.devDependencies
		// 		? Object.keys(packageJson.devDependencies).map(dep => toDep(dep, packageJson.devDependencies[dep]))
		// 		: [];
		// 	return deps.concat(devDeps);
		// } else {
		// 	return [];
		// }
	// }

	// private pathExists(p: string): boolean {
	// 	try {
	// 		fs.accessSync(p);
	// 	} catch (err) {
	// 		return false;
	// 	}

	// 	return true;
	// }
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
