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

// const NOOP = () => {};

export default class WorkspaceManager {
  //private bufferBindings: Map<string, BufferBinding>;
  //private editorBindings: Map<string, EditorBinding>;
  // private bufferBindings: BufferBinding[];
  // private editorBindings: EditorBinding[];

  // return this.editorProxiesByEditor.has(paneItem);
  private bufferBindingsByTextDocument : Map<vscode.TextDocument, BufferBinding>;
  private bufferBindingsByBufferProxy : Map<BufferProxy, BufferBinding>;
	// public editorBindingsByEditor : Map<vscode.TextEditor, EditorBinding>;
	// private editorBindingsByBuffer : Map<vscode.TextDocument, EditorBinding>;
  private editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;
  private editorBindingsByTextEditor: Map<vscode.TextEditor, EditorBinding>;

  private emitter: EventEmitter;

  constructor (public fs: vscode.FileSystemProvider, private notificationManager?: NotificationManager) {  
    //this.bufferBindings = new Map();
    //this.editorBindings = new Map();
      // this.workspace = workspace;
    this.bufferBindingsByBufferProxy = new Map();
    this.editorBindingsByEditorProxy = new Map();
		this.bufferBindingsByTextDocument = new Map();
    // this.editorBindingsByEditor = new Map();
    // this.editorBindingsByBuffer = new Map();
    this.editorBindingsByTextEditor = new Map();
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
    if (!bufferBinding.buffer) { return; }
  
    vscode.window.visibleTextEditors.forEach(editor => {
      if (editor.document === bufferBinding.buffer) {
        editor.hide();
        // this.removeEditorBinding(editorBinding);
        this.removeBufferBinding(bufferBinding);
      }
    });

    // const editorBinding = this.editorBindingsByBuffer.get(bufferBinding.buffer);
    // if (editorBinding?.isRemote && !editorBinding.editor.document.isClosed) {
    //   //vscode. editorBinding.editor.document
    //   vscode.window.showTextDocument(editorBinding.editor.document);
    //   vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    // }
    // this.removeEditorBinding(editorBinding);
    // this.removeBufferBinding(bufferBinding);
  }

  removeDocuments(id: string | undefined): void {
    if (!id) { return; }

    // this.bufferBindings.forEach(bufferBinding => {
    //   if (bufferBinding.portal?.id === id) {
    //     this.removeDocumentByBufferBinding(bufferBinding);
    //   }
    // });
  }

  public addEditor(editor: vscode.TextEditor, portal: Portal, isHost: boolean, bufferBinding?: BufferBinding, editorProxy?: EditorProxy | undefined): EditorBinding | undefined {
    if (!bufferBinding) {
      bufferBinding = this.findOrCreateBufferBindingForBuffer(editor.document, portal);
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

    return editorBinding;
  }

  private didRequireUpdateBuffer(bufferBinding: BufferBinding) {

  }

  // Host에서 문서 열 때
  public findOrCreateBufferBindingForBuffer (buffer: vscode.TextDocument, portal?: Portal) : BufferBinding | undefined {
    let bufferBinding = this.bufferBindingsByTextDocument.get(buffer);
    if (bufferBinding) {
      return bufferBinding;
    } 
    
    if (!portal) {
      return undefined;
    }

    const bufferPath = vscode.workspace.asRelativePath(buffer.uri.fsPath, false);
    bufferBinding = new BufferBinding(buffer, portal, bufferPath, undefined, true, () => {
      this.removeBufferBinding(bufferBinding);
    });
    bufferBinding.onRequireUpdate(this.didRequireUpdateBuffer.bind(this));
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

    bufferProxy.setDelegate(bufferBinding);

    (bufferProxy as any).bufferBinding = bufferBinding;
    bufferBinding.setBufferProxy(bufferProxy);
    bufferBinding.assignEditor(buffer, undefined);

    this.addBufferBinding(bufferBinding);

    return bufferBinding;
  }
  
  public findOrCreateEditorBindingForEditor (editor: vscode.TextEditor, portal: Portal | undefined) : EditorBinding | undefined {
    let editorBinding = this.editorBindingsByTextEditor.get(editor);
    if (editorBinding) {
      return editorBinding;
    } else {
      if (portal) {
        const editorBinding = this.addEditor(editor, portal, true);
        return editorBinding;
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
        if (buffer.buffer) {
          vscode.commands.executeCommand('vscode.open', buffer.buffer.uri);
          // const document = await vscode.workspace.openTextDocument(buffer.buffer.uri);
          // editor = await vscode.window.showTextDocument(document);
          // if (editor) {
          //   this.addEditor(editor, portal, false, buffer, editorProxy);
          // }
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
    bufferBinding = new BufferBinding(undefined, portal, bufferPath, undefined, false, () => {
      this.removeBufferBinding(bufferBinding);
      this.emitter.emit('did-change');
    });
    bufferBinding.fsPath = filePath;

    bufferBinding.setBufferProxy(bufferProxy);
    bufferProxy.setDelegate(bufferBinding);

    buffer = await vscode.workspace.openTextDocument(bufferURI);
    //const editor = await vscode.window.showTextDocument(buffer);
    bufferBinding.assignEditor(buffer, undefined);

    this.addBufferBinding(bufferBinding);

    return bufferBinding;
  }


  hasPaneItem(paneItem: vscode.TextEditor) : boolean {
    // return this.editorProxiesByEditor.has(paneItem);
    return this.editorBindingsByTextEditor.has(paneItem);
  }

  // getActivePaneItem() : vscode.TextEditor {
  //   return this.newActivePaneItem || vscode.window.activeTextEditor;
  // }

  onDidChange(callback: () => void) {
    return this.emitter.on('did-change', callback);
  }

	private registerWorkspaceEvents () {
    vscode.workspace.onDidOpenTextDocument(this.didOpenTextDocument.bind(this));
    vscode.workspace.onDidCloseTextDocument(this.didCloseTextDocument.bind(this));
		vscode.workspace.onDidChangeTextDocument(this.didChangeTextDocument.bind(this));
		vscode.workspace.onWillSaveTextDocument(this.saveDocument.bind(this));

    vscode.window.onDidChangeActiveTextEditor(this.didChangeActiveTextEditor.bind(this));
    vscode.window.onDidChangeVisibleTextEditors(this.didChangeVisibleTextEditors.bind(this));
    vscode.window.onDidChangeTextEditorSelection(this.didSelectionChanges.bind(this));
    vscode.window.onDidChangeTextEditorVisibleRanges(this.didViewRangeChanges.bind(this));

      // vscode.window.onDidChangeActiveTextEditor((e) => {
      //   const editor = e as vscode.TextEditor;
      //   this.didChangeActiveTextEditor(editor);
      // });
      // vscode.workspace.onDidOpenTextDocument(async (e) => {
      //   const editor = await vscode.window.showTextDocument(e);
      //   this.didAddTextEditor(editor);
      // });

	}

	private didChangeTextDocument (event : vscode.TextDocumentChangeEvent) {
		if (!this.bufferBindingsByTextDocument) { return; }

    const bufferBinding = this.bufferBindingsByTextDocument.get(event.document);
    if (bufferBinding) {
      if (!bufferBinding.isUpdating) {
        // if (!bufferBinding.disableHistory) {
          const doc = bufferBinding.changeBuffer(event.contentChanges);
        // }
      } else {
        bufferBinding.isUpdating = false;
      }
    }
	}

  // private didAddTextEditor (editor: vscode.TextEditor) {
  //   if (!this.editorBindingsByEditor.get(editor)?.isRemote) {
  //     this.findOrCreateEditorProxyForEditor(editor); 
  //   }
  // }

  private didOpenTextDocument(buffer: vscode.TextDocument) {
    // if (!this.editorBindingsByEditor.get(editor)?.isRemote) {
    //   this.findOrCreateEditorProxyForEditor(editor); 
    // }
  }

  private didChangeActiveTextEditor(editor?: vscode.TextEditor) {

  }

  private didChangeVisibleTextEditors(editors?: vscode.TextEditor[]) {
    editors?.forEach(editor => {

    });
  }

  private didCloseTextDocument(buffer: vscode.TextDocument) {
    const bufferBiding = this.bufferBindingsByTextDocument.get(buffer);
    if (bufferBiding) {
      vscode.window.visibleTextEditors.forEach((editor) => {
        if(editor.document === bufferBiding.buffer) {
          editor.hide();
        }
      });

      // const editorBinding = this.editorBindingsByBuffer.get(bufferBiding.editor.document);
      // if (editorBinding) {
      //   editorBinding.editorProxy?.dispose();
      //   this.removeEditorBinding(editorBinding);
      // }
      this.emitter.emit('did-change');
    }
  }

	private saveDocument (event : vscode.TextDocumentWillSaveEvent) {
		if(this.bufferBindingsByTextDocument){
      const bufferBinding = this.bufferBindingsByTextDocument.get(event.document);
      if (bufferBinding) {
        event.waitUntil(bufferBinding.requestSavePromise());
      }
    }
  }

	private didSelectionChanges (event: vscode.TextEditorSelectionChangeEvent) {
    const editorBinding = this.editorBindingsByTextEditor.get(event.textEditor);
    if (editorBinding) {
      editorBinding.updateSelections(event.selections);
    }
  }

	private didViewRangeChanges (event: vscode.TextEditorVisibleRangesChangeEvent) {
    const editorBinding = this.editorBindingsByTextEditor.get(event.textEditor);
    if (editorBinding) {
      // editorBinding.editorDidChangeScrollTop(event.visibleRanges);
      // editorBinding.editorDidChangeScrollLeft(event.visibleRanges);
      // editorBinding.editorDidResize(event.visibleRanges);
      // console.log(event.textEditor.visibleRanges[0]);
      // console.log(event.visibleRanges[0]);
    }
  }

  addHostTextDocument(e: vscode.TextDocument) {
    
  }

  private addBufferBinding(bufferBinding: BufferBinding) {
    if (bufferBinding.buffer) {
      // if (this.bufferBindings.has(bufferBinding.buffer?.fileName)) { return; }
      // this.bufferBindings.set(bufferBinding.buffer?.fileName, bufferBinding);
      this.bufferBindingsByTextDocument.set(bufferBinding.buffer, bufferBinding);
    }
    this.bufferBindingsByBufferProxy.set(bufferBinding.bufferProxy, bufferBinding);
  }

  private addEditorBinding(editorBinding: EditorBinding) {
    if (editorBinding.bufferBinding?.buffer) {
      // if (this.editorBindings.has(editorBinding.bufferBinding.buffer.fileName)) { return; }
      // this.editorBindings.set(editorBinding.bufferBinding.buffer.fileName, editorBinding);
      this.editorBindingsByTextEditor.set(editorBinding.editor, editorBinding);
    }
    this.editorBindingsByEditorProxy.set(editorBinding.editorProxy, editorBinding);
  }

  private removeBufferBinding(bufferBinding?: BufferBinding) {
    if (!bufferBinding || !bufferBinding.fsPath) { return; }
    // if (!this.bufferBindings.has(bufferBinding.fsPath)) { return; }
    // this.bufferBindings.delete(bufferBinding.fsPath);
    this.bufferBindingsByTextDocument.delete(bufferBinding.buffer);
    this.bufferBindingsByBufferProxy.delete(bufferBinding.bufferProxy);
  }

  private removeEditorBinding(editorBinding?: EditorBinding) {
    if (!editorBinding) { return; }
    // if (!this.bufferBindings.has(editorBinding.bufferBinding.buffer.fsPath)) { return; }
    //this.editorBindings.delete(editorBinding.bufferBinding.buffer?.uri);
    this.editorBindingsByTextEditor.delete(editorBinding.editor);
    this.editorBindingsByEditorProxy.delete(editorBinding.editorProxy);
  }

	getBufferBindings() : Array<BufferBinding> {
		return Array.from(this.bufferBindingsByBufferProxy, ([_, v]) => (v));    
	}

  getEditorBindings() : Array<EditorBinding> {
		return Array.from(this.editorBindingsByTextEditor, ([_, v]) => (v));
	}

  getEditorBindingByEditor(editor: vscode.TextEditor) : EditorBinding | undefined {
    return this.editorBindingsByTextEditor.get(editor);
  }

  getEditorBindingsByDocument(buffer: vscode.TextDocument) : EditorBinding[] {
    let lst: EditorBinding[] = [];

    vscode.window.visibleTextEditors.forEach(editor => {
      if (editor.document === buffer) {
        const editorBinding = this.getEditorBindingByEditor(editor);
        if (editorBinding) { 
          lst.push(editorBinding); 
        }
      }
    });

    return lst;
  }

  getEditorBindingByEditorProxy(editorProxy: EditorProxy) : EditorBinding | undefined {
    return this.editorBindingsByEditorProxy.get(editorProxy);
  }

  getBufferBindingByBuffer(buffer: vscode.TextDocument) : BufferBinding | undefined {
    return this.bufferBindingsByTextDocument.get(buffer);
  }

  
}
