import * as vscode from "vscode";
import { getNonce } from "./getNonce";
import { ReferenceDetail  } from "./types";

import path from "path";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  private _isAuthenticated: boolean = false;
  private _userData?: ReferenceDetail ;

  // constructor(private readonly _extensionUri: vscode.Uri) {}
  constructor(private readonly _extensionUri: vscode.Uri) {
    // Try to load user data from global state on initialization
    const userData = vscode.workspace.getConfiguration().get('ReferenceDetail ') ||
                    vscode.workspace.getConfiguration().get('matlab.userData');
    if (userData) {
      this._userData = userData as ReferenceDetail ;
    }
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {

        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
        case "signIn": {
          // Execute the authentication command
          vscode.commands.executeCommand('matlab.authenticate');
          break;
        }
        case "signOut": {
          vscode.commands.executeCommand('matlab.signOut');
          break;
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

   public updateAuthStatus(isAuthenticated: boolean, userData?: ReferenceDetail ) {
    this._isAuthenticated = isAuthenticated;
    this._userData = userData;

    if (this._view) {
      // Update the webview content based on authentication status
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();


    let contentHtml;


   if (this._userData) {
      // User is signed in - show profile info
      contentHtml = `
        <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif;">
          <h2 style="margin-bottom: 10px;">Hello from MATLAB Extension</h2>
          <h4 style="margin-top: 0; color: green;">Connected to MATLAB</h4>
          <div style="margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">

            <h3 style="margin: 10px 0;">${this._userData.displayName }</h3>




            <p style="margin: 5px 0; color: gray;">${this._userData.email}</p>
          </div>
          <button
            id="signOutButton"
            style="margin-top: 20px; padding: 10px 20px; font-size: 14px; border: none; border-radius: 5px; background-color: #f44336; color: white; cursor: pointer;">
            Sign Out
          </button>
        </div>
      `;
    } else {
      // User is not signed in - show sign in button
      contentHtml = `
        <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif;">
          <h2 style="margin-bottom: 10px;">Hello from MATLAB Extension</h2>
          <h4 style="margin-top: 0; color: gray;">You are not connected to MATLAB</h4>
          <div style="margin-top: 20px;">
            <strong>Sign in to MATLAB</strong><br>
          </div>
          <button
            id="signInButton"
            style="margin-top: 20px; padding: 10px 20px; font-size: 14px; border: none; border-radius: 5px; background-color: #0076A8; color: white; cursor: pointer;">
            Sign In
          </button>
        </div>
      `;
    }

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${
          webview.cspSource
        }; script-src 'nonce-${nonce}';frame-src https:; child-src https:;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
      </head>
      <body>
        ${contentHtml}
        <script nonce="${nonce}">
        (function() {
          const vscode = acquireVsCodeApi();

          document.addEventListener('DOMContentLoaded', function() {
            const signInButton = document.getElementById('signInButton');
            if (signInButton) {
              signInButton.addEventListener('click', function() {
                vscode.postMessage({
                  type: 'signIn'
                });
              });
            }

            const signOutButton = document.getElementById('signOutButton');
            if (signOutButton) {
              signOutButton.addEventListener('click', function() {
                vscode.postMessage({
                  type: 'signOut'
                });
              });
            }
          });
        })();
        </script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}