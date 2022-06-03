import * as vscode from 'vscode';
import * as converter from './teletype-converter';
import {EventEmitter} from 'events';
import {EditorProxy, IEditorDelegate, Portal} from '@atom/teletype-client';
import {SelectionMap, Selection, Position, Range} from './teletype-types';

/* global ResizeObserver */

import path = require('path');
// const {Range, Emitter, Disposable, CompositeDisposable, TextBuffer} = require('atom')
import { getEditorURI } from './uri-helpers';
import { FollowState } from '@atom/teletype-client';

interface SiteDecoration {
	cursorDecoration: vscode.TextEditorDecorationType;
	selectionDecoration: vscode.TextEditorDecorationType;
}

export default class EditorBinding implements IEditorDelegate {
	public readonly editor: vscode.TextEditor;
  public readonly buffer: vscode.TextDocument;
	private portal: Portal | undefined;
	private readonly isHost: boolean;
  private disposed: boolean = false;
  private emitter: EventEmitter;
  // selectionsMarkerLayer: any;
  // markerLayersBySiteId: Map<number, any>;
  // markersByLayerAndId: WeakMap<number, object>;
	private localSelectionMap: SelectionMap;
	private selectionsBySiteId: any;
	private decorationBySiteId: Map<number, SiteDecoration>;
	private localMarkerSelectionMap: Map<number, SelectionMap>;
  // subscriptions: any;
  preserveFollowState: boolean;
  positionsBySiteId: {};
  localCursorLayerDecoration: any;
  editorProxy!: EditorProxy;
  // batchedMarkerUpdates: {} | null;
  // isBatchingMarkerUpdates: boolean;
  isRemote: boolean = false;

  constructor (editor: vscode.TextEditor, portal: Portal | undefined, isHost: boolean) {
    this.editor = editor;
    this.buffer = editor.document;
    this.portal = portal;
    this.isHost = isHost;
    this.emitter = new EventEmitter();
    // this.selectionsMarkerLayer = this.editor.selectionsMarkerLayer.bufferMarkerLayer;
    // this.markerLayersBySiteId = new Map();
    // this.markersByLayerAndId = new WeakMap();
    // this.subscriptions = new CompositeDisposable();
		this.localSelectionMap = {};
		this.selectionsBySiteId = new Map();
		this.decorationBySiteId = new Map();
		this.localMarkerSelectionMap = new Map();
    this.preserveFollowState = false;
    this.positionsBySiteId = {};
  }

  // @override
  updateActivePositions(positionsBySiteId: Position[]): void {

  }

  // @override
  dispose () {
    if (this.disposed) { return; }

    this.disposed = true;
    // this.subscriptions.dispose();

    // this.markerLayersBySiteId.forEach((l) => l.destroy());
    // this.markerLayersBySiteId.clear();
    if (this.localCursorLayerDecoration) { this.localCursorLayerDecoration.destroy(); }

    this.emitter.emit('did-dispose');
    // this.emitter.dispose();
  }

	public isDisposed() {
		return this.disposed;
	}

  setEditorProxy (editorProxy: EditorProxy) {
    this.editorProxy = editorProxy;
    if (!this.isHost) {
      this.monkeyPatchEditorMethods(this.editor, this.editorProxy);
    }

    // this.localCursorLayerDecoration = this.editor.decorateMarkerLayer(
    //   this.selectionsMarkerLayer,
    //   {type: 'cursor', class: cursorClassForSiteId(editorProxy.siteId)}
    // );

    // const markers = this.selectionsMarkerLayer.getMarkers();
    // for (let i = 0; i < markers.length; i++) {
    //   this.observeMarker(markers[i], false);
    // }
    
    // this.subscriptions.add(this.selectionsMarkerLayer.onDidCreateMarker(this.observeMarker.bind(this)));
    // this.subscriptions.add(this.editor.element.onDidChangeScrollTop(this.editorDidChangeScrollTop.bind(this)));
    // this.subscriptions.add(this.editor.element.onDidChangeScrollLeft(this.editorDidChangeScrollLeft.bind(this)));
    // this.subscriptions.add(subscribeToResizeEvents(this.editor.element, this.editorDidResize.bind(this)));
    this.relayLocalSelections();
  }

  monkeyPatchEditorMethods (editor: vscode.TextEditor, editorProxy: EditorProxy) {
    const remoteBuffer = editor.document;
    const originalRemoteBufferGetPath = remoteBuffer.uri.fsPath;
    const {bufferProxy} = editorProxy;
    const hostIdentity = this.portal?.getSiteIdentity(1);
    const prefix = hostIdentity ? `@${hostIdentity.login}` : 'remote';

    // editor.getTitle = () => `${prefix}: ${path.basename(originalRemoteBufferGetPath())}`;
    // editor.getURI = () => getEditorURI(this.portal.id, editorProxy.id);
    // editor.copy = () => null;
    // editor.serialize = () => null;
    this.isRemote = true;

    // let remoteEditorCountForBuffer = remoteBuffer.remoteEditorCount || 0;
    // remoteBuffer.remoteEditorCount = ++remoteEditorCountForBuffer;
    // remoteBuffer.getPath = () => `${prefix}:${originalRemoteBufferGetPath()}`;
    //remoteBuffer.save = () => { bufferProxy.requestSave(); };
    // remoteBuffer.isModified = () => false;

    // editor.element.classList.add('teletype-RemotePaneItem');
  }

  // observeMarker (marker: Marker, relay: boolean = true) {
  //   if (marker.isDestroyed()) { return; }

  //   const didChangeDisposable = marker.onDidChange(({textChanged}) => {
  //     if (textChanged) {
  //       if (marker.getRange().isEmpty()) { marker.clearTail(); }
  //     } else {
  //       this.updateSelections({
  //         [marker.id]: getSelectionState(marker)
  //       });
  //     }
  //   });
  //   const didDestroyDisposable = marker.onDidDestroy(() => {
  //     didChangeDisposable.dispose();
  //     didDestroyDisposable.dispose();
  //     // this.subscriptions.remove(didChangeDisposable);
  //     // this.subscriptions.remove(didDestroyDisposable);

  //     this.updateSelections({
  //       [marker.id]: null
  //     });
  //   });
  //   // this.subscriptions.add(didChangeDisposable);
  //   // this.subscriptions.add(didDestroyDisposable);

  //   if (relay) {
  //     this.updateSelections({
  //       [marker.id]: getSelectionState(marker)
  //     });
  //   }
  // }

  async editorDidChangeScrollTop () {
    // const {element} = this.editor;
    // await element.component.getNextUpdatePromise();
    this.editorProxy.didScroll();
    this.emitter.emit('did-scroll');
  }

  async editorDidChangeScrollLeft () {
    // const {element} = this.editor;
    // await element.component.getNextUpdatePromise();
    this.editorProxy.didScroll();
    this.emitter.emit('did-scroll');
  }

  async editorDidResize () {
    // const {element} = this.editor;
    // await element.component.getNextUpdatePromise();
    this.emitter.emit('did-resize');
  }

	onDidDispose(callback: { (): void; (...args: any[]): void; }) {
    return this.emitter.on('did-dispose', callback);
  }

  onDidScroll (callback: any) {
    return this.emitter.on('did-scroll', callback);
  }

  onDidResize (callback: any) {
    return this.emitter.on('did-resize', callback);
  }

  // @override
  updateSelectionsForSiteId (siteId: number, selections: Selection[]) {
    // let markerLayer = this.markerLayersBySiteId.get(siteId);
    // if (!markerLayer) {
    //   markerLayer = this.editor.addMarkerLayer();
    //   this.editor.decorateMarkerLayer(markerLayer, {type: 'cursor', class: cursorClassForSiteId(siteId, {blink: false})});
    //   this.editor.decorateMarkerLayer(markerLayer, {type: 'highlight', class: 'selection'});
    //   this.markerLayersBySiteId.set(siteId, markerLayer);
    // }

    // let markersById = this.markersByLayerAndId.get(markerLayer);
    // if (!markersById) {
    //   markersById = new Map();
    //   this.markersByLayerAndId.set(markerLayer, markersById);
    // }

    // let maxMarkerId: number = 0;
    // for (let markerId in selections) {
    //   const markerUpdate = selections[markerId];
    //   const numMarkerId = parseInt(markerId);
    //   let marker = markersById.get(numMarkerId);

    //   if (markerUpdate) {
    //     maxMarkerId = maxMarkerId ? Math.max(maxMarkerId, numMarkerId) : numMarkerId;

    //     const {start, end} = markerUpdate.range;
    //     const newRange = new vscode.Range(start, end);
    //     if (marker) {
    //       marker.setBufferRange(newRange, {reversed: markerUpdate.reversed});
    //     } else {
    //       marker = markerLayer.markBufferRange(newRange, {invalidate: 'never', reversed: markerUpdate.reversed});
    //       marker.bufferMarker.onDidChange((textChanged) => {
    //         if (textChanged && marker.getBufferRange().isEmpty()) {
    //           marker.clearTail();
    //         }
    //       });

    //       markersById.set(markerId, marker);
    //     }

    //     if (newRange.isEmpty()) { marker.clearTail(); }
    //   } else {
    //     marker.destroy();
    //     markersById.delete(markerId);
    //   }
    // }
		let selectionsForSite = this.localMarkerSelectionMap.get(siteId);
		const selectionMap = { ...selectionsForSite, ...selections };
		this.localMarkerSelectionMap.set(siteId, selectionMap);
		let selectionRanges: vscode.Range[] = [];
		let cursorRanges: vscode.Range[] = [];
		if (!selectionsForSite) {
			selectionsForSite = {};
			this.selectionsBySiteId[siteId] = selectionsForSite;
		}
		for (const selectionId in selections) {
			const selectionUpdate = selections[selectionId];
			if (selectionUpdate) {
				selectionsForSite[selectionId] = selectionUpdate;
				if (isCursor(selectionUpdate)) {
					cursorRanges = cursorRanges.concat(converter.convertToVSCodeRange(selectionUpdate.range));
				} else {
					if (selectionUpdate.tailed) {
						const cursorRange = getCursorRangeFromSelection(selectionUpdate);
						cursorRanges = cursorRanges.concat(converter.convertToVSCodeRange(cursorRange));
					}
					selectionRanges = selectionRanges.concat(converter.convertToVSCodeRange(selectionUpdate.range));
				}
			}
			else {
				delete selectionsForSite[selectionId];
			}
		}
		let siteDecoration = this.findSiteDecoration(siteId);
		this.updateDecorations(siteDecoration, cursorRanges, selectionRanges);
  }

	private async updateDecorations(siteDecoration: SiteDecoration, cursorRanges: vscode.Range[], selectionRanges: vscode.Range[]) {
		const { cursorDecoration, selectionDecoration } = siteDecoration;
    // const { bufferProxy } = this.editorProxy;
    const editor = await vscode.window.showTextDocument(this.buffer);
		editor.setDecorations(cursorDecoration, cursorRanges);
		editor.setDecorations(selectionDecoration, selectionRanges);
	}

	private findSiteDecoration(siteId: number) {
		let siteDecoration = this.decorationBySiteId.get(siteId);
		if (!siteDecoration) {
			siteDecoration = this.createDecorationFromSiteId(siteId);
			this.decorationBySiteId.set(siteId, siteDecoration);
		}
		return siteDecoration;
	}

  // @override
  isScrollNeededToViewPosition (position: Position) {
    // const isPositionVisible = this.getDirectionFromViewportToPosition(position) === 'inside';
    // const isEditorAttachedToDOM = document.body.contains(this.editor.element);
    // return isEditorAttachedToDOM && !isPositionVisible;
    return false;
  }

  // @override
  public updateTether (state: number, position: Position) {
    // const localCursorDecorationProperties = {type: 'cursor'};

    // if (state === FollowState.RETRACTED) {
    //   this.editor.destroyFoldsIntersectingBufferRange(Range(position, position));
    //   this.batchMarkerUpdates(() => this.editor.setCursorBufferPosition(position));

    //   localCursorDecorationProperties.style = {opacity: 0};
    // } else {
    //   localCursorDecorationProperties.class = cursorClassForSiteId(this.editorProxy.siteId);
    // }

    // this.localCursorLayerDecoration.setProperties(localCursorDecorationProperties);
  }

  getDirectionFromViewportToPosition (bufferPosition: Position) {
    // const {element} = this.editor;
    // if (!document.contains(element)) { return; }

    // const {row, column} = this.editor.screenPositionForBufferPosition(bufferPosition);
    // const top = element.component.pixelPositionAfterBlocksForRow(row);
    // const left = column * this.editor.getDefaultCharWidth();

    // if (top < element.getScrollTop()) {
    //   return 'upward';
    // } else if (top >= element.getScrollBottom()) {
    //   return 'downward';
    // } else if (left < element.getScrollLeft()) {
    //   return 'leftward';
    // } else if (left >= element.getScrollRight()) {
    //   return 'rightward';
    // } else {
    //   return 'inside';
    // }
  }

  // @override
  clearSelectionsForSiteId (siteId: number) {
    // const markerLayer = this.markerLayersBySiteId.get(siteId);
    // if (markerLayer) { markerLayer.destroy(); }
    // this.markerLayersBySiteId.delete(siteId);
    // this.markersByLayerAndId.delete(markerLayer);
  }

  relayLocalSelections () {
    // const selectionUpdates = {};
    // const selectionMarkers = this.selectionsMarkerLayer.getMarkers();
    // for (let i = 0; i < selectionMarkers.length; i++) {
    //   const marker = selectionMarkers[i];
    //   selectionUpdates[marker.id] = getSelectionState(marker);
    // }
    // this.editorProxy?.updateSelections(selectionUpdates, {initialUpdate: true});
  }

  batchMarkerUpdates (fn: Function) {
    // this.batchedMarkerUpdates = {};
    // this.isBatchingMarkerUpdates = true;
    // fn();
    // this.isBatchingMarkerUpdates = false;
    // this.editorProxy?.updateSelections(this.batchedMarkerUpdates);
    // this.batchedMarkerUpdates = null;
  }

  updateSelections (updates: ReadonlyArray<vscode.Selection>) {
    // if (this.isBatchingMarkerUpdates) {
    //   Object.assign(this.batchedMarkerUpdates, update);
    // } else {
      this.editorProxy.updateSelections(
        [
          {
            exclusive: true,
            range: {
              start: {row: updates[0].start.line, column: updates[0].start.character},
              end: {row: updates[0].end.line, column: updates[0].end.character},
            },
            reversed: false,
            tailed: false
          }
        ]
      );
    // }
  }

  // toggleFollowingForSiteId (siteId: number) {
  //   // portal이 아니라 editorProxy가 맞나???
  //   // if (siteId === this.editorProxy?.getFollowedSiteId()) {
  //   //   this.editorProxy?.unfollow();
  //   // } else {
  //   //   this.editorProxy?.follow(siteId);
  //   // }
  //   if (siteId === this.portal?.getFollowedSiteId()) {
  //     this.portal?.unfollow();
  //   } else {
  //     this.portal?.follow(siteId);
  //   }
  // }

	private createDecorationFromSiteId(siteId: number): SiteDecoration {
		const selectionDecorationRenderOption: vscode.DecorationRenderOptions = {
			backgroundColor: `rgba(0,0,255,0.6)`
		};

		const { login: siteLogin } = this.portal?.getSiteIdentity(siteId);

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
}

function isCursor(selection: Selection): boolean {
  const { start, end } = selection.range;
  return (
    start.column === end.column &&
    start.row === end.row
  );
}

function getCursorRangeFromSelection(selection: Selection): Range {
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

function getSelectionState (marker: any) {
  return {
    range: marker.getRange(),
    exclusive: marker.isExclusive(),
    reversed: marker.isReversed()
  };
}

function cursorClassForSiteId (siteId: number, blink: boolean = false) {
  let className = 'ParticipantCursor--site-' + siteId;
  if (blink === false) { className += ' non-blinking'; }
  return className;
}

// function subscribeToResizeEvents (element, callback: Function) {
//   const resizeObserver = new ResizeObserver(callback);
//   resizeObserver.observe(element);
//   return new Disposable(() => resizeObserver.disconnect());
// }
