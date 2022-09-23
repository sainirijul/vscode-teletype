import * as vscode from 'vscode';
import { fs } from 'memfs';
import { Dirent } from 'memfs/lib/Dirent';
import { TextEncoder } from 'util';

export class MemFS implements vscode.FileSystemProvider {
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    constructor() {
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        const fstat = fs.statSync(uri.fsPath);
        let type: vscode.FileType = vscode.FileType.Unknown;
        if (fstat.isDirectory()) {
            type = vscode.FileType.Directory;
        } else if (fstat.isFile()) {
            type = vscode.FileType.File;
        }
        return {
            type: type,
            ctime: fstat.ctime.getTime(),
            mtime: fstat.mtime.getTime(),
            size: fstat.size            
        };        
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        const dirs = fs.readdirSync(uri.fsPath, {withFileTypes: true});
        return dirs.map<[string, vscode.FileType]>((value,index,array) => {
            if (value instanceof Dirent) {
                const dirent = value as Dirent;
                return [dirent.name as string, dirent.isDirectory() ? vscode.FileType.Directory : dirent.isFile() ? vscode.FileType.File : vscode.FileType.Unknown];
            } else if (typeof value === 'string') {
                return [value as string, vscode.FileType.Unknown];
            } else {
                return ['', vscode.FileType.Unknown];
            }            
        });
    }

    readFile(uri: vscode.Uri): Uint8Array {
        const v = fs.readFileSync(uri.fsPath);
        if (v instanceof Buffer) {
            return new Uint8Array(v as Buffer);
        } else if (typeof v === 'string') {
            return new TextEncoder().encode(v as string);
        }
        return new Uint8Array();
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        fs.writeFileSync(uri.fsPath, content);
    }

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        fs.renameSync(oldUri.fsPath, newUri.fsPath);
    }

    delete(uri: vscode.Uri): void {
        fs.unlinkSync(uri.fsPath);
    }

    createDirectory(uri: vscode.Uri): void {
        //fs.mkdirSync(uri.fsPath);
        fs.mkdirpSync(uri.fsPath);
    }

    watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        return new vscode.Disposable(() => { });        
    }
}
