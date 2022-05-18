import * as vscode from 'vscode';
import HostPortalBinding from './host-portal-binding';
import PortalBindingManager from './portal-binding-manager';

export class TeleteypStatusProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'teletype.statusView';
    private webView?: vscode.Webview;

    constructor(private disp?: vscode.Disposable, private portalBindingManager?: PortalBindingManager) {
      portalBindingManager?.onDidChange(this.didPortalBindingChanged.bind(this));
    }

    didPortalBindingChanged(event: any): void {
      // vscode.window.showInformationMessage(`success~~~~~~~!!!!!!! ${event.portalBinding.uri}`);
      // if (event.type === 'share-portal') {
        this.webView?.postMessage({command: 'host-uri', text: event.portalBinding?.uri});
      // } else if (event.type === 'close-portal') {
      //   this.webView?.postMessage({command: 'host-uri', text: ''});
      // }
    }

    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = `<!DOCTYPE html>
<html>
<head>
  <script>
    const vsCode = acquireVsCodeApi();
    let state = {xxx: 'xxx'};
    window.addEventListener('message', event => {
      const message = event.data; // The JSON data our extension sent

      console.log(event);
      switch (message.command) {
          case 'message':
            vsCode.postMessage({command: 'message', text: message.text});
            break;
          case 'host-uri':
            console.log(document.getElementById('host-uri'));
            if (message.text) {
              document.getElementById('host-uri').value = message.text;
            } else {
              document.getElementById('host-uri').value = '';
            }
            const btn = document.getElementById('share-portal-btn');
            if (!btn.value) {
              btn.value = true;
              btn.innerText = 'Close Host Portal';
            } else {
              btn.value = false;
              document.getElementById('share-portal-btn').innerText = 'Share Host Portal';
            }
            break;
        }
    });

    function sharePortal() {
      const elem = document.getElementById('share-portal-btn');
      if (!elem.value) {
        vsCode.postMessage({command: 'share-portal', text: 'share-portal'});
      } else {
        vsCode.postMessage({command: 'close-portal', text: 'share-portal'});
      }
    }

    function copyUri() {
      const text = document.getElementById('host-uri').value;
      if (text) {
        navigator.clipboard.writeText(text);
        vsCode.postMessage({command: 'message', text: 'uri copy to clipboard'});
      } else {
        vsCode.postMessage({command: 'message', text: 'uri empty', type: 'error'});
      }
    }

  </script>
</head>
<body>
    Teletype <br>
    <div><button type="button" onclick="vsCode.postMessage({command: 'signin', text: 'signin'});">Teletype signin</button></div>
    Host <br>
    <div><button id="share-portal-btn" type="button" onclick="sharePortal()">Share Portal</button></div>
    <div><input id="host-uri"></input><button type="button" onclick="copyUri()">&gt;</button></div>
    Guest <br>
    <div><button type="button" onclick="vsCode.postMessage({command: 'join-portal', text: 'join-portal'});">Join Portal</button></div>
</body>
</html>`;

        webviewView.webview.onDidReceiveMessage(message => {
          switch (message.command) {
            case 'message':
              if (message.type === 'warning') {
                vscode.window.showWarningMessage(message.text);
              } else if (message.type === 'error') {
                vscode.window.showErrorMessage(message.text);
              } else {
                vscode.window.showInformationMessage(message.text);
              }
              break;
            case 'signin':
              vscode.commands.executeCommand('extension.teletype-signin');
              vscode.window.showInformationMessage(message.text);
              break;
            case 'share-portal':
              vscode.commands.executeCommand('extension.share-portal');
              vscode.window.showInformationMessage(message.text);
              break;
            case 'close-portal':
              vscode.commands.executeCommand('extension.close-host-portal');
              vscode.window.showInformationMessage(message.text);
              break;
            case 'join-portal':
              vscode.commands.executeCommand('extension.join-portal');
              vscode.window.showInformationMessage(message.text);
              break;
            case 'alert':
              vscode.window.showWarningMessage(message.text);
              break;
            case 'test':
              webviewView.webview.postMessage({command: 'xxxxxx'});
              break;
          }            
        });

        this.webView = webviewView.webview;    
    }
}
