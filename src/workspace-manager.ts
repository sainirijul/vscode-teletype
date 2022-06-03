import * as vscode from 'vscode';
import {EventEmitter} from 'events';
//const {CompositeDisposable, Emitter, TextEditor, TextBuffer} = require('atom');
import { SelectionMap, Selection, Position, Range} from './teletype-types';
import {BufferProxy, EditorProxy, Errors, FollowState, TeletypeClient, Portal, IPortalDelegate, EditorProxyMetadata} from '@atom/teletype-client';
import BufferBinding from './buffer-binding';
import EditorBinding from './editor-binding';
import NotificationManager from './notification-manager';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const NOOP = () => {};

export default class WorkspaceManager {
  public bufferBindingsByBuffer : Map<vscode.TextDocument, BufferBinding>;
  public bufferBindingsByBufferProxy : Map<BufferProxy, BufferBinding>;
	// public editorBindingsByEditor : Map<vscode.TextEditor, EditorBinding>;
	public editorBindingsByEditorDocument : Map<vscode.TextDocument, EditorBinding>;
  public editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;

  private emitter: EventEmitter;
  private notificationManager?: NotificationManager;

  constructor (notificationManager?: NotificationManager) {  
    // this.workspace = workspace;
    this.bufferBindingsByBufferProxy = new Map();
    this.editorBindingsByEditorProxy = new Map();
		this.bufferBindingsByBuffer = new Map();
    // this.editorBindingsByEditor = new Map();
    this.editorBindingsByEditorDocument = new Map();
    this.emitter = new EventEmitter();
    this.notificationManager = notificationManager;
  }

  public async initialize () {
    this.registerWorkspaceEvents();
    return true;
  }

  dspose () {
    // this.emitter = this.DidDispose();
  }

  didDispose () {
  }

  didChangeEditorProxies () {}

  public addEditor(editor: vscode.TextEditor, portal: Portal, isHost: boolean, bufferProxy?: BufferProxy | null, editorProxy?: EditorProxy | undefined): EditorProxy | undefined {
    if (!bufferProxy) {
      bufferProxy = this.findOrCreateBufferProxyForBuffer(editor.document, editor, portal);
      if (!bufferProxy) {
        this.notificationManager?.addError('bufferProxy create failed.');
        return undefined;
      }
    }
    
    const editorBinding = new EditorBinding(editor, portal, isHost);
    if (!editorProxy){
      editorProxy = portal.createEditorProxy({bufferProxy});
    }
    editorProxy?.setDelegate(editorBinding);
    editorBinding.setEditorProxy(editorProxy);

    this.editorBindingsByEditorDocument.set(editor.document, editorBinding);
    this.editorBindingsByEditorProxy.set(editorProxy, editorBinding);

    editorBinding?.onDidDispose(() => {
      //   didDestroyEditorSubscription.dispose();
         this.editorBindingsByEditorDocument.delete(editor.document);
         if (editorProxy) {
           this.editorBindingsByEditorProxy.delete(editorProxy);
         }
         this.emitter.emit('did-change');
    });

    this.emitter.emit('did-change');

    return editorProxy;
  }

  public findOrCreateBufferProxyForBuffer (buffer: vscode.TextDocument, editor: vscode.TextEditor, portal?: Portal) : BufferProxy | null {
    let bufferBinding = this.bufferBindingsByBuffer.get(buffer);
    if (bufferBinding) {
      return bufferBinding.bufferProxy;
    } else if (portal) {
      bufferBinding = new BufferBinding(buffer, editor, true);
      const bufferProxy = portal.createBufferProxy({
        uri: bufferBinding.getBufferProxyURI(),
        text: buffer.getText(),
        // history: {baseText: buffer.getText(), nextCheckpointId: 0, undoStack: null, redoStack: null} // buffer.getHistory()
      });
      if (bufferProxy) {
        bufferBinding.setBufferProxy(bufferProxy);
        bufferProxy.setDelegate(bufferBinding);

        this.bufferBindingsByBuffer.set(buffer, bufferBinding);

        return bufferProxy;
      } else {
        this.notificationManager?.addError('Portal.createBufferProxy() failed');
      }
    }

    return null;
  }
  
  public async findOrCreateEditorProxyForEditor (editor: vscode.TextEditor, portal: Portal | undefined) : Promise<EditorProxy | undefined> {
    let editorBinding = this.editorBindingsByEditorDocument.get(editor.document);
    if (editorBinding) {
      return editorBinding.editorProxy;
    } else {
      if (portal) {
        const editorProxy = this.addEditor(editor, portal, true, null);
        return editorProxy;
      }
    }
    return undefined;
  }

  public async findOrCreateEditorForEditorProxy (editorProxy: EditorProxy, portal?: Portal) : Promise<vscode.TextEditor | undefined> {
    let editor: vscode.TextEditor | undefined;
    let editorBinding = this.editorBindingsByEditorProxy.get(editorProxy);
    if (editorBinding) {
      editor = editorBinding.editor;
    } else {
      const {bufferProxy} = editorProxy;
      const buffer = await this.findOrCreateBufferForBufferProxy(bufferProxy, portal?.id);
      if (buffer && portal) {
        const document = await vscode.workspace.openTextDocument(buffer.uri);
        editor = await vscode.window.showTextDocument(document);
        if (editor) {
          this.addEditor(editor, portal, false, bufferProxy, editorProxy);
          // editorBinding = new EditorBinding(editor, portal, false);
          // editorBinding.setEditorProxy(editorProxy);
          // editorProxy.setDelegate(editorBinding);

          // this.editorBindingsByEditor.set(editor, editorBinding);
          // this.editorBindingsByEditorProxy.set(editorProxy, editorBinding);
          // // this.editorProxiesByEditor.set(editor, editorProxy);

          // // const didDestroyEditorSubscription = vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => editorBinding.dispose());
          // editorBinding.onDidDispose(() => {
          // //   didDestroyEditorSubscription.dispose();

          // //   const isRetracted = this.portal?.resolveFollowState() === FollowState.RETRACTED;
          // //   this.shouldRelayActiveEditorChanges = !isRetracted;
          // //   editor.close();
          // //   this.shouldRelayActiveEditorChanges = true;

          //   this.editorBindingsByEditor.delete(editor);
          //   // this.editorProxiesByEditor.delete(editor);
          //   this.editorBindingsByEditorProxy.delete(editorProxy);
          // });
        }
      }
    }

    return editor;
  }

  private async findOrCreateBufferForBufferProxy (bufferProxy: BufferProxy, portalId?: string) : Promise<vscode.TextDocument | undefined>{
		let buffer : vscode.TextDocument | undefined;
    let bufferBinding = this.bufferBindingsByBufferProxy.get(bufferProxy);
    if (bufferBinding) {
      buffer = bufferBinding.buffer;
    } else {
      if (!portalId) { return undefined; }
			//const filePath = path.join(os.tmpdir(), portalId, bufferProxy.uri);
			const filePath = path.join(os.tmpdir(), portalId, bufferProxy.uri.replace('\\', '/'));      
			const bufferURI = vscode.Uri.file(filePath);
			await require('mkdirp-promise')(path.dirname(filePath));
			fs.writeFileSync(filePath, '');

			buffer = await vscode.workspace.openTextDocument(bufferURI);
			const editor = await vscode.window.showTextDocument(buffer);
      bufferBinding = new BufferBinding(
        buffer, editor, false, () => this.bufferBindingsByBufferProxy.delete(bufferProxy)
      );

      bufferBinding.setBufferProxy(bufferProxy);
      bufferProxy.setDelegate(bufferBinding);

      this.bufferBindingsByBufferProxy.set(bufferProxy, bufferBinding);
			this.bufferBindingsByBuffer.set(buffer, bufferBinding);
    }
    return buffer;
  }

  hasPaneItem(paneItem: vscode.TextEditor) : boolean {
    // return this.editorProxiesByEditor.has(paneItem);
    return this.editorBindingsByEditorDocument.has(paneItem.document);
  }

  // getActivePaneItem() : vscode.TextEditor {
  //   return this.newActivePaneItem || vscode.window.activeTextEditor;
  // }

  onDidChange(callback: () => void) {
    return this.emitter.on('did-change', callback);
  }

	private registerWorkspaceEvents () {
		vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this));
		vscode.workspace.onWillSaveTextDocument(this.saveDocument.bind(this));
		vscode.window.onDidChangeTextEditorSelection(this.triggerSelectionChanges.bind(this));
    vscode.window.onDidChangeTextEditorVisibleRanges(this.triggerViewRangeChanges.bind(this));

      // vscode.window.onDidChangeActiveTextEditor((e) => {
      //   const editor = e as vscode.TextEditor;
      //   this.didChangeActiveTextEditor(editor);
      // });
      // vscode.workspace.onDidOpenTextDocument(async (e) => {
      //   const editor = await vscode.window.showTextDocument(e);
      //   this.didAddTextEditor(editor);
      // });

    vscode.workspace.onDidCloseTextDocument(async (e) => {
      this.didRemoveTextEditor(e);
    });
	}

	private onDidChangeTextDocument (event : vscode.TextDocumentChangeEvent) {
		if (this.bufferBindingsByBuffer) {
			const bufferBinding = this.bufferBindingsByBuffer.get(event.document);
			if (bufferBinding) {
        if(!bufferBinding.isUpdating) {
				  const doc = bufferBinding.changeBuffer(event.contentChanges);
			  } else {
          bufferBinding.isUpdating = false;
        }
      }
		}
	}

  // private didAddTextEditor (editor: vscode.TextEditor) {
  //   if (!this.editorBindingsByEditor.get(editor)?.isRemote) {
  //     this.findOrCreateEditorProxyForEditor(editor); 
  //   }
  // }

  private didRemoveTextEditor (buffer: vscode.TextDocument) {
    const bufferBiding = this.bufferBindingsByBuffer.get(buffer);
    if (bufferBiding?.editor){
      const editorBinding = this.editorBindingsByEditorDocument.get(bufferBiding.editor.document);
      if (editorBinding) {
        if (editorBinding.editorProxy) {
          this.editorBindingsByEditorProxy.delete(editorBinding.editorProxy);
          editorBinding.editorProxy.dispose();
        }
        this.editorBindingsByEditorDocument.delete(bufferBiding.editor.document);
      }
    }
    this.emitter.emit('did-change');
  }

	private saveDocument (event : vscode.TextDocumentWillSaveEvent) {
		if(this.bufferBindingsByBuffer){
      const bufferBinding = this.bufferBindingsByBuffer.get(event.document);
      if (bufferBinding) {
        event.waitUntil(bufferBinding.requestSavePromise());
      }
    }
  }

	private triggerSelectionChanges (event: vscode.TextEditorSelectionChangeEvent) {
    const editorBinding = this.editorBindingsByEditorDocument.get(event.textEditor.document);
    if (editorBinding) {
      editorBinding.updateSelections(event.selections);
    }
  }

	private triggerViewRangeChanges (event: vscode.TextEditorVisibleRangesChangeEvent) {
    const editorBinding = this.editorBindingsByEditorDocument.get(event.textEditor.document);
    if (editorBinding) {
      // editorBinding.editorDidChangeScrollTop(event.visibleRanges);
      // editorBinding.editorDidChangeScrollLeft(event.visibleRanges);
      // editorBinding.editorDidResize(event.visibleRanges);
      console.log(event.textEditor.visibleRanges[0]);
      console.log(event.visibleRanges[0]);
    }
  }
}
