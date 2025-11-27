import * as vscode from "vscode";
import { ReferenceDetail } from "./types";

interface LicensingInfo {
  type: "oauth";
  expiry: string;
  email_addr: string;
  first_name: string;
  last_name: string;
  display_name: string;
  user_id: string;
  source_id: string;
  entitlements?: Array<{
    id: string;
    name: string;
    expiry: string;
    status: string;
    product_number: string;
    license_use: string;
    permissions: string;
    version: string;
  }>;
  entitlement_id?: string;
}

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  private _isAuthenticated: boolean = false;
  private _userData?: ReferenceDetail;
  private _licensingInfo?: LicensingInfo;
  constructor(private readonly _extensionUri: vscode.Uri) {
    this.loadUserData();
  }

  private loadUserData(): void {
    const userData = vscode.workspace.getConfiguration().get("matlab.userData");
    if (userData) {
      this._userData = userData as ReferenceDetail;
      this._isAuthenticated = true;
    } else {
      this._isAuthenticated = false;
      this._userData = undefined;
    }

    //licensing
    const licensingInfo = vscode.workspace
      .getConfiguration()
      .get("matlab.licensingInfo");
    if (licensingInfo) {
      this._licensingInfo = licensingInfo as LicensingInfo;
    }
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
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
          vscode.commands.executeCommand("matlab.authenticate");
          break;
        }
        case "signOut": {
          vscode.commands.executeCommand("matlab.signOut");
          break;
        }

      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  public updateAuthStatus(
    isAuthenticated: boolean,
    userData?: ReferenceDetail
  ) {
    this._isAuthenticated = isAuthenticated;
    this._userData = userData;

    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  public updateLicensingInfo(licensingInfo: LicensingInfo | null) {
    this._licensingInfo = licensingInfo || undefined;

    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }
  private _getHtmlForWebview(webview: vscode.Webview) {
    const selectedEntitlement = this._licensingInfo?.entitlement_id
      ? this._licensingInfo.entitlements?.find(
          (e) => e.id === this._licensingInfo?.entitlement_id
        )
      : this._licensingInfo?.entitlements?.[0];

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MATLAB Sidebar</title>
      <style>
        body {
          padding: 10px;
          color: var(--vscode-foreground);
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
        }

        .accordion {
          margin-bottom: 10px;
        }

        .accordion-item {
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          margin-bottom: 8px;
          overflow: hidden;
        }

        .accordion-header {
          background-color: var(--vscode-sideBar-background);
          padding: 12px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          transition: background-color 0.2s;
        }

        .accordion-header:hover {
          background-color: var(--vscode-list-hoverBackground);
        }

        .accordion-header.active {
          background-color: var(--vscode-list-activeSelectionBackground);
        }

        .accordion-title {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .accordion-icon {
          transition: transform 0.2s;
          font-size: 12px;
        }

        .accordion-icon.expanded {
          transform: rotate(90deg);
        }

        .accordion-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
          background-color: var(--vscode-editor-background);
        }

        .accordion-content.expanded {
          max-height: 500px;
          transition: max-height 0.3s ease-in;
        }

        .accordion-body {
          padding: 12px;
        }

        .button {
          width: 100%;
          padding: 8px 12px;
          margin-bottom: 8px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 2px;
          cursor: pointer;
          font-size: 13px;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }

        .button:active {
          background-color: var(--vscode-button-background);
        }

        .button-secondary {
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }

        .button-secondary:hover {
          background-color: var(--vscode-button-secondaryHoverBackground);
        }
           .button-danger {
          background-color: #d32f2f;
          color: white;
        }

        .info-item {
          padding: 8px 0;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 700;
          color: var(--vscode-foreground);
          margin-bottom: 4px;
           font-size: 14px;
        }

        .info-value {
          color: var(--vscode-descriptionForeground);
          font-size: 15px;
          font-weight: 500;
        }

        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .status-connected {
          background-color: var(--vscode-testing-iconPassed);
          color: white;
        }

        .status-disconnected {
          background-color: var(--vscode-testing-iconFailed);
          color: white;
        }

        .divider {
          height: 1px;
          background-color: var(--vscode-panel-border);
          margin: 16px 0;
        }
      </style>
    </head>
    <body>
      <div class="accordion">
        <!-- Authentication Section -->
        <div class="accordion-item">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <div class="accordion-title">
              <span class="accordion-icon">▶</span>
              <span>🔒 Authentication</span>
            </div>
            <span class="status-badge ${
              this._isAuthenticated ? "status-connected" : "status-disconnected"
            }">
              ${this._isAuthenticated ? "✓ Connected" : "✗ Disconnected"}
            </span>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              ${
                this._isAuthenticated
                  ? `
                <div class="info-item">
                  <div class="info-label">User Information</div>
                  <div class="info-value">${
                    this._userData?.displayName || "N/A"
                  }</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email</div>
                  <div class="info-value">${
                    this._userData?.email || "N/A"
                  }</div>
                </div>

                  ${
                    this._licensingInfo?.entitlements &&
                    this._licensingInfo.entitlements.length > 0
                      ? `
                  <div class="license-info">

    <div class="info-item">
      <div class="info-label">License Name</div>
      <div class="info-value highlight-value">${
        selectedEntitlement?.name || "N/A"
      }</div>
    </div>
    <div class="info-item">
      <div class="info-label">License Number</div>
      <div class="info-value highlight-value">${
        selectedEntitlement?.product_number || "N/A"
      }</div>
    </div>
    ${
      selectedEntitlement?.license_use
        ? `
    <div class="info-item">
      <div class="info-label">License Use</div>
      <div class="info-value">${selectedEntitlement.license_use}</div>
    </div>
    `
        : ""
    }
    ${
      selectedEntitlement?.permissions
        ? `
    <div class="info-item">
      <div class="info-label">Permissions</div>
      <div class="info-value">${selectedEntitlement.permissions}</div>
    </div>
    `
        : ""
    }
    <div class="info-item">
      <div class="info-label">Expiry Date</div>
      <div class="info-value">${
        selectedEntitlement?.expiry
          ? new Date(selectedEntitlement.expiry).toLocaleDateString()
          : "N/A"
      }</div>
    </div>
    <div class="info-item">
      <div class="info-label">Status</div>
      <div class="info-value">${selectedEntitlement?.status || "N/A"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">MATLAB Version</div>
      <div class="info-value">${selectedEntitlement?.version || "N/A"}</div>
    </div>
  </div>
`
                      : ""
                  }

                <div class="divider"></div>
                <button class="button button-danger" onclick="signOut()">
                  🚪 Sign Out
                </button>
              `
                  : `
                <p>Not connected to  MATLAB </p>
                <button class="button" onclick="signIn()">
                  🔑 Sign In
                </button>
              `
              }
            </div>
          </div>
        </div>

        <!-- MATLAB Extension Section -->
        <div class="accordion-item">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <div class="accordion-title">
              <span class="accordion-icon">▶</span>
              <span>📦Copilot</span>
            </div>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              <button class="button" onclick="checkExtension()">
                💬 chat
              </button>

            </div>
          </div>
        </div>

        <!-- Commands Section -->
        <div class="accordion-item">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <div class="accordion-title">
              <span class="accordion-icon">▶</span>
              <span>⚡ Quick Actions</span>
            </div>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              <button class="button" onclick="runFile()">
                ▶️ something
              </button>
              <button class="button" onclick="sendMessage('onInfo', 'Run Section')">
                📄 Run Section
              </button>
              <button class="button" onclick="sendMessage('onInfo', 'Run Selection')">
                ✂️ Run Selection
              </button>
            </div>
          </div>
        </div>

        <!-- Settings Section -->
        <div class="accordion-item">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <div class="accordion-title">
              <span class="accordion-icon">▶</span>
              <span>⚙️ MATLAB Extension</span>
            </div>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              <div class="info-item">
                <div class="info-label">Version</div>
                <div class="info-value">1.0.0</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>
  <!-- Help & Feedback Section -->
        <div class="accordion-item">
          <div class="accordion-header" onclick="toggleAccordion(this)">
            <div class="accordion-title">
              <span class="accordion-icon">▶</span>
              <span>💬 Help & Feedback</span>
            </div>
          </div>
          <div class="accordion-content">
            <div class="accordion-body">
              <p class="help-description">
                Access MATLAB documentation, tutorials, and support resources.
              </p>
              </br>
              <a href="https://www.mathworks.com/help/matlab/" class="link-button" onclick="openExternal(event, this.href)">
                <span>📚 MATLAB Documentation</span>
                <span class="link-icon">↗</span>
              </a>
              </br>
              <a href="https://www.mathworks.com/help/matlab/getting-started-with-matlab.html" class="link-button" onclick="openExternal(event, this.href)">
                <span>🚀 Getting Started Guide</span>
                <span class="link-icon">↗</span>
              </a>
              </br>
              <a href="https://www.mathworks.com/support.html" class="link-button" onclick="openExternal(event, this.href)">
                <span>🛠️ Technical Support</span>
                <span class="link-icon">↗</span>
              </a>
              </br>
              <a href="https://www.mathworks.com/matlabcentral/" class="link-button" onclick="openExternal(event, this.href)">
                <span>🌐 MATLAB Central</span>
                <span class="link-icon">↗</span>
              </a>

              <div class="divider"></div>

              <a href="https://www.mathworks.com/products/matlab/feedback.html" class="link-button" onclick="openExternal(event, this.href)">
                <span>💭 Send Feedback</span>
                <span class="link-icon">↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        function toggleAccordion(header) {
          const content = header.nextElementSibling;
          const icon = header.querySelector('.accordion-icon');

          // Close all other accordions
          document.querySelectorAll('.accordion-content').forEach(item => {
            if (item !== content) {
              item.classList.remove('expanded');
              item.previousElementSibling.classList.remove('active');
              item.previousElementSibling.querySelector('.accordion-icon').classList.remove('expanded');
            }
          });

          // Toggle current accordion
          content.classList.toggle('expanded');
          header.classList.toggle('active');
          icon.classList.toggle('expanded');
        }

        function sendMessage(type, value) {
          vscode.postMessage({ type, value });
        }

        function signIn() {
          vscode.postMessage({ type: 'signIn' });
        }

        function signOut() {
          vscode.postMessage({ type: 'signOut' });
        }

        function checkExtension() {
          vscode.postMessage({ type: 'checkExtension' });
        }

        function openCommandWindow() {
          vscode.postMessage({ type: 'openCommandWindow' });
        }

        function runFile() {
          vscode.postMessage({ type: 'runFile' });
        }
           function openExternal(event, url) {
          event.preventDefault();
          vscode.postMessage({
            type: 'openExternal',
            value: url
          });
        }
      </script>
    </body>
    </html>`;
  }
}
