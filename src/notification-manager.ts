import * as vscode from 'vscode';

export default class NotificationManager {

    public addInfo(message: string, options: { description: string; dismissable: boolean; } | undefined = undefined) {
        vscode.window.showInformationMessage(message);
    }

    public addError(message: string, options: { description: string; dismissable: boolean; } | undefined = undefined) {
        vscode.window.showErrorMessage(message);
    }

}