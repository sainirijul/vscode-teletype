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
  private bufferBindings: BufferBinding[];
  private editorBindings: EditorBinding[];

  // return this.editorProxiesByEditor.has(paneItem);
  private bufferBindingsByBuffer : Map<vscode.TextDocument, BufferBinding>;
  private bufferBindingsByBufferProxy : Map<BufferProxy, BufferBinding>;
	// public editorBindingsByEditor : Map<vscode.TextEditor, EditorBinding>;
	private editorBindingsByBuffer : Map<vscode.TextDocument, EditorBinding>;
  private editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;

  private emitter: EventEmitter;

  constructor (public fs: vscode.FileSystemProvider, private notificationManager?: NotificationManager) {  
    this.bufferBindings = [];
    this.editorBindings = [];
      // this.workspace = workspace;
    this.bufferBindingsByBufferProxy = new Map();
    this.editorBindingsByEditorProxy = new Map();
		this.bufferBindingsByBuffer = new Map();
    // this.editorBindingsByEditor = new Map();
    this.editorBindingsByBuffer = new Map();
    this.emitter = new EventEmitter();
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

  removeDocumentByBufferBinding(bufferBinding: BufferBinding): void {
      const editorBinding = this.editorBindingsByBuffer.get(bufferBinding.buffer);
      if (editorBinding?.isRemote && !editorBinding.editor.document.isClosed) {
        //vscode. editorBinding.editor.document
        vscode.window.showTextDocument(editorBinding.editor.document);
        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
      }
      this.removeEditorBinding(editorBinding);
      this.removeBufferBinding(bufferBinding);
  }

  removeDocuments(id: string | undefined): void {
    if (!id) { return; }

    this.bufferBindings.forEach(bufferBinding => {
      if (bufferBinding.portal?.id === id) {
        this.removeDocumentByBufferBinding(bufferBinding);
      }
    });
  }

  public addEditor(editor: vscode.TextEditor, portal: Portal, isHost: boolean, bufferBinding?: BufferBinding, editorProxy?: EditorProxy | undefined): EditorProxy | undefined {
    if (!bufferBinding) {
      bufferBinding = this.findOrCreateBufferBindingForBuffer(editor.document, editor, portal);
      if (!bufferBinding) {
        this.notificationManager?.addError('bufferProxy create failed.');
        return undefined;
      }
    }
    
    const editorBinding = new EditorBinding(editor, bufferBinding, undefined, portal, isHost);
    if (!editorProxy){
      editorProxy = portal.createEditorProxy({bufferProxy: bufferBinding.bufferProxy});
    }
    editorProxy?.setDelegate(editorBinding);
    editorBinding.setEditorProxy(editorProxy);

    this.addEditorBinding(editorBinding);

    editorBinding?.onDidDispose(() => {
      //   didDestroyEditorSubscription.dispose();
      this.removeEditorBinding(editorBinding);
         this.emitter.emit('did-change');
    });

    this.emitter.emit('did-change');

    return editorProxy;
  }

  public findOrCreateBufferBindingForBuffer (buffer: vscode.TextDocument, editor: vscode.TextEditor, portal?: Portal) : BufferBinding | undefined {
    let bufferBinding = this.bufferBindingsByBuffer.get(buffer);
    if (bufferBinding) {
      return bufferBinding;
    } 
    
    if (!portal) {
      return undefined;
    }

    const bufferPath = vscode.workspace.asRelativePath(buffer.uri.fsPath, false);
    bufferBinding = new BufferBinding(buffer, portal, bufferPath, editor, true, () => {
      this.removeBufferBinding(bufferBinding);
    });
    bufferBinding.fsPath = buffer.uri.fsPath;
    const bufferProxy = portal.createBufferProxy({
      uri: bufferBinding.getBufferProxyURI(),
      text: buffer.getText(),
      // history: {baseText: buffer.getText(), nextCheckpointId: 0, undoStack: null, redoStack: null} // buffer.getHistory()
    });
   
    if (!bufferProxy) {
      this.notificationManager?.addError('Portal.createBufferProxy() failed');
      return undefined;
    }

    bufferBinding.setBufferProxy(bufferProxy);
    bufferProxy.setDelegate(bufferBinding);

    bufferBinding.assignEditor(buffer, editor);

    this.addBufferBinding(bufferBinding);

    bufferBinding.activate = true;

    return bufferBinding;
  }
  
  public async findOrCreateEditorProxyForEditor (editor: vscode.TextEditor, portal: Portal | undefined) : Promise<EditorProxy | undefined> {
    let editorBinding = this.editorBindingsByBuffer.get(editor.document);
    if (editorBinding) {
      return editorBinding.editorProxy;
    } else {
      if (portal) {
        const editorProxy = this.addEditor(editor, portal, true);
        return editorProxy;
      }
    }
    return undefined;
  }

  // host에서 파일 열기
  public async findOrCreateEditorForEditorProxy (editorProxy: EditorProxy, portal?: Portal) : Promise<vscode.TextEditor | undefined> {
    let editor: vscode.TextEditor | undefined;
    let editorBinding = this.editorBindingsByEditorProxy.get(editorProxy);
    if (editorBinding) {
      editor = editorBinding.editor;
    } else {
      const {bufferProxy} = editorProxy;
      const buffer = await this.findOrCreateBufferForBufferProxy(bufferProxy, portal);
      if (buffer && portal) {
        const document = await vscode.workspace.openTextDocument(buffer.buffer.uri);
        editor = await vscode.window.showTextDocument(document);
        if (editor) {
          this.addEditor(editor, portal, false, buffer, editorProxy);
        }
      }
    }

    return editor;
  }

  // guest에서 리모트 파일 연결 된 에디터 열기
  private async findOrCreateBufferForBufferProxy (bufferProxy: BufferProxy, portal?: Portal) : Promise<BufferBinding | undefined>{
		let buffer : vscode.TextDocument | undefined;
    let bufferBinding = this.bufferBindingsByBufferProxy.get(bufferProxy);
    if (bufferBinding) {
      return bufferBinding;
    }

    if (!portal?.id) { return undefined; }

    // const filePath = path.join(os.tmpdir(), portalId, bufferProxy.uri);
    const filePath = path.join(os.tmpdir(), portal.id, bufferProxy.uri.replace(/\\/g, '/'));
    // const filePath = path.join(portalId, bufferProxy.uri);
    const bufferURI = vscode.Uri.file(filePath);
    // const bufferURI = vscode.Uri.parse(`memfs:/${filePath.replace(/\\/g, '/')}`);
    await require('mkdirp-promise')(path.dirname(filePath));
    // this.fs.createDirectory(vscode.Uri.parse(`memfs:${path.dirname(filePath)}`));
    // this.fs.writeFile(bufferURI, new TextEncoder().encode(''), {create:true, overwrite:true});
    fs.writeFileSync(filePath, '');

    //const bufferPath = vscode.workspace.asRelativePath(buffer.uri.fsPath, true);
    const bufferPath = bufferProxy.uri;
    bufferBinding = new BufferBinding(null, portal, bufferPath, null, false, () => {
      this.removeBufferBinding(bufferBinding);
      this.emitter.emit('did-change');
    });
    bufferBinding.fsPath = filePath;

    bufferBinding.setBufferProxy(bufferProxy);
    bufferProxy.setDelegate(bufferBinding);

    buffer = await vscode.workspace.openTextDocument(bufferURI);
    const editor = await vscode.window.showTextDocument(buffer);
    bufferBinding.assignEditor(buffer, editor);

    this.addBufferBinding(bufferBinding);

    bufferBinding.activate = true;

    return bufferBinding;
  }

  hasPaneItem(paneItem: vscode.TextEditor) : boolean {
    // return this.editorProxiesByEditor.has(paneItem);
    return this.editorBindingsByBuffer.has(paneItem.document);
  }

  // getActivePaneItem() : vscode.TextEditor {
  //   return this.newActivePaneItem || vscode.window.activeTextEditor;
  // }

  onDidChange(callback: () => void) {
    return this.emitter.on('did-change', callback);
  }

	private registerWorkspaceEvents () {
		vscode.workspace.onDidChangeTextDocument(this.didChangeTextDocument.bind(this));
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

	private didChangeTextDocument (event : vscode.TextDocumentChangeEvent) {
		if (!this.bufferBindingsByBuffer) { return; }

    const bufferBinding = this.bufferBindingsByBuffer.get(event.document);
    if (bufferBinding) {
      if (bufferBinding.activate && !bufferBinding.isUpdating) {
        // if (!bufferBinding.disableHistory) {
          const doc = bufferBinding.changeBuffer(event.contentChanges);
        // }
      } else {
        bufferBinding.isUpdating = false;
      }
      bufferBinding.activate = true;
    }
	}

  // private didAddTextEditor (editor: vscode.TextEditor) {
  //   if (!this.editorBindingsByEditor.get(editor)?.isRemote) {
  //     this.findOrCreateEditorProxyForEditor(editor); 
  //   }
  // }

  private didRemoveTextEditor (buffer: vscode.TextDocument) {
    const bufferBiding = this.bufferBindingsByBuffer.get(buffer);
    if (bufferBiding){
      const editorBinding = this.editorBindingsByBuffer.get(bufferBiding?.editor.document);
      if (editorBinding) {
        editorBinding.editorProxy?.dispose();
        this.removeEditorBinding(editorBinding);
      }
      this.emitter.emit('did-change');
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
    const editorBinding = this.editorBindingsByBuffer.get(event.textEditor.document);
    if (editorBinding) {
      editorBinding.updateSelections(event.selections);
    }
  }

	private triggerViewRangeChanges (event: vscode.TextEditorVisibleRangesChangeEvent) {
    const editorBinding = this.editorBindingsByBuffer.get(event.textEditor.document);
    if (editorBinding) {
      // editorBinding.editorDidChangeScrollTop(event.visibleRanges);
      // editorBinding.editorDidChangeScrollLeft(event.visibleRanges);
      // editorBinding.editorDidResize(event.visibleRanges);
      console.log(event.textEditor.visibleRanges[0]);
      console.log(event.visibleRanges[0]);
    }
  }

  addBufferBinding(bufferBinding: BufferBinding) {
    if (this.bufferBindings.indexOf(bufferBinding) >= 0) { return; }
    this.bufferBindings.push(bufferBinding);
    this.bufferBindingsByBuffer.set(bufferBinding.buffer, bufferBinding);
    this.bufferBindingsByBufferProxy.set(bufferBinding.bufferProxy, bufferBinding);
  }

  addEditorBinding(editorBinding: EditorBinding) {
    if (this.editorBindings.indexOf(editorBinding) >= 0) { return; }
    this.editorBindings.push(editorBinding);
    this.editorBindingsByBuffer.set(editorBinding.editor.document, editorBinding);
    this.editorBindingsByEditorProxy.set(editorBinding.editorProxy, editorBinding);
  }

  removeBufferBinding(bufferBinding?: BufferBinding) {
    if (!bufferBinding) { return; }
    const idx = this.bufferBindings.indexOf(bufferBinding);
    if (idx < 0) { return; }
    this.bufferBindings.splice(idx, 1);
    this.bufferBindingsByBuffer.delete(bufferBinding.buffer);
    this.bufferBindingsByBufferProxy.delete(bufferBinding.bufferProxy);
  }

  removeEditorBinding(editorBinding?: EditorBinding) {
    if (!editorBinding) { return; }
    const idx = this.editorBindings.indexOf(editorBinding);
    if (idx < 0) { return; }
    this.editorBindings.splice(idx, 1);
    this.editorBindingsByBuffer.delete(editorBinding.editor.document);
    this.editorBindingsByEditorProxy.delete(editorBinding.editorProxy);
  }

	getBufferBindings() : Array<BufferBinding> {
		return this.bufferBindings;
	}

  getEditorBindings() : Array<EditorBinding> {
		return this.editorBindings;
	}

  getEditorBindingByBuffer(buffer: vscode.TextDocument) : EditorBinding | undefined {
    return this.editorBindingsByBuffer.get(buffer);
  }

  getEditorBindingByEditorProxy(editorProxy: EditorProxy) : EditorBinding | undefined {
    return this.editorBindingsByEditorProxy.get(editorProxy);
  }

  getBufferBindingByBuffer(buffer: vscode.TextDocument) : BufferBinding | undefined {
    return this.bufferBindingsByBuffer.get(buffer);
  }

  
}
