import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { SelectionMap, Selection, Position, Range} from './teletype-types';
import { EditorProxy, IPortalDelegate, Portal, TeletypeClient } from "@atom/teletype-client";
import WorkspaceManager from './workspace-manager';

export interface IPortalBinding {
    portal?: Portal;
}

export class PortalBinding extends vscode.Disposable implements IPortalBinding {
    portal?: Portal;
    lastUpdateTetherPromise: Promise<void>;
    emitter: EventEmitter;

    constructor (public workspaceManager: WorkspaceManager, public client: TeletypeClient, didDispose: Function) {
        super(didDispose);
        this.lastUpdateTetherPromise = Promise.resolve();
        this.emitter = new EventEmitter();
    }

    // @override
    dispose(): any {
        this.workspaceManager.removeDocuments(this.portal?.id);
        this.portal = undefined;
        return super.dispose();        
    }

    close () {
        if (this.portal) {
            this.portal.dispose();
        }
    }

  // @override
  updateActivePositions (positionsBySiteId: Position[]) {
    // this.sitePositionsComponent.update({positionsBySiteId});
  }

  // @override
  updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
    if (editorProxy) {
      this.lastUpdateTetherPromise = this.lastUpdateTetherPromise.then(() =>
        this._updateTether(followState, editorProxy, position)
      );
    }

    return this.lastUpdateTetherPromise;
  }

  async _updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
  }

  // Private
//   async _updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
//     if (followState === FollowState.RETRACTED) {
//       this.shouldRelayActiveEditorChanges = false;
//       const editor = await this.workspaceManager.findOrCreateEditorForEditorProxy(editorProxy, this.portal);
//       if (editor) {
//         // await this.openPaneItem(editor);
//         vscode.window.showTextDocument(editor.document);
//       }
//       this.shouldRelayActiveEditorChanges = true;
//     } else {
//       if (position) { 
//         this.workspaceManager.getEditorBindings().forEach(editorBinding => {
//           editorBinding.updateTether(followState, position);
//         }); 
//       }
//     }

//     const editorBinding = this.workspaceManager.getEditorBindingByEditorProxy(editorProxy);
//     if (editorBinding && position) {
//       editorBinding.updateTether(followState, position);
//     }
//   }

//   // Private
//   _updateTether (followState: number, editorProxy: EditorProxy, position: Position) {
//     if (followState === FollowState.RETRACTED) {
//       const editorBinding = this.workspaceManager.getEditorBindingByEditorProxy(editorProxy);
//       // await vscode.workspace.openTextDocument(editorBinding?.editor, {searchAllPanes: true});
//       if (position) { 
//         editorBinding?.updateTether(followState, position); 
//       }
//     } else {
//       if (position) { 
//         this.workspaceManager.getEditorBindings().forEach(editorBinding => {
//           editorBinding.updateTether(followState, position);
//         });
//       }
//     }
//   }

  onDidChange(callback: (event: any) => void) {
    return this.emitter.on('did-change', callback);
  }
}
