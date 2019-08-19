import * as vscode from 'vscode';
import {Portal} from '@atom/teletype-client';
import {EditorProxy} from '@atom/teletype-client';

import { SelectionMap, Selection, Position, Range } from './teletype_types';

enum RangeType {
	Cursor,
	Selection
}

interface SiteDecoration {
	cursorDecoration : vscode.TextEditorDecorationType;
	selectionDecoration : vscode.TextEditorDecorationType;
}

export default class EditorBinding {
	public readonly editor : vscode.TextEditor;

	private portal : Portal;
	private readonly isHost : boolean;
	private editorProxy: EditorProxy = new EditorProxy;
	private localSelectionMap : SelectionMap;
	// private localSelection : Selection;

	private selectionRangesBySiteId : Map<number, vscode.Range[]>;
	private cursorRangesBySiteId : Map<number, vscode.Range[]>;
	private decorationBySiteId : Map<number, SiteDecoration>;
	private localMarkerSelectionMap : Map<number, SelectionMap>;

	private preserveFollowState:any;
	private positionsBySiteId:any;

	constructor (editor:any, portal:any, isHost:any) {
		this.editor = editor;
		this.portal = portal;
		this.isHost = isHost;

		this.preserveFollowState = false;
		this.localSelectionMap = {};
		this.positionsBySiteId = {};

		this.selectionRangesBySiteId = new Map();
		this.cursorRangesBySiteId = new Map();
		this.decorationBySiteId = new Map();
		this.localMarkerSelectionMap = new Map();
	}

	dispose () {
		// TODO:
	}

	onDidDispose (onDidDipose:any) {
		// TODO: bind depose callback
		this.onDidDispose = onDidDipose;
	}

	setEditorProxy (editorProxy : EditorProxy) {
		this.editorProxy = editorProxy;
	}

	updateSelectionsForSiteId (siteId : number, selections : SelectionMap) {
		let oldSelectionMap = this.localMarkerSelectionMap.get(siteId);
		const selectionMap = {...oldSelectionMap, ...selections};
		this.localMarkerSelectionMap.set(siteId, selectionMap);
		let cursorRanges : vscode.Range[] = [];
		let selectionRanges : vscode.Range[] = [];
		// Object.keys(selectionMap).forEach(markerId => {
		// 	const selection = selectionMap[parseInt(markerId)];
		// 	if (selection) {
		// 		if (this.isCursor(selection)) {
		// 			cursorRanges = cursorRanges.concat(this.convertTeletypeRange(selection.range));
		// 		} else {
		// 			if (selection.tailed) {
		// 				const cursorRange = this.getCursorRangeFromSelection(selection);
		// 				cursorRanges = cursorRanges.concat(this.convertTeletypeRange(cursorRange));
		// 			}
		// 			selectionRanges = selectionRanges.concat(this.convertTeletypeRange(selection.range));
		// 		}
		// 	}
		// });

		let siteDecoration = this.findOrCreateSiteDecoration(siteId);
		this.updateDecorations(siteDecoration, cursorRanges, selectionRanges);
	}

	private updateDecorations(siteDecoration: SiteDecoration, cursorRanges: vscode.Range[], selectionRanges: vscode.Range[]) {
		const { cursorDecoration, selectionDecoration } = siteDecoration;
		this.editor.setDecorations(cursorDecoration, cursorRanges);
		this.editor.setDecorations(selectionDecoration, selectionRanges);
	}

	private findOrCreateSiteDecoration(siteId: number) {
		let siteDecoration = this.decorationBySiteId.get(siteId);
		if (!siteDecoration) {
			siteDecoration = this.createDecorationFromSiteId(siteId);
			this.decorationBySiteId.set(siteId, siteDecoration);
		}
		return siteDecoration;
	}

	isScrollNeededToViewPosition (position:any) {

	}

	updateTether (state:any, position:any) {
	}

	/**
	 * Clear site selections when site did leave portal
	 */
	clearSelectionsForSiteId (siteId:any) {
		const siteDecoration = this.findOrCreateSiteDecoration(siteId);
		this.updateDecorations(siteDecoration, [], []);
	}

	updateSelections (selections : vscode.Selection[]) {
		this.processSelections(selections);
		this.editorProxy.updateSelections(this.localSelectionMap);
	}

	/**
	 * Convert vscode selections to meet teletype selection
	 * @param selections
	 */
	private processSelections(selections : vscode.Selection[]) {
		const currentSelectionKeys = Object.keys(this.localSelectionMap);
		const newSelectionsLength = selections.length;

		// set new selections
		selections.forEach((selection, index) => {
			this.localSelectionMap[index] = {
				range: {
					start: this.convertVSCodePosition(selection.start),
					end: this.convertVSCodePosition(selection.end)
				},
				reversed: selection.isReversed,
			};
		});

		// unset old selections
		if (currentSelectionKeys.length > newSelectionsLength) {
			for (let index = newSelectionsLength; index < currentSelectionKeys.length; index += 1) {
				// this.localSelectionMap[index] = this.localSelection;
			}
		}
	}

	private convertVSCodePosition (position : vscode.Position) : Position {
		return {
			column: position.character,
			row: position.line
		};
	}

	private convertTeletypePosition (position : Position) : vscode.Position {
		return new vscode.Position(
			position.row,
			position.column
		);
	}

	private convertTeletypeRange (range : Range) : vscode.Range {
		return new vscode.Range(
			this.convertTeletypePosition(range.start),
			this.convertTeletypePosition(range.end)
		);
	}

	private createDecorationFromSiteId (siteId : number) : SiteDecoration {
		// TODO: get unique color for each site Id

		const selectionDecorationRenderOption : vscode.DecorationRenderOptions = {
			backgroundColor: `rgba(123, 0, 0, 0.5)`
		};

		const {login: siteLogin} = this.portal.getSiteIdentity(siteId);

		const nameTagStyleRules = {
			position: 'absolute',
			top: '1rem',
			'border-radius': '0.15rem',
			padding: '0px 0.5ch',
			display: 'inline-block',
			'pointer-events': 'none',
			'font-size': '0.7rem',
			'z-index': 1,
			'font-weight': 'bold'
		};

		const curosrDecorationRenderOption : vscode.DecorationRenderOptions = {
			border: 'solid rgba(123, 0, 0, 1)',
			borderWidth: '0 1.5px 0 0',
			after: {
				contentText: siteLogin,
				backgroundColor: 'rgba(123, 0, 0, 1)',
				color: 'rgba(255, 255, 255, 1)',
				textDecoration: `none; ${this.stringifyCssProperties(nameTagStyleRules)}`
			}
		};

		const create = vscode.window.createTextEditorDecorationType;

		return {
			selectionDecoration: create(selectionDecorationRenderOption),
			cursorDecoration: create(curosrDecorationRenderOption)
		};
	}

	// taken from VSLive Share 😂
	private stringifyCssProperties(rules:any) {
		return Object.keys(rules)
				.map((rule) => {
				return `${rule}: ${rules[rule]};`;
		}).join(' ');
	}

	private getCursorRangeFromSelection (selection : Selection) : Range {
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

	private isCursor (selection : Selection) : boolean {
		const { start, end } = selection.range;
		return (
			start.column === end.column &&
			start.row === end.row
		);
	}
}
