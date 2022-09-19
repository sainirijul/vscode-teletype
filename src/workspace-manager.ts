import * as vscode from 'vscode';
import {EventEmitter} from 'events';
import {BufferProxy, EditorProxy, Portal} from '@atom/teletype-client';
import BufferBinding, { createBufferBinding, IBufferProxyExt } from './buffer-binding';
import EditorBinding, { createEditorBinding, IEditorProxyExt } from './editor-binding';
import NotificationManager from './notification-manager';
import * as os from 'os';
import * as path from 'path';
import { TextEncoder } from 'util';
import * as fs from 'fs';

// VSCode의 에디터 특성:
//   * editor가 안 보이게 되면 인스턴스가 무효해진다.
//   * 가려져서 안 보이던 editor 새롭게 화면에 나타나더라도 이전에 보였던 때와는 다른 인스턴스가 된다.
//   * 각 에디터를 구분할 수 있는 unique한 값이 존재하지 않는다. editor의 인스턴스는 휘발성이라 화면 조작 과정에서 변화되기 때문에 키가 될 수가 없다.
//   * 동일 document에 대한 복수개의 editor가 동시에 지정될 수도 있고, 단 한개도 없을 수도 있다. (한개도 없게 되는 경우는 버그로 추정 됨)
//   * 현재 탭에 떠 있는 모든 에디터의 목록을 얻는 api가 없다. 때문에 눈에 보이는 에디터 외의 다른 에디터의 정보를 얻을 수가 없다.
//   * document 단독으로는 문서의 편집을 할 수 없고, 반드시 눈에 보이는 editor를 통해서만 편집이 가능하다.

// Teletype에 적용하기 위한 유의점:
//   * Teletype은 Atom을 기준으로 설계되었기 때문에 Atom과 특성이 다른 VSCode에 그대로 적용이 되질 않는다.
//   * editor가 안 보이면 인스턴스 유지가 안 되는 문제 때문에 구현에 제약이 생긴다.
//   * editor의 인스턴스를 저장해 놔 봐야 소용이 없다. 탭 전환하는 순간 인스턴스 값이 바뀌어 버리기 때문이다.
//   * editor를 구분할 수 있는 키가 없기 때문에 동일 document에 대해 연결 된 복수개의 editor를 구분하여 사용할 수가 없다. 때문에 document 하나 당 현재 포커스를 가진 editor 한개만이 동기화 대상이 된다.
//   * 원래는 bufferProxy와 editoProxy는 구분되어 관리되어야 하지만, VSCode에서 각 editor의 인스턴스를 정교하게 관리할 수가 없기 때문에 bufferProxy와 editorProxy가 항상 쌍으로 묶어서 동작하도록 구현해야 한다.
//   * document의 자동 편집이 필요한데 연결 된 에디터 중 현재 보이는 에디터가 없다면 먼저 강제로 editor를 보이게 한 후에 편집하거나, 편집할 내용을 보관했다가 다음번에 editor가 보이게 되는 순간에 몰아서 적용해야 한다.

class ProxyObject {
  constructor(public portal: Portal, public bufferProxy: BufferProxy, public editorProxy: EditorProxy) {}
}

export default class WorkspaceManager {
  private proxyObjectsByUri : Map<string, ProxyObject>;
  private editorBindingsByTextEditor : Map<vscode.TextEditor, EditorBinding>;

  private emitter: EventEmitter;

  constructor (public fs: vscode.FileSystemProvider, private notificationManager?: NotificationManager) {  
    this.proxyObjectsByUri = new Map();
    this.editorBindingsByTextEditor = new Map();

    this.emitter = new EventEmitter();
  }

  public async initialize () {
    this.registerWorkspaceEvents();
    return true;
  }

  // dspose () {
  // }

  async removeDocuments(id: string | undefined) {
    if (!id) { return; }

    // await vscode.commands.executeCommand('workbench.action.nextEditor');
    // vscode.window.activeTextEditor?.document
    // await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

    // this.bufferBindings.forEach(bufferBinding => {
    //   if (bufferBinding.portal?.id === id) {
    //     this.removeDocumentByBufferBinding(bufferBinding);
    //   }
    // });
  }

  private createBufferBinding(uri: vscode.Uri, bufferProxy: BufferProxy, portal: Portal, buffer: vscode.TextDocument | undefined, fsPath?: vscode.Uri) : BufferBinding {
    const bufferBinding = createBufferBinding(this.fs, uri, bufferProxy, portal, buffer, fsPath, 
      this.didRequireUpdateBuffer.bind(this),
      () => {},
      (bufferBinding) => {
        this.removeBufferBinding(bufferBinding);
      }
    );

    return bufferBinding;
  }

  private createEditorBinding(editor: vscode.TextEditor, editorProxy: EditorProxy, bufferBinding: BufferBinding) : EditorBinding | undefined {
    const editorBinding = createEditorBinding(editor, editorProxy, bufferBinding, () => {
      this.removeEditorBinding(editorBinding);
      this.emitter.emit('did-change');
    });

    this.addEditorBinding(editorBinding);

    this.emitter.emit('did-change');

    return editorBinding;
  }

  // Host에서 문서 열 때
  public findOrCreateBufferBindingForBuffer (buffer: vscode.TextDocument, portal?: Portal) : BufferBinding | undefined {
    let bufferBinding = this.getBufferBindingByBuffer(buffer);
    if (bufferBinding) {
      return bufferBinding;
    } 
    
    if (!portal) {
      return undefined;
    }

    const bufferPath = vscode.workspace.asRelativePath(buffer.uri.fsPath, false);
   
    const bufferProxy = portal.createBufferProxy({
      uri: bufferPath,
      // uri: buffer.uri.toString(),
      // uri: `teletype://${bufferPath}`,
      text: buffer.getText(),
      // history: {baseText: buffer.getText(), nextCheckpointId: 0, undoStack: null, redoStack: null} // buffer.getHistory()
    });

    if (!bufferProxy) {
      this.notificationManager?.addError('Portal.createBufferProxy() failed');
      return undefined;
    }

    const editorProxy = portal.createEditorProxy({bufferProxy: bufferProxy});

    bufferBinding = this.createBufferBinding(buffer.uri, bufferProxy, portal, buffer);

    this.addProxyObject(buffer.uri.toString(), portal, bufferProxy, editorProxy);
    this.addBufferBinding(bufferBinding);

    this.emitter.emit('did-change');
    
    return bufferBinding;
  }

  // guest 파일 열기
  public async findOrCreateEditorForEditorProxy (editorProxy: EditorProxy, portal?: Portal) : Promise<EditorBinding | undefined> {
    let editor: vscode.TextEditor | undefined;

    let editorBinding = this.getEditorBindingByEditorProxy(editorProxy);
    if (!editorBinding) {
      const {bufferProxy} = editorProxy;
      // this.addProxyObject(bufferProxy.uri, bufferProxy, editorProxy);
      const buffer = await this.findOrCreateBufferForEditorProxy(editorProxy, portal);
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

    return editorBinding;
  }

  // guest에서 리모트 파일 연결 된 에디터 열기
  private async findOrCreateBufferForEditorProxy (editorProxy: EditorProxy, portal?: Portal) : Promise<BufferBinding | undefined>{
    const bufferProxy = editorProxy.bufferProxy;
    let bufferBinding = this.getBufferBindingByBufferProxy(bufferProxy);
    if (bufferBinding) {
      return bufferBinding;
    }

    if (!portal?.id) { return undefined; }

    const fileUri = vscode.Uri.parse(bufferProxy.uri);
    // const filePath = path.join(os.tmpdir(), portal.id, fileUri.path);
    const baseUri = vscode.Uri.parse(`memfs:///${portal.id}`);
    const bufferURI = vscode.Uri.joinPath(baseUri, fileUri.path);
    const filePath = bufferURI.fsPath;
    // await require('mkdirp-promise')(path.dirname(filePath));
    this.fs.createDirectory(baseUri);
    this.fs.writeFile(bufferURI, new TextEncoder().encode(''), {create:true, overwrite:true});
    //fs.writeFileSync(filePath, '');

    //bufferBinding = this.createBufferBinding(bufferProxy.uri, bufferProxy, portal, undefined, filePath);
    bufferBinding = this.createBufferBinding(vscode.Uri.parse(bufferProxy.uri), bufferProxy, portal, undefined, bufferURI);
    // bufferBinding = new BufferBinding(bufferProxy.uri, undefined, bufferProxy, bufferPath, () => {
    //   this.removeBufferBinding(bufferBinding);
    //   this.emitter.emit('did-change');
    // });
    //bufferBinding.fsPath = filePath;
    bufferBinding.fsPath = bufferURI;

    //bufferBinding.setBufferProxy(bufferProxy);
    //bufferProxy.setDelegate(bufferBinding);

    // openTextDocument()는 버그가 있어서 사용시 close 이벤트가 더이상 발생하지 않게 된다.
    // 때문에 executeCommand('vscode.open')으로 문서를 열고, textDocument 인스턴스는 사후 이벤트를 통해 바인딩해야 한다.
    // vscode.window.showTextDocument(bufferURI);
    // buffer = await vscode.workspace.openTextDocument(bufferURI); 
    // const editor = await vscode.window.showTextDocument(buffer);
    // bufferBinding.assignEditor(buffer, undefined);
    // vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
    vscode.commands.executeCommand('vscode.open', bufferURI);

    this.addProxyObject(vscode.Uri.file(filePath).toString(), portal, bufferProxy, editorProxy);
    this.addBufferBinding(bufferBinding);

    return bufferBinding;
  }

	private saveDocument (event : vscode.TextDocumentWillSaveEvent) {
		//if(this.bufferBindingsByTextDocument){
      const bufferBinding = this.getBufferBindingByBuffer(event.document);
      if (bufferBinding) {
        event.waitUntil(bufferBinding.requestSavePromise());
      }
    //}
  }

  private getProxyObjectByUri(uri: vscode.Uri | string) : ProxyObject | undefined {
    return this.proxyObjectsByUri.get(uri.toString());
  }

  private addProxyObject(uri: string | undefined, portal: Portal, bufferProxy: BufferProxy, editorProxy: EditorProxy) {
    const path = uri ?? bufferProxy.uri;
    if (this.proxyObjectsByUri.has(path)) { return; }
    this.proxyObjectsByUri.set(path, new ProxyObject(portal, bufferProxy, editorProxy));
  }

  private removeProxyObject(uri: string | BufferProxy) {
    if (typeof uri === 'string') {
      this.proxyObjectsByUri.delete(uri);
    } else if (uri instanceof BufferProxy) {
      this.proxyObjectsByUri.delete((uri as BufferProxy).uri);
    }
  }

  private addBufferBinding(bufferBinding: BufferBinding) {
    // this.ProxyObjectByUri.set(bufferBinding.uri, bufferBinding);
    //this.bufferBindingsByBufferProxy.set(bufferBinding.bufferProxy, bufferBinding);
    (bufferBinding.bufferProxy as any).setBufferBinding(bufferBinding);
    if (bufferBinding.buffer) {
      // this.bufferBindingsByTextDocument.set(bufferBinding.buffer, bufferBinding);
      // this.bufferBindingsByUri.set(bufferBinding.buffer.uri.toString(), bufferBinding);
    }
  }

  private addEditorBinding(editorBinding: EditorBinding) {
    //this.editorBindingsByEditorProxy.set(editorBinding.editorProxy, editorBinding);
    (editorBinding.editorProxy as any).setEditorBinding(editorBinding);
    // if (editorBinding.bufferBinding?.buffer) {
      // this.editorBindingsByTextEditor.set(editorBinding.editor, editorBinding);
    // }
    console.log('>> new editor');
    console.log(editorBinding);
  }

  private removeBufferBinding(bufferBinding?: BufferBinding) {
    if (!bufferBinding?.buffer) { return; }
    // if (!bufferBinding || !bufferBinding.fsPath) { return; }

    const proxyObject = this.getProxyObjectByUri(bufferBinding.buffer.uri);
    if (proxyObject) {
      proxyObject.editorProxy?.dispose();
      this.removeProxyObject(bufferBinding.buffer.uri.toString());
    }

    // if (!bufferBinding || !bufferBinding.fsPath) { return; }
    //this.bufferBindingsByBufferProxy.delete(bufferBinding.bufferProxy);
    (bufferBinding.bufferProxy as any).setBufferBinding(null);

    if (bufferBinding.buffer) {
      // this.bufferBindingsByTextDocument.delete(bufferBinding.buffer);
      // this.bufferBindingsByUri.delete(bufferBinding.buffer.uri.toString());
    }

    this.emitter.emit('did-change');
  }

  private removeEditorBinding(editorBinding?: EditorBinding) {
    if (!editorBinding) { return; }
    // if (!this.bufferBindings.has(editorBinding.bufferBinding.buffer.fsPath)) { return; }
    //this.editorBindings.delete(editorBinding.bufferBinding.buffer?.uri);
    if (editorBinding.editor) {
      this.editorBindingsByTextEditor.delete(editorBinding.editor);
    }
    //this.editorBindingsByEditorProxy.delete(editorBinding.editorProxy);
    (editorBinding.editorProxy as any).setEditorBinding(null);
  }

	// getBufferBindings() : Array<BufferBinding> {
	// 	return Array.from(this.bufferBindingsByBufferProxy, ([_, v]) => (v));    
	// }

  // getEditorBindings() : Array<EditorBinding> {
	// 	return Array.from(this.editorBindingsByEditorProxy, ([_, v]) => (v));
	// }

  getEditorBindingByEditor(editor: vscode.TextEditor) : EditorBinding | undefined {
    return this.editorBindingsByTextEditor.get(editor);
    // const proxyObj = this.getProxyObjectByUri(editor.document.uri);
    // if (!proxyObj) { return undefined; }

    // return this.getEditorBindingByEditorProxy(proxyObj.editorProxy);
  }

  // getEditorBindingsByDocument(buffer: vscode.TextDocument) : EditorBinding[] {
  //   let lst: EditorBinding[] = [];

  //   vscode.window.visibleTextEditors.forEach(editor => {
  //     if (editor.document === buffer) {
  //       const editorBinding = this.getEditorBindingByEditor(editor);
  //       if (editorBinding) { 
  //         lst.push(editorBinding); 
  //       }
  //     }
  //   });

  //   return lst;
  // }

  getEditorBindingByEditorProxy(editorProxy: EditorProxy) : EditorBinding | undefined {
    //return this.editorBindingsByEditorProxy.get(editorProxy);
    const getBindingFunc = (editorProxy as unknown as IEditorProxyExt).getEditorBinding;
    if (!getBindingFunc) { return undefined; }
    return getBindingFunc();
  }

  // getBufferBindingByUri(uri: vscode.Uri | string): BufferBinding | undefined {
  //   if (typeof uri === 'string') {
  //     return this.bufferBindingsByUri.get(uri);
  //   } else {
  //     return this.bufferBindingsByUri.get(uri.toString());
  //   }
  // }

  getBufferBindingByBuffer(buffer: vscode.TextDocument) : BufferBinding | undefined {
    // return this.bufferBindingsByTextDocument.get(buffer);
    const proxyObj = this.getProxyObjectByUri(buffer.uri);
    return this.getBufferBindingByBufferProxy(proxyObj?.bufferProxy);
  }

  getBufferBindingByBufferProxy(bufferProxy: BufferProxy | undefined) : BufferBinding | undefined {
    //return this.bufferBindingsByBufferProxy.get(bufferProxy);
    if (!bufferProxy) { return undefined; }
    const getBindingFunc = (bufferProxy as unknown as IBufferProxyExt).getBufferBinding;
    if (!getBindingFunc) { return undefined; }
    return getBindingFunc();
  }

  // 현재 활성화 된 editor들과 editorProxy를 연결시켜서 동기화시킨다.
  async synchronizedShowingEditors(editors : vscode.TextEditor[] | undefined = vscode.window.visibleTextEditors) {
    if (editors) {
      let newList = new Map(this.editorBindingsByTextEditor);
      this.editorBindingsByTextEditor.clear();

      editors.forEach(async (editor) => {

        const proxyObj = this.getProxyObjectByUri(editor.document.uri);
        if (proxyObj) {
          let editorBinding = this.getEditorBindingByEditorProxy(proxyObj.editorProxy);
          if (editorBinding){ 
            newList.delete(editor);
            editorBinding.setTextEditor(editor);
            this.editorBindingsByTextEditor.set(editor, editorBinding);
          } else {
            const bufferBinding = this.getBufferBindingByBufferProxy(proxyObj.bufferProxy);
            if (bufferBinding) {
              editorBinding = this.createEditorBinding(editor, proxyObj.editorProxy, bufferBinding);
              if (editorBinding) {
                this.editorBindingsByTextEditor.set(editor, editorBinding);
              }
            }
          }

          if (editorBinding?.editor) {
            const bufferBinding = this.getBufferBindingByBufferProxy(proxyObj.bufferProxy);
            if (bufferBinding) {
              await bufferBinding.applyUpdate(editorBinding?.editor);
            }
            editorBinding.applyUpdate();
          }
        }
      });
       
      newList.forEach(editorBinding => {
        // editorBinding.editorProxy.dispose();
        editorBinding.setTextEditor(undefined);
      });
    }

    // this.debugWorkspaceInfo();    
  }

  public showEditor(item: any) {
    if (item instanceof vscode.Uri || typeof item === 'string') {
      // const bufferBiding = this.getBufferBindingByUri(item);
      // if (bufferBiding?.buffer) {
      //   vscode.window.showTextDocument(bufferBiding.buffer);
      // } else {
         vscode.commands.executeCommand('vscode.open', item);
      // }
    }
  }  

  // ============ 이벤트 핸들러 ===================

  onDidChange(callback: () => void) {
    return this.emitter.on('did-change', callback);
  }

  hasPaneItem(paneItem: vscode.TextEditor) : boolean {
    // return this.editorProxiesByEditor.has(paneItem);
    // return this.editorBindingsByTextEditor.has(paneItem);
    return this.getEditorBindingByEditor(paneItem) !== undefined;
  }

  private didRequireUpdateBuffer(bufferBinding: BufferBinding) {
    for (let i:number = 0; i < vscode.window.visibleTextEditors.length; i++) {
      const editor = vscode.window.visibleTextEditors[i];
      if (editor.document === bufferBinding.buffer) {
        bufferBinding.applyUpdate(editor);
        break;
      }
    }
  }

  // getActivePaneItem() : vscode.TextEditor {
  //   return this.newActivePaneItem || vscode.window.activeTextEditor;
  // }

	private registerWorkspaceEvents () {
    vscode.workspace.onDidOpenTextDocument(this.didOpenTextDocument.bind(this));
    vscode.workspace.onDidCloseTextDocument(this.didCloseTextDocument.bind(this));
		vscode.workspace.onDidChangeTextDocument(this.didChangeTextDocument.bind(this));
		vscode.workspace.onWillSaveTextDocument(this.saveDocument.bind(this));

    vscode.window.onDidChangeActiveTextEditor(this.didChangeActiveTextEditor.bind(this));
    vscode.window.onDidChangeVisibleTextEditors(this.didChangeVisibleTextEditors.bind(this));
    vscode.window.onDidChangeTextEditorSelection(this.didSelectionChanges.bind(this));
    vscode.window.onDidChangeTextEditorVisibleRanges(this.didViewRangeChanges.bind(this));
	}

	private didChangeTextDocument (event : vscode.TextDocumentChangeEvent) {
    const bufferBinding = this.getBufferBindingByBuffer(event.document);
    if (bufferBinding) {
      if (bufferBinding.bufferUpdateState !== 1) {
        // if (!bufferBinding.disableHistory) {
          const doc = bufferBinding.changeBuffer(event.contentChanges);
        // }
      }
      if (bufferBinding.bufferUpdateState === 2) {
        bufferBinding.bufferUpdateState = 0;
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

    const proxyObject = this.proxyObjectsByUri.get(buffer.uri.toString());
    if (proxyObject) {
      const bufferBinding = this.getBufferBindingByBufferProxy(proxyObject.bufferProxy);
      if (bufferBinding) {
        bufferBinding?.setBuffer(buffer);
        // if (!this.bufferBindingsByTextDocument.has(buffer)) {
        //   this.bufferBindingsByTextDocument.set(buffer, bufferBinding);
        // }
        // if (!this.bufferBindingsByUri.has(buffer.uri.toString())) {
        //   this.bufferBindingsByUri.set(buffer.uri.toString(), bufferBinding);
        // }
      }
    }
  }

  private didChangeActiveTextEditor(editor?: vscode.TextEditor) {
    if (editor) {
      const proxyObj = this.getProxyObjectByUri(editor.document.uri);
      if (proxyObj){
        proxyObj.portal.activateEditorProxy(proxyObj.editorProxy);
      }
    } else {

    }
  }

  private didChangeVisibleTextEditors(editors?: vscode.TextEditor[]) {
    this.synchronizedShowingEditors(editors);
  }

  private didCloseTextDocument(buffer: vscode.TextDocument) {
    const bufferBiding = this.getBufferBindingByBuffer(buffer);
    if (bufferBiding) {
      //if (bufferBiding.bufferProxy.isHost) {
        // bufferBiding.portal.editorProxiesById.forEach(editorProxy => {
        //   if(editorProxy.bufferProxy === bufferBiding.bufferProxy) {
        //     editorProxy.dispose();
        //   }          
        // });
        bufferBiding.bufferProxy.dispose();
      //   const proxyObject = this.proxyObjectByUri.get(bufferBiding.uri);
      //   if (proxyObject) {
      //     proxyObject.editorProxy?.dispose();
      //     this.proxyObjectByUri.delete(bufferBiding.uri);
      //   }
      // }

      // this.removeBufferBinding(bufferBiding);

      // this.bufferBindingsByTextDocument.delete(buffer);
      // this.bufferBindingsByUri.delete(buffer.uri.toString());

      // const editorBinding = this.editorBindingsByBuffer.get(bufferBiding.editor.document);
      // if (editorBinding) {
      //   editorBinding.editorProxy?.dispose();
      //   this.removeEditorBinding(editorBinding);
      // }
      // this.emitter.emit('did-change');
    }
  }

	private didSelectionChanges (event: vscode.TextEditorSelectionChangeEvent) {
    const editorBinding = this.getEditorBindingByEditor(event.textEditor);
    if (editorBinding) {
      editorBinding.updateSelections(event.selections);
    }
  }

	private didViewRangeChanges (event: vscode.TextEditorVisibleRangesChangeEvent) {
    const editorBinding = this.getEditorBindingByEditor(event.textEditor);
    if (editorBinding) {
      // editorBinding.editorDidChangeScrollTop(event.visibleRanges);
      // editorBinding.editorDidChangeScrollLeft(event.visibleRanges);
      // editorBinding.editorDidResize(event.visibleRanges);
      // console.log(event.textEditor.visibleRanges[0]);
      // console.log(event.visibleRanges[0]);
    }
  }

  public refresh() {
    this.emitter.emit('did-change');
  }

  public debugWorkspaceInfo() {
    console.log(`>>> proxyObjectByUri (${this.proxyObjectsByUri.size}): `);
    this.proxyObjectsByUri.forEach((v, k) => {
      console.log(`${k} : ${v.bufferProxy.uri} - ${v.editorProxy.id}`);
    });    

    console.log(`>>> editorBindingsByTextEditor (${this.editorBindingsByTextEditor.size}): `);
    this.editorBindingsByTextEditor.forEach((v, k) => {
      console.log(`${k.document.uri.toString()} : ${v.title}`);
    });

    console.log("=======================");
  }
}
