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
	public editorBindingsByBuffer : Map<vscode.TextDocument, EditorBinding>;
  public editorBindingsByEditorProxy: Map<EditorProxy, EditorBinding>;

  private emitter: EventEmitter;

  constructor (public fs: vscode.FileSystemProvider, private notificationManager?: NotificationManager) {  
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

  removeDocument(id: string | undefined): void {
    if (!id) { return; }

    this.bufferBindingsByBuffer.forEach((value, key) => {
      if (value.portal?.id === id) {
        this.bufferBindingsByBuffer.delete(key);
        this.bufferBindingsByBufferProxy.delete(value.bufferProxy);
        const editorBinding = this.editorBindingsByBuffer.get(key);
        if (editorBinding) {
          this.editorBindingsByBuffer.delete(key);
          this.editorBindingsByEditorProxy.delete(editorBinding.editorProxy);
        }
      }
    });
  }

  public addEditor(editor: vscode.TextEditor, portal: Portal, isHost: boolean, bufferProxy?: BufferProxy | null, editorProxy?: EditorProxy | undefined): EditorProxy | undefined {
    if (!bufferProxy) {
      bufferProxy = this.findOrCreateBufferProxyForBuffer(editor.document, editor, portal);
      if (!bufferProxy) {
        this.notificationManager?.addError('bufferProxy create failed.');
        return undefined;
      }
    }
    
    const editorBinding = new EditorBinding(editor, undefined, portal, isHost);
    if (!editorProxy){
      editorProxy = portal.createEditorProxy({bufferProxy});
    }
    editorProxy?.setDelegate(editorBinding);
    editorBinding.setEditorProxy(editorProxy);

    this.editorBindingsByBuffer.set(editor.document, editorBinding);
    this.editorBindingsByEditorProxy.set(editorProxy, editorBinding);

    editorBinding?.onDidDispose(() => {
      //   didDestroyEditorSubscription.dispose();
         this.editorBindingsByBuffer.delete(editor.document);
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
      const bufferPath = vscode.workspace.asRelativePath(buffer.uri.fsPath, true);      
      bufferBinding = new BufferBinding(buffer, portal, bufferPath, editor, true);
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
    let editorBinding = this.editorBindingsByBuffer.get(editor.document);
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
      const buffer = await this.findOrCreateBufferForBufferProxy(bufferProxy, portal);
      if (buffer && portal) {
        const document = await vscode.workspace.openTextDocument(buffer.uri);
        editor = await vscode.window.showTextDocument(document);
        if (editor) {
          this.addEditor(editor, portal, false, bufferProxy, editorProxy);
        }
      }
    }

    return editor;
  }

  private async findOrCreateBufferForBufferProxy (bufferProxy: BufferProxy, portal?: Portal) : Promise<vscode.TextDocument | undefined>{
		let buffer : vscode.TextDocument | undefined;
    let bufferBinding = this.bufferBindingsByBufferProxy.get(bufferProxy);
    if (bufferBinding) {
      buffer = bufferBinding.buffer;
    } else {
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

			buffer = await vscode.workspace.openTextDocument(bufferURI);
			const editor = await vscode.window.showTextDocument(buffer);
      //const bufferPath = vscode.workspace.asRelativePath(buffer.uri.fsPath, true);
      const bufferPath = bufferProxy.uri;
      bufferBinding = new BufferBinding(
        buffer, portal, bufferPath, editor, false, () => this.bufferBindingsByBufferProxy.delete(bufferProxy)
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
    return this.editorBindingsByBuffer.has(paneItem.document);
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
          // if (!bufferBinding.disableHistory) {
				    const doc = bufferBinding.changeBuffer(event.contentChanges);
          // }
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
    if (bufferBiding){
      const editorBinding = this.editorBindingsByBuffer.get(bufferBiding?.editor.document);
      if (editorBinding) {
        if (editorBinding.editorProxy) {
          this.editorBindingsByEditorProxy.delete(editorBinding.editorProxy);
          editorBinding.editorProxy.dispose();
        }
        this.editorBindingsByBuffer.delete(bufferBiding.editor.document);
      }
      this.bufferBindingsByBuffer.delete(buffer);
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
}
