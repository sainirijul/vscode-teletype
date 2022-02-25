import * as vscode from 'vscode';
import * as teletype from './teletype-types';

export function convertToTeletypePosition(position: vscode.Position): teletype.Position {
    return {
        column: position.character,
        row: position.line
    } as teletype.Position;
}

export function convertToVSCodePosition(position: teletype.Position): vscode.Position {
    return new vscode.Position(
        position.row,
        position.column
    );
}

export function convertToVSCodeRange(range: teletype.Range): vscode.Range {
    return new vscode.Range(
        convertToVSCodePosition(range.start),
        convertToVSCodePosition(range.end)
    );
}
