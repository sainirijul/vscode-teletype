import * as vscode from 'vscode';
import { AuthenticationProvider } from './authentication-provider';
import getAvatarUrl from './get-avatar-url';
import HostPortalBinding from './host-portal-binding';
import PortalBindingManager from './portal-binding-manager';

export class TeleteypStatusProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'teletype.statusView';
    private webView?: vscode.Webview;
    private portalBindingUri: string | undefined;
    private identify: any;

    constructor(private disp?: vscode.Disposable, private authenticationProvider?: AuthenticationProvider, private portalBindingManager?: PortalBindingManager) {
      authenticationProvider?.onDidChange(this.didChangeLogin.bind(this));
      portalBindingManager?.onDidChange(this.didPortalBindingChanged.bind(this));
    }

    refreshIdentify(): void {
      if (this.identify) {
        const avatarUrl = getAvatarUrl(this.identify.login, 64);
        this.webView?.postMessage({command: 'identify', text: {loginId: this.identify.login, avatarUrl}});
      }
    }

    didChangeLogin(): void {
      this.identify = this.authenticationProvider?.getIdentity();
      this.refreshIdentify();
    }

    didPortalBindingChanged(event: any): void {
      if (event.type === 'share-portal') {
          this.portalBindingUri = event.uri;
          this.webView?.postMessage({command: 'host-uri', text: this.portalBindingUri});
      } else if (event.type === 'close-portal') {
          this.portalBindingUri = undefined;
          this.webView?.postMessage({command: 'host-uri', text: ''});
      }
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
    let loginId;
    let avatarUrl;
    let hostUrl;

    window.addEventListener('message', event => {
      const message = event.data; // The JSON data our extension sent

      console.log(event);
      switch (message.command) {
          case 'message':
            vsCode.postMessage({command: 'message', text: message.text});
            break;
          case 'identify':
            if (message.text) {
              loginId = message.text.loginId;
              avatarUrl = message.text.avatarUrl;
              updateState();
            }
            break;
          case 'host-uri':
            // if (message.text) {
              hostUrl = message.text;
              updateState();
            // }
            break;
        }
    });

    function updateState() {
      const login = document.getElementById('login');
      login.innerText = loginId;
      const avatar = document.getElementById('avatar-img');
      avatar.src = avatarUrl;

      const btn = document.getElementById('share-portal-btn');
      const url = document.getElementById('host-uri');
      if (hostUrl) {
        url.value = hostUrl;
        btn.value = true;
        btn.innerText = 'Close Host Portal';
      } else {
        url.value = '';
        btn.value = false;
        btn.innerText = 'Share Host Portal';
      }
    }

    function sharePortal() {
      const elem = document.getElementById('share-portal-btn');
      //if (!elem.value) {
      if (!hostUrl) {
        vsCode.postMessage({command: 'share-portal', text: 'share-portal'});
      } else {
        vsCode.postMessage({command: 'close-portal', text: 'close-portal'});
        hostUrl = '';
        updateState();
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

    // initialize
    vsCode.postMessage({command: 'refresh', text: '*'});
  </script>
</head>
<body>
    Teletype <br>
    <div id="login"></div>
    <div><image id="avatar-img"></image></div>
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
            case 'refresh':
              this.refreshIdentify();
              this.webView?.postMessage({command: 'host-uri', text: this.portalBindingUri});
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
