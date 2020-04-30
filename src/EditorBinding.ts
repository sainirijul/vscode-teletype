import * as vscode from 'vscode';

import { EditorProxy, Portal } from '@atom/teletype-client';

import { SelectionMap, Selection, Position, Range } from './teletype_types';

interface SiteDecoration {
	cursorDecoration: vscode.TextEditorDecorationType;
	selectionDecoration: vscode.TextEditorDecorationType;
}

export default class EditorBinding {
	public readonly editor: vscode.TextEditor;
	private portal: Portal;
	private readonly isHost: boolean;
	private editorProxy!: EditorProxy;
	private localSelectionMap: SelectionMap;
	private disposed!: boolean;
	private selectionsBySiteId: any;
	private decorationBySiteId: Map<number, SiteDecoration>;
	private localMarkerSelectionMap: Map<number, SelectionMap>;

	constructor({ editor, portal, isHost }: { editor: any; portal: any; isHost: any; }) {
		this.editor = editor;
		this.portal = portal;
		this.isHost = isHost;
		this.localSelectionMap = {};
		this.selectionsBySiteId = new Map();
		this.decorationBySiteId = new Map();
		this.localMarkerSelectionMap = new Map();
	}

	dispose() {
		this.disposed = true;
	}

	isDisposed() {
		return this.disposed;
	}

	onDidDispose(onDidDipose: (onDidDipose: any) => void) {
		this.onDidDispose = onDidDipose;
	}

	setEditorProxy(editorProxy: EditorProxy) {
		this.editorProxy = editorProxy;
	}

	updateSelectionsForSiteId(siteId: number, selectionUpdates: SelectionMap) {
		console.log("updateSelectionsForSiteID: " + siteId);
		let selectionsForSite = this.localMarkerSelectionMap.get(siteId);
		const selectionMap = { ...selectionsForSite, ...selectionUpdates };
		this.localMarkerSelectionMap.set(siteId, selectionMap);
		let selectionRanges: vscode.Range[] = [];
		let cursorRanges: vscode.Range[] = [];
		if (!selectionsForSite) {
			selectionsForSite = {};
			this.selectionsBySiteId[siteId] = selectionsForSite;
		}
		for (const selectionId in selectionUpdates) {
			const selectionUpdate = selectionUpdates[selectionId];
			if (selectionUpdate) {
				selectionsForSite[selectionId] = selectionUpdate;
				if (this.isCursor(selectionUpdate)) {
					cursorRanges = cursorRanges.concat(this.convertTeletypeRange(selectionUpdate.range));
				} else {
					if (selectionUpdate.tailed) {
						const cursorRange = this.getCursorRangeFromSelection(selectionUpdate);
						cursorRanges = cursorRanges.concat(this.convertTeletypeRange(cursorRange));
					}
					selectionRanges = selectionRanges.concat(this.convertTeletypeRange(selectionUpdate.range));
				}
			}
			else {
				delete selectionsForSite[selectionId];
			}
		}
		let siteDecoration = this.findSiteDecoration(siteId);
		this.updateDecorations(siteDecoration, cursorRanges, selectionRanges);
	}


	private updateDecorations(siteDecoration: SiteDecoration, cursorRanges: vscode.Range[], selectionRanges: vscode.Range[]) {
		const { cursorDecoration, selectionDecoration } = siteDecoration;
		this.editor.setDecorations(cursorDecoration, cursorRanges);
		this.editor.setDecorations(selectionDecoration, selectionRanges);
	}

	private findSiteDecoration(siteId: number) {
		let siteDecoration = this.decorationBySiteId.get(siteId);
		if (!siteDecoration) {
			siteDecoration = this.createDecorationFromSiteId(siteId);
			this.decorationBySiteId.set(siteId, siteDecoration);
		}
		return siteDecoration;
	}

	isScrollNeededToViewPosition(position: any) {

	}

	updateTether(state: any, position: any) {
	}

	clearSelectionsForSiteId(siteId: number) {
		const siteDecoration = this.findSiteDecoration(siteId);
		this.updateDecorations(siteDecoration, [], []);
	}

	updateSelections(selections: vscode.Selection[]) {
		this.processSelections(selections);
		this.editorProxy.updateSelections(this.localSelectionMap);
	}

	private processSelections(selections: vscode.Selection[]) {
		const currentSelectionKeys = Object.keys(this.localSelectionMap);
		const newSelectionsLength = selections.length;

		selections.forEach((selection, index) => {
			this.localSelectionMap[index] = {
				range: {
					start: this.convertVSCodePosition(selection.start),
					end: this.convertVSCodePosition(selection.end)
				},
				reversed: selection.isReversed,
			};
		});

		selections.forEach((selection, index) => {
			if (currentSelectionKeys.length > newSelectionsLength) {
				for (let index = newSelectionsLength; index < currentSelectionKeys.length; index += 1) {
					this.localSelectionMap[index] = {
						range: {
							start: this.convertVSCodePosition(selection.start),
							end: this.convertVSCodePosition(selection.end)
						},
						reversed: false,
					};
				}
			}
		}
		);
	}

	private convertVSCodePosition(position: vscode.Position): Position {
		return {
			column: position.character,
			row: position.line
		};
	}

	private convertTeletypePosition(position: Position): vscode.Position {
		return new vscode.Position(
			position.row,
			position.column
		);
	}

	private convertTeletypeRange(range: Range): vscode.Range {
		return new vscode.Range(
			this.convertTeletypePosition(range.start),
			this.convertTeletypePosition(range.end)
		);
	}

	private createDecorationFromSiteId(siteId: number): SiteDecoration {
		const selectionDecorationRenderOption: vscode.DecorationRenderOptions = {
			backgroundColor: `rgba(0,0,255,0.6)`
		};

		const { login: siteLogin } = this.portal.getSiteIdentity(siteId);

		const nameTagStyleRules = {
			position: 'absolute',
			top: '12px',
			padding: '0px 5px 0px 0px',
			display: 'inline-block',
			'z-index': 1,
			'border-radius': '20px',
			'font-size': '15px',
			'font-weight': 'bold'
		};

		const curosrDecorationRenderOption: vscode.DecorationRenderOptions = {
			border: 'solid rgba(0,0,255,0.6)',
			borderWidth: '5px 5px 5px 5px',
			after: {
				contentText: siteLogin,
				backgroundColor: 'rgba(0,0,255,0.6)',
				color: 'rgba(192,192,192,30)',
				textDecoration: `none; ${this.stringifyCssProperties(nameTagStyleRules)}`
			}
		};

		const create = vscode.window.createTextEditorDecorationType;

		return {
			selectionDecoration: create(selectionDecorationRenderOption),
			cursorDecoration: create(curosrDecorationRenderOption)
		};
	}


	private stringifyCssProperties(rules: any) {
		return Object.keys(rules)
			.map((rule) => {
				return `${rule}: ${rules[rule]};`;
			}).join(' ');
	}

	private getCursorRangeFromSelection(selection: Selection): Range {
		const { range: { end, start } } = selection;
		if (selection.reversed) {
			return {
				start: start,
				end: start
			};
		} else {
			return {
				start: end,
				end: end
			};
		}
	}

	private isCursor(selection: Selection): boolean {
		const { start, end } = selection.range;
		return (
			start.column === end.column &&
			start.row === end.row
		);
	}
}
