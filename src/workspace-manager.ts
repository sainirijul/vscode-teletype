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
	// public editorBindingsByEditorProxy : Map<EditorProxy, EditorBinding>;
  // public bufferBindingsByBufferProxy : Map<BufferProxy, BufferBinding>;
  public bufferBindingsByBuffer : Map<vscode.TextDocument, BufferBinding>;
	public editorBindingsByEditor : Map<vscode.TextEditor, EditorBinding>;
	public editorProxiesByEditor : WeakMap<vscode.TextEditor, EditorProxy>;
  public editorBindingsByEditorProxyId: Map<number, EditorBinding>;
  public editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;
  public bufferBindingsByBufferProxyId: Map<number, BufferBinding>;
  public editorProxiesMetadataById: Map<number, EditorProxyMetadata>;
  public newActivePaneItem: any;

  private emitter: EventEmitter;

  constructor () {
    // this.workspace = workspace;
    // this.editor = editor;
    this.editorBindingsByEditorProxyId = new Map();
    this.bufferBindingsByBufferProxyId = new Map();
    this.editorBindingsByEditorProxy = new Map();
    this.editorProxiesByEditor = new WeakMap();
    this.editorProxiesMetadataById = new Map();
		this.bufferBindingsByBuffer = new Map();
    this.editorBindingsByEditor = new Map();
    this.emitter = new EventEmitter();
  }

  public async initialize () {
    this.registerWorkspaceEvents();
    return true;
  }

  dispose () {
    // this.emitDidDispose();
  }

  didChangeEditorProxies () {}

  public async findOrCreateEditorForEditorProxy (editorProxy: EditorProxy, portal: Portal) : Promise<vscode.TextEditor | null> {
    let editor: vscode.TextEditor;
    let editorBinding = this.editorBindingsByEditorProxyId.get(editorProxy.id);
    if (editorBinding) {
      editor = editorBinding.editor;
    } else {
      const {bufferProxy} = editorProxy;
      const buffer = await this.findOrCreateBufferForBufferProxy(bufferProxy, portal.id);
      if (buffer && portal) {
        const document = await vscode.workspace.openTextDocument(buffer.uri);
        editor = await vscode.window.showTextDocument(document);
        if (editor !== null) {
          editorBinding = new EditorBinding(editor, portal, false);
          editorBinding.setEditorProxy(editorProxy);
          editorProxy.setDelegate(editorBinding);

          this.editorBindingsByEditor.set(editor, editorBinding);
          this.editorBindingsByEditorProxyId.set(editorProxy.id, editorBinding);
          this.editorProxiesByEditor.set(editor, editorProxy);

          // const didDestroyEditorSubscription = vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => editorBinding.dispose());
          editorBinding.onDidDispose(() => {
          //   didDestroyEditorSubscription.dispose();

          //   const isRetracted = this.portal?.resolveFollowState() === FollowState.RETRACTED;
          //   this.shouldRelayActiveEditorChanges = !isRetracted;
          //   editor.close();
          //   this.shouldRelayActiveEditorChanges = true;

            this.editorBindingsByEditor.delete(editor);
            this.editorProxiesByEditor.delete(editor);
            this.editorBindingsByEditorProxyId.delete(editorProxy.id);
          });
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    return editor;
  }

  private async findOrCreateBufferForBufferProxy (bufferProxy: BufferProxy, portalId: string) : Promise<vscode.TextDocument | undefined>{
		let buffer : vscode.TextDocument | undefined;
    let bufferBinding = this.bufferBindingsByBufferProxyId.get(bufferProxy.id);
    if (bufferBinding) {
      buffer = bufferBinding.buffer;
    } else {
			const filePath = path.join(os.tmpdir(), portalId, bufferProxy.uri);
			const bufferURI = vscode.Uri.file(filePath);
			await require('mkdirp-promise')(path.dirname(filePath));
			fs.writeFileSync(filePath, '');

			buffer = await vscode.workspace.openTextDocument(bufferURI);
			const editor = await vscode.window.showTextDocument(buffer);
      bufferBinding = new BufferBinding(
        buffer, editor, false, () => this.bufferBindingsByBufferProxyId.delete(bufferProxy.id)
      );

      bufferBinding.setBufferProxy(bufferProxy);
      bufferProxy.setDelegate(bufferBinding);

      this.bufferBindingsByBufferProxyId.set(bufferProxy.id, bufferBinding);
			this.bufferBindingsByBuffer.set(buffer, bufferBinding);
    }
    return buffer;
  }

  hasPaneItem(paneItem: vscode.TextEditor) : boolean {
    return this.editorProxiesByEditor.has(paneItem);
  }

  // getActivePaneItem() : vscode.TextEditor {
  //   return this.newActivePaneItem || vscode.window.activeTextEditor;
  // }

  onDidChange(callback: Function) {
    // return this.emitter.on('did-change', callback);
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
      const editorProxy = this.editorProxiesByEditor.get(bufferBiding.editor);
      editorProxy?.dispose();
    }
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
		if (this.editorBindingsByEditor){
      const editorBinding = this.editorBindingsByEditor.get(event.textEditor);
      if (editorBinding) {
        editorBinding.updateSelections(event.selections);
      }
    }
  }

	private triggerViewRangeChanges (event: vscode.TextEditorVisibleRangesChangeEvent) {
		if (this.editorBindingsByEditor){
      const editorBinding = this.editorBindingsByEditor.get(event.textEditor);
      if (editorBinding) {
        // editorBinding.editorDidChangeScrollTop(event.visibleRanges);
        // editorBinding.editorDidChangeScrollLeft(event.visibleRanges);
        // editorBinding.editorDidResize(event.visibleRanges);
      }
    }
  }

}
