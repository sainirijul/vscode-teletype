"use strict";

const assert = require('assert');

export default class FakeEditorDelegate {
      selectionsBySiteId: any;
      disposed!: boolean;
      viewport!: { startRow: any; endRow: any; };
        constructor() {
            this.selectionsBySiteId = {};
        }
        dispose() {
            this.disposed = true;
        }
        isDisposed() {
            return this.disposed;
        }
        updateViewport(startRow:any, endRow:any) {
            this.viewport = { startRow, endRow };
        }
        isScrollNeededToViewPosition(position:any) {
            assert(position && position.row !== null && position.column !== null);
            if (this.viewport) {
                const { row } = position;
                return row < this.viewport.startRow || row > this.viewport.endRow;
            }
            else {
                return false;
            }
        }
        getSelectionsForSiteId(siteId:any) {
            console.log("getSelections: " + siteId);
            assert.equal(typeof siteId, 'number', 'siteId must be a number!');
            return this.selectionsBySiteId[siteId];
        }
        updateSelectionsForSiteId(siteId:any, selectionUpdates:any) {
            console.log("updateSelectionsForSiteID: " + siteId);
            assert.equal(typeof siteId, 'number', 'siteId must be a number!');
            let selectionsForSite = this.selectionsBySiteId[siteId];
            if (!selectionsForSite) {
                selectionsForSite = {};
                this.selectionsBySiteId[siteId] = selectionsForSite;
            }
            for (const selectionId in selectionUpdates) {
                const selectionUpdate = selectionUpdates[selectionId];
                if (selectionUpdate) {
                    selectionsForSite[selectionId] = selectionUpdate;
                }
                else {
                    delete selectionsForSite[selectionId];
                }
            }
        }
        clearSelectionsForSiteId(siteId:any) {
            delete this.selectionsBySiteId[siteId];
        }
    }
