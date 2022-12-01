import * as vscode from 'vscode';

export default class NotificationManager {

    public addInfo(message: string, options: { description: string; dismissable: boolean; } | undefined = undefined) {
        vscode.window.showInformationMessage(message, 'OK');
    }

    public addError(message: string, options: { description: string; dismissable: boolean; } | undefined = undefined) {
        vscode.window.showErrorMessage(message, 'OK');
    }

    public addWarn(message: string, options: { description: string; dismissable: boolean; } | undefined = undefined) {
        vscode.window.showWarningMessage(message, 'OK');
    }

    public addTrace(message: string, options: { description: string; dismissable: boolean; } | undefined = undefined) {
        vscode.window.showInformationMessage(message);
    }

    public async confirm(message: string): Promise<boolean> {
        const answer = await vscode.window.showInformationMessage(message, "Yes", "No");

        if (answer === "Yes") {
            return true;
        } else {
            return false;
        }
    }
}