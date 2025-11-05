
import * as vscode from "vscode";
import * as path from 'path';
import { SidebarProvider } from "./SidebarProvider";
import { HelloWorldPanel } from "./HelloWorldPanel";
import { ReferenceDetail  } from "./types";
import { OAuthClient } from "./OAuthClient";

export const CONNECTION_STATUS_LABELS = {
  CONNECTED: 'MATLAB: Connected',
  NOT_CONNECTED: 'MATLAB: Not Connected',
  CONNECTING: 'MATLAB: Establishing Connection'
};

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "matlab" is now active!');

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = CONNECTION_STATUS_LABELS.NOT_CONNECTED;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Initialize sidebar provider
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("matlab-sidebar", sidebarProvider)
  );

  // Initialize OAuth client
  const oauthClient = new OAuthClient(statusBarItem, sidebarProvider);
    // Start the OAuth server
//   try {
//      oauthClient.startServer();
//     console.log("OAuth server started successfully");
//   } catch (error) {
//     console.error("Failed to start OAuth server:", error);
//     vscode.window.showErrorMessage("Failed to start MATLAB authentication server. Please try again.");
//   }
  context.subscriptions.push({ dispose: () => oauthClient.dispose() });

  // Register authentication command
  context.subscriptions.push(
    vscode.commands.registerCommand('matlab.authenticate', async () => {
      statusBarItem.text = CONNECTION_STATUS_LABELS.CONNECTING;
      await oauthClient.loginHandler();
    })
  );

  // Register sign out command
  context.subscriptions.push(
    vscode.commands.registerCommand('matlab.signOut', async () => {
      // Clear user data
      await vscode.workspace.getConfiguration().update('ReferenceDetail ', undefined, vscode.ConfigurationTarget.Global);

      // Update status
      statusBarItem.text = CONNECTION_STATUS_LABELS.NOT_CONNECTED;
      sidebarProvider.updateAuthStatus(false);

      vscode.window.showInformationMessage('Signed out from MATLAB successfully');
    })
  );

  // Register URI handler for auth callback
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
       console.log("Received URI:", uri.toString());

  if (uri.path === '/auth-complete') {
    const query = new URLSearchParams(uri.query);
    const userDataStr = query.get('userData');

    if (userDataStr) {
      try {
        const userData = JSON.parse(decodeURIComponent(userDataStr)) as ReferenceDetail ;
        console.log("Parsed user data:", userData);

        // Save user data to configuration
        vscode.workspace.getConfiguration().update('ReferenceDetail ', userData, vscode.ConfigurationTarget.Global);

        // Update status
        statusBarItem.text = CONNECTION_STATUS_LABELS.CONNECTED;
        sidebarProvider.updateAuthStatus(true, userData);

        // Show a more detailed success message
        vscode.window.showInformationMessage(
          `Successfully connected to MATLAB as ${userData.displayName }`,
          'OK'
        );
      } catch (error) {
        console.error('Error parsing user data:', error);
        vscode.window.showErrorMessage('Failed to parse authentication data');
        statusBarItem.text = CONNECTION_STATUS_LABELS.NOT_CONNECTED;
      }
    }
  }
  return;
}
    })
  );

  // Check if user is already authenticated on startup
  const userData = vscode.workspace.getConfiguration().get('ReferenceDetail ') as ReferenceDetail  | undefined;
  if (userData) {
    statusBarItem.text = CONNECTION_STATUS_LABELS.CONNECTED;
    sidebarProvider.updateAuthStatus(true, userData);
  }
}
