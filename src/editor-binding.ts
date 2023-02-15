import * as vscode from 'vscode';
import * as converter from './teletype-converter';
import { EventEmitter } from 'events';
import { EditorProxy, IEditorDelegate, Portal, UpdatePosition } from '@atom/teletype-client';
import { SelectionMap, Selection, Position, Range } from './teletype-types';
import BufferBinding from './buffer-binding';

const bgcolors = ['rgba(0,0,255,0.6)', 'rgba(34,177,76,0.6)', 'rgba(255,127,39,0.6)'];
//const frcolors = ['rgba(192,192,192,30)', 'rgba(192,192,192,30)', 'rgba(192,192,192,30)'];

interface SiteDecoration {
    cursorDecoration: vscode.TextEditorDecorationType;
    selectionDecoration: vscode.TextEditorDecorationType;
}

function doNothing() { }

export interface IEditorProxyExt {
    setEditorBinding(editorBinding: EditorBinding): void;
    getEditorBinding(): EditorBinding;
}

export default class EditorBinding extends vscode.Disposable implements IEditorDelegate {
    public editor: vscode.TextEditor | undefined;
    public readonly title: string;
    // public portal: Portal | undefined;
    private disposed: boolean = false;
    private emitter: EventEmitter;
    private selectionsMarkerLayer: vscode.Selection[];
    // markerLayersBySiteId: Map<number, any>;
    // markersByLayerAndId: WeakMap<number, object>;
    private localSelectionMap: SelectionMap;
    private selectionsBySiteId: any;
    private decorationBySiteId: Map<number, SiteDecoration>;
    private localMarkerSelectionMap: Map<number, SelectionMap>;
    // subscriptions: any;
    preserveFollowState: boolean;
    positionsBySiteId: {};
    // localCursorLayerDecoration: any;
    editorProxy!: EditorProxy;
    // batchedMarkerUpdates: {} | null;
    // isBatchingMarkerUpdates: boolean;
    bufferBinding: BufferBinding;
    public pendingUpdates: any[];
    processOpen: boolean = false;

    constructor(editor: vscode.TextEditor, bufferBinding: BufferBinding, title?: string, /*portal?: Portal,*/ didDispose: Function = doNothing) {
        super(didDispose);

        this.editor = editor;
        this.bufferBinding = bufferBinding;
        this.title = title ?? editor.document.uri.fsPath;
        // this.portal = portal;
        this.emitter = new EventEmitter();
        this.selectionsMarkerLayer = this.editor.selections;
        // this.markerLayersBySiteId = new Map();
        // this.markersByLayerAndId = new WeakMap();
        // this.subscriptions = new CompositeDisposable();
        this.localSelectionMap = {};
        this.selectionsBySiteId = new Map();
        this.decorationBySiteId = new Map();
        this.localMarkerSelectionMap = new Map();
        this.preserveFollowState = false;
        this.positionsBySiteId = {};

        this.pendingUpdates = [];
    }

    // @override
    updateActivePositions(positionsBySiteId: UpdatePosition[]): void {
        positionsBySiteId.forEach(position => {
            // this.updateSelectionsForSiteId(position.editorProxy.siteId, position.position);
        });
    }

    // @override
    async dispose() {
        if (!this.disposed) {
            // if (this.isRemote && this.bufferBinding.fsPath) {
            //   fs.unlinkSync(this.bufferBinding.fsPath);
            // }

            this.disposed = true;
            // this.subscriptions.dispose();

            // this.markerLayersBySiteId.forEach((l) => l.destroy());
            // this.markerLayersBySiteId.clear();
            // if (this.localCursorLayerDecoration) { this.localCursorLayerDecoration.destroy(); }

            // const siteDecoration = this.findSiteDecoration(this.editorProxy.siteId);
            this.decorationBySiteId?.forEach(siteDecoration => {
                this.updateDecorations(siteDecoration, [], []);
            });

            if (!this.editor?.document.isClosed) {
                // if (vscode.window.activeTextEditor !== this.editor){
                //   await vscode.window.showTextDocument(this.editor.document);
                // }
                // await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
            }

            this.emitter.emit('did-dispose');
            this.emitter.removeAllListeners();
        }

        super.dispose();
    }

    public isDisposed() {
        return this.disposed;
    }

    setEditorProxy(editorProxy: EditorProxy) {
        this.editorProxy = editorProxy;
        if (!this.bufferBinding?.bufferProxy?.isHost) {
            // this.isRemote = true;
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

    setTextEditor(editor: vscode.TextEditor | undefined) {
        this.editor = editor;
    }

    // vscode의 editor는 extensible하지 않기 때문에 monkey patch가 안 된다.
    monkeyPatchEditorMethods(editor: any, editorProxy: EditorProxy) {
        // const remoteBuffer = editor.document;
        // const originalRemoteBufferGetPath = remoteBuffer.uri.fsPath;
        // const {bufferProxy} = editorProxy;
        // const hostIdentity = this.portal?.getSiteIdentity(1);
        // const prefix = hostIdentity ? `@${hostIdentity.login}` : 'remote';

        // editor.getTitle = () => `${prefix}: ${path.basename(originalRemoteBufferGetPath())}`;
        // editor.getURI = () => getEditorURI(this.portal.id, editorProxy.id);
        // editor.copy = () => null;
        // editor.serialize = () => null;

        // let remoteEditorCountForBuffer = remoteBuffer.remoteEditorCount || 0;
        // remoteBuffer.remoteEditorCount = ++remoteEditorCountForBuffer;
        // remoteBuffer.getPath = () => `${prefix}:${originalRemoteBufferGetPath()}`;
        // remoteBuffer.save = () => { bufferProxy.requestSave(); };
        // remoteBuffer.isModified = () => false;

        // editor.element.classList.add('teletype-RemotePaneItem');
    }

    editorDidChangeScrollTop(visibleRanges: ReadonlyArray<vscode.Range>) {
        this.editorProxy.didScroll();
        this.emitter.emit('did-scroll');
    }

    editorDidChangeScrollLeft(visibleRanges: ReadonlyArray<vscode.Range>) {
        this.editorProxy.didScroll();
        this.emitter.emit('did-scroll');
    }

    editorDidResize(visibleRanges: ReadonlyArray<vscode.Range>) {
        this.emitter.emit('did-resize');
    }

    onDidScroll(callback: () => void) {
        return this.emitter.on('did-scroll', callback);
    }

    onDidResize(callback: () => void) {
        return this.emitter.on('did-resize', callback);
    }

    public applyUpdate(): void {
        if (this.pendingUpdates.length <= 0) {
            return;
        }

        this.pendingUpdates.forEach(updateUpdate => {
            this.updateDecorations2(updateUpdate.siteDecoration, updateUpdate.cursorRanges, updateUpdate.selectionRanges);
        });

        this.pendingUpdates = [];
    }

    // @override
    updateSelectionsForSiteId(siteId: number, selections: Selection[]) {

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
        if (siteDecoration) {
            this.updateDecorations(siteDecoration, cursorRanges, selectionRanges);
        }
    }

    private updateDecorations(siteDecoration: SiteDecoration, cursorRanges: vscode.Range[], selectionRanges: vscode.Range[]) {
        if (this.editor) {
            this.updateDecorations2(siteDecoration, cursorRanges, selectionRanges);
        } else {
            this.pendingUpdates.push({ siteDecoration, cursorRanges, selectionRanges });
        }
    }

    private updateDecorations2(siteDecoration: SiteDecoration, cursorRanges: vscode.Range[], selectionRanges: vscode.Range[]) {
        if (!this.editor) { return; }

        const { cursorDecoration, selectionDecoration } = siteDecoration;
        this.editor.setDecorations(cursorDecoration, cursorRanges);
        this.editor.setDecorations(selectionDecoration, selectionRanges);
    }

    private findSiteDecoration(siteId: number, isCreate: Boolean = true): SiteDecoration | undefined {
        let siteDecoration = this.decorationBySiteId.get(siteId);
        if (!siteDecoration && isCreate) {
            siteDecoration = this.createDecorationFromSiteId(siteId);
            if (siteDecoration) {
                this.decorationBySiteId.set(siteId, siteDecoration);
            }
        }
        return siteDecoration;
    }

    // @override
    isScrollNeededToViewPosition(position: Position) {
        // const isPositionVisible = this.getDirectionFromViewportToPosition(position) === 'inside';
        // const isEditorAttachedToDOM = document.body.contains(this.editor.element);
        // return isEditorAttachedToDOM && !isPositionVisible;
        return false;
    }

    // // @override
    // updateTether (state: number, position: Position) {
    //   // const localCursorDecorationProperties = {type: 'cursor'};

    //   // if (state === FollowState.RETRACTED) {
    //   //   this.editor.destroyFoldsIntersectingBufferRange(Range(position, position));
    //   //   this.batchMarkerUpdates(() => this.editor.setCursorBufferPosition(position));

    //   //   localCursorDecorationProperties.style = {opacity: 0};
    //   // } else {
    //   //   localCursorDecorationProperties.class = cursorClassForSiteId(this.editorProxy.siteId);
    //   // }

    //   // this.localCursorLayerDecoration.setProperties(localCursorDecorationProperties);
    // }

    getDirectionFromViewportToPosition(bufferPosition: Position) {
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
    clearSelectionsForSiteId(siteId: number) {
        let siteDecoration = this.findSiteDecoration(siteId, false);
        if (siteDecoration) {
            this.updateDecorations(siteDecoration, [], []);
            this.decorationBySiteId.delete(siteId);
        }

        this.localMarkerSelectionMap.delete(siteId);
    }

    relayLocalSelections() {
        // const selectionUpdates = [];
        // const selectionMarkers = this.selectionsMarkerLayer;
        // for (let i = 0; i < selectionMarkers.length; i++) {
        //   const marker = selectionMarkers[i];
        //   selectionUpdates[i] = getSelectionState(marker);
        // }
        // this.editorProxy?.updateSelections(selectionUpdates, {initialUpdate: true});
        this.updateSelections(this.selectionsMarkerLayer, { initialUpdate: true });
    }

    batchMarkerUpdates(fn: Function) {
        // this.batchedMarkerUpdates = {};
        // this.isBatchingMarkerUpdates = true;
        // fn();
        // this.isBatchingMarkerUpdates = false;
        // this.editorProxy?.updateSelections(this.batchedMarkerUpdates);
        // this.batchedMarkerUpdates = null;
    }

    updateSelections(updates: ReadonlyArray<vscode.Selection>, options: {} = {}) {
        // if (this.isBatchingMarkerUpdates) {
        //   Object.assign(this.batchedMarkerUpdates, update);
        // } else {
        this.editorProxy.updateSelections(
            updates.map<any>(update => {
                return {
                    exclusive: true,
                    range: {
                        start: { row: update.start.line, column: update.start.character },
                        end: { row: update.end.line, column: update.end.character },
                    },
                    reversed: false,
                    tailed: false
                };
            }),
            { ...options, isRmoteChange: this.processOpen }
        );
        // }
    }

    private createDecorationFromSiteId(siteId: number): SiteDecoration | undefined {
        const portal = this.editorProxy.portal;
        if (!portal) { return undefined; }

        const siteLogin = portal.getSiteIdentity(siteId);
        if (!(siteLogin as any).decocolors) {
            let bgcolorIdx = -1;
            if ((portal as any).portalBinding) {
                bgcolorIdx = (portal as any).portalBinding.getResIndexBySiteId(siteId);
            }

            (siteLogin as any).decocolors = {
                frcolor: 'rgba(192, 192, 192, 30)',
                bgcolor: (bgcolorIdx >= 0 && bgcolorIdx < 3) ? bgcolors[bgcolorIdx] : `rgba(${(Math.random() * 255).toFixed()}, ${(Math.random() * 255).toFixed()}, ${(Math.random() * 255).toFixed()}, 0.6)`
            };
        }
        const { frcolor, bgcolor } = (siteLogin as any).decocolors;

        const selectionDecorationRenderOption: vscode.DecorationRenderOptions = {
            backgroundColor: bgcolor
        };

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
            border: `solid ${bgcolor}`,
            borderWidth: '5px 5px 5px 5px',
            after: {
                contentText: siteLogin?.login,
                backgroundColor: bgcolor,
                color: frcolor,
                textDecoration: `none; ${this.stringifyCssProperties(nameTagStyleRules)}`
            }
        };

        return {
            selectionDecoration: vscode.window.createTextEditorDecorationType(selectionDecorationRenderOption),
            cursorDecoration: vscode.window.createTextEditorDecorationType(curosrDecorationRenderOption)
        };
    }

    private stringifyCssProperties(rules: any) {
        return Object.keys(rules)
            .map((rule) => {
                return `${rule}: ${rules[rule]};`;
            }).join(' ');
    }

    // editorProxy를 monkey patch 한다.
    public editorProxyMonkeyPatch(): void {
        (this.editorProxy as any).setEditorBinding = (editorBinding: EditorBinding) => {
            (this.editorProxy as any).editorBinding = editorBinding;
        };
        (this.editorProxy as any).getEditorBinding = (): EditorBinding => {
            return (this.editorProxy as any).editorBinding;
        };
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

function getSelectionState(marker: vscode.Selection): any {
    return {
        range: {
            start: { row: marker.start.line, column: marker.start.character },
            end: { row: marker.end.line, column: marker.end.character }
        },
        reversed: marker.isReversed
    };
}

function cursorClassForSiteId(siteId: number, blink: boolean = false) {
    let className = 'ParticipantCursor--site-' + siteId;
    if (blink === false) { className += ' non-blinking'; }
    return className;
}

// function subscribeToResizeEvents (element, callback: Function) {
//   const resizeObserver = new ResizeObserver(callback);
//   resizeObserver.observe(element);
//   return new Disposable(() => resizeObserver.disconnect());
// }

export function createEditorBinding(editor: vscode.TextEditor, editorProxy: EditorProxy, bufferBinding: BufferBinding, didDispose: () => void): EditorBinding {
    // const bufferBinding = this.bufferBindingsByUri.get(editor.document.uri.toString());
    // if (!bufferBinding) { return undefined; }

    const editorBinding = new EditorBinding(editor, bufferBinding, undefined, didDispose);

    editorBinding.setEditorProxy(editorProxy);
    editorProxy.setDelegate(editorBinding);

    // editorProxy monkey patch 한다.
    editorBinding.editorProxyMonkeyPatch();

    (editorProxy as unknown as IEditorProxyExt).setEditorBinding(editorBinding);

    return editorBinding;
}
