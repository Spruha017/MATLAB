import * as vscode from "vscode";

// import * as http from 'http';
// import * as url from 'url';
import * as crypto from "crypto";
import * as querystring from "querystring";
import fetch from "node-fetch";
import { ReferenceDetail } from "./types";

type Token = {
  authenticationDate: string;
  expirationDate: string;
  id: number;
  loginIdentifier: string;
  loginIdentifierType: string;
  referenceDetail: ReferenceDetail;
  referenceId: string;
  referenceType: string;
  source: string;
  tokenString: string;
  mfaTokenString: string;
  accessTokenString: string;
  token_type: string;
  access_token: string;
  expires_in: number;
  scope: string;
};

type SessionData = {
  initialUrl: string;
  authState: boolean;
  accessToken: string;
  codeVerifier: string;
  userInfo: ReferenceDetail | null;
};

interface Entitlement {
  id: string;
  name: string;
  expiry: string;
  status: string;
  product_number: string;
  license_use: string;
  permissions: string;
  version: string;
}
interface License {
  id: string;
  type: string;
  status: string;
  expiry: string;
  entitlements: Entitlement[];
}

interface LicensingInfo {
  type: "oauth";
  expiry: string;
  email_addr: string;
  first_name: string;
  last_name: string;
  display_name: string;
  user_id: string;
  source_id: string;
  entitlements?: Entitlement[];
  entitlement_id?: string;
}

const OAUTH_HOST =
  process.env.OAUTH_HOST || "https://signin-integ1.mathworks.com";
const mhlm_api_endpoint =
  "https://licensing-integ1.mathworks.com/mls/service/v1/entitlement/list";
const CLIENT_ID = "go-test-client";
const CLIENT_SECRET = "ramdomsecretkey";
const REDIRECT_URI = "vscode://spruhath.matlab";
const LICENSING_API_BASE = "https://licensing.mathworks.com/api/v1";
const DEFAULT_MATLAB_VERSION = "R2024b";

const ENV_SUFFIX = process.env.ENV_SUFFIX || "";


const sessionStore: Record<string, SessionData> = {};

export class OAuthClient {
  private codeVerifier: string = "";
  private sessionId: string = "";
  private statusBarItem: vscode.StatusBarItem;
  private sidebarProvider: any;
  private licensingInfo: LicensingInfo | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    statusBarItem: vscode.StatusBarItem,
    sidebarProvider: any
  ) {
    this.statusBarItem = statusBarItem;
    this.sidebarProvider = sidebarProvider;
  }

  private generateSessionId(): string {
    return crypto.randomBytes(4).toString("hex");
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash("sha256").update(verifier).digest();
    return Buffer.from(hash).toString("base64url");
  }

  public async loginHandler(): Promise<void> {
    this.sessionId = this.generateSessionId();
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);

    await this.context.secrets.store("matlab.codeVerifier", this.codeVerifier);
    await this.context.globalState.update("matlab.sessionId", this.sessionId);
    const matlabVersion =
      vscode.workspace.getConfiguration("MATLAB").get("version") ||
      DEFAULT_MATLAB_VERSION;
    // get matlabVersion from install path

    const authParams = {
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state: this.sessionId,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      txn_id: this.sessionId,
      release: "R2023a", // get version from setttings
      platform: process.platform === "darwin" ? "Mac OS X" : "Windows",
      profile_tier: "extended",
      locale: "en_US",
    };

    const authUrl = `${OAUTH_HOST}/oauth2/v1/oauth/authorize?${querystring.stringify(
      authParams
    )}`;
    this.statusBarItem.text = "MATLAB: Connecting...";

    vscode.env.openExternal(vscode.Uri.parse(authUrl));
  }

  public async handleAuthCallback(uri: vscode.Uri): Promise<void> {
    const query = new URLSearchParams(uri.query);
    const code = query.get("code");
    const state = query.get("state");

    const storedSessionId =
      this.context.globalState.get<string>("matlab.sessionId");

    if (!code) {
      vscode.window.showErrorMessage(
        "Authentication failed: No authorization code received"
      );
      this.statusBarItem.text = "MATLAB: Not Connected";
      return;
    }

    if (state !== this.sessionId) {
      vscode.window.showErrorMessage(
        "Authentication failed: Invalid state parameter"
      );
      this.statusBarItem.text = "MATLAB: Not Connected";
      return;
    }
    if (!storedSessionId || state !== storedSessionId) {
      vscode.window.showErrorMessage(
        "Authentication failed: Invalid state parameter."
      );
      this.statusBarItem.text = "MATLAB: Not Connected";
      return;
    }

    try {
      // Retrieve the stored code verifier
      const storedCodeVerifier = await this.context.secrets.get(
        "matlab.codeVerifier"
      );

      if (!storedCodeVerifier) {
        vscode.window.showErrorMessage(
          "Authentication failed: Missing code verifier."
        );
        this.statusBarItem.text = "MATLAB: Not Connected";
        return;
      }

      const tokenResponse = await this.exchangeAuthCodeForToken(
        code,
        storedCodeVerifier
      );
      // const userInfo = await this.fetchUserInfo(tokenResponse.access_token);
      console.log(tokenResponse);
      this.updateExtensionState(tokenResponse);
      await this.setLicensingOAuth(tokenResponse);

      // Update extension state
      this.updateExtensionState(tokenResponse);


    } catch (error) {
      console.error("Authentication error:", error);
      vscode.window.showErrorMessage(
        `Authentication failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      this.statusBarItem.text = "MATLAB: Not Connected";
    }

    // Clear temporary data
    await this.context.secrets.delete("matlab.codeVerifier");
    await this.context.globalState.update("matlab.sessionId", undefined);

    vscode.window.showInformationMessage("Successfully connected to MATLAB");

    // Open a success page in the browser
  }

  private async exchangeAuthCodeForToken(
    code: string,
    codeVerifier: string
  ): Promise<any> {
    const tokenEndpoint = `${OAUTH_HOST}/oauth2/v1/oauth/token`;

    const payload = {
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    };

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: querystring.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`OAuth server returned status ${response.status}`);
    }

    const token = (await response.json()) as Token;



    return token;
  }

  // required
  private async setLicensingOAuth(tokenResponse: Token): Promise<void> {
    // Get MATLAB version from settings
    const matlabVersion: string =
      vscode.workspace.getConfiguration("matlab").get<string>("version") ||
      DEFAULT_MATLAB_VERSION;

    // Create licensing info object similar to the MATLAB proxy implementation
    this.licensingInfo = {
      type: "oauth",
      expiry: tokenResponse.expirationDate,
      email_addr: tokenResponse.referenceDetail.email || "",
      first_name: tokenResponse.referenceDetail.firstName || "",
      last_name: tokenResponse.referenceDetail.lastName || "",
      display_name: tokenResponse.referenceDetail.displayName || "",
      user_id: tokenResponse.referenceDetail.userId || "",
      source_id: CLIENT_ID,
    };

    // Fetch entitlements
    const entitlements = await this.fetchEntitlements(
      tokenResponse.accessTokenString || tokenResponse.access_token || "",
      matlabVersion
    );

    this.licensingInfo.entitlements = entitlements || undefined;

    // Store licensing info in global state
    await this.context.globalState.update(
      "matlab.licensingInfo",
      this.licensingInfo
    );
    this.sidebarProvider.updateLicensingInfo(this.licensingInfo);
    console.log("Licensing info set:", this.licensingInfo);
  }

  // /// correct fetchEntitlements

  private async fetchEntitlements(
    accessToken: string,
    matlabVersion: string
  ): Promise<Entitlement[] | null> {
    try {
      // Create form data similar to the Python code
      const formData = new URLSearchParams({
        token: accessToken,
        release: matlabVersion,
        coreProduct: "ML",
        context: "vscode",
        excludeExpired: "true",
      });

      console.log(`Sending request to: ${mhlm_api_endpoint}`);

      const response = await fetch(mhlm_api_endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(
          `Communication with ${mhlm_api_endpoint} failed (${response.status}). For more details, see the MathWorks licensing portal.`
        );
      }

      const text = await response.text();

      // Parse XML response

      const parser = new (require("xml2js").Parser)({ explicitArray: false });
      const result = await parser.parseStringPromise(text);

      const root = result;
      const entitlementEl = root?.describe_entitlements_response?.entitlements;

      if (!entitlementEl || !entitlementEl.entitlement) {
        throw new Error(
          `Your MathWorks account is not linked to a valid license for MATLAB ${matlabVersion}. Sign out and login with a licensed user.`
        );
      }

      // Handle both single entitlement and array of entitlements
      const entitlements = Array.isArray(entitlementEl.entitlement)
        ? entitlementEl.entitlement
        : [entitlementEl.entitlement];

      return entitlements.map((entitlement: any) => ({
        id: String(entitlement.id || ""),
        name: String(entitlement.label || ""),
        // expiry: String(entitlement.expiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
        // status: String(entitlement.status || "blabla"),
        product_number: String(entitlement.license_number || ""),
        license_use: String(entitlement.license_use || ""),
        permissions: String(entitlement.permissions || ""),
        version: matlabVersion,
      }));
    } catch (error) {
      console.error("Error fetching entitlements:", error);
      vscode.window.showWarningMessage(
        `Could not fetch MATLAB entitlements: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }


  private async promptForEntitlementSelection(): Promise<void> {
    if (
      !this.licensingInfo?.entitlements ||
      this.licensingInfo.entitlements.length === 0
    ) {
      vscode.window.showWarningMessage("No entitlements available to select");
      return;
    }

    const entitlementItems = this.licensingInfo.entitlements.map((e) => ({
      label: e.name,
      description: `Expires: ${new Date(e.expiry).toLocaleDateString()}`,
      detail: `Status: ${e.status}`,
      id: e.id,
    }));

    const selected = await vscode.window.showQuickPick(entitlementItems, {
      placeHolder: "Select a MATLAB entitlement to use",
      canPickMany: false,
    });

    if (selected) {
      await this.updateEntitlement(selected.id);
      vscode.window.showInformationMessage(
        `Selected entitlement: ${selected.label}`
      );
    }
  }

  // get Entitlements

  public async updateEntitlement(entitlementId: string): Promise<void> {
    if (!this.licensingInfo) {
      vscode.window.showErrorMessage("No licensing information available");
      return;
    }

    this.licensingInfo.entitlement_id = entitlementId;
    await this.context.globalState.update(
      "matlab.licensingInfo",
      this.licensingInfo
    );

    // Notify the sidebar of the updated entitlement
    this.sidebarProvider.updateLicensingInfo(this.licensingInfo);

    console.log("Entitlement updated:", entitlementId);

    // Optionally, you could call a method to update the MATLAB configuration
    // with the selected entitlement
    await this.updateMatlabConfiguration();
  }

  private async updateMatlabConfiguration(): Promise<void> {
    if (!this.licensingInfo || !this.licensingInfo.entitlement_id) {
      return;
    }

    try {


      // For example, update settings
      await vscode.workspace
        .getConfiguration("matlab")
        .update(
          "selectedEntitlement",
          this.licensingInfo.entitlement_id,
          vscode.ConfigurationTarget.Global
        );



      console.log(
        "Updated MATLAB configuration with entitlement:",
        this.licensingInfo.entitlement_id
      );
    } catch (error) {
      console.error("Error updating MATLAB configuration:", error);
    }
  }

  public async signOut(): Promise<void> {
    try {
      // Clear user data from configuration
      await vscode.workspace
        .getConfiguration()
        .update(
          "matlab.userData",
          undefined,
          vscode.ConfigurationTarget.Global
        );

      // Clear licensing info
      this.licensingInfo = null;
      await this.context.globalState.update("matlab.licensingInfo", null);

      // Clear access token
      await this.context.secrets.delete("matlab.accessToken");

      // Update status bar
      this.statusBarItem.text = "MATLAB: Not Connected";

      // Update sidebar to show signed out state
      this.sidebarProvider.updateAuthStatus(false, null);
      this.sidebarProvider.updateLicensingInfo(null);

      vscode.window.showInformationMessage(
        "Successfully signed out from MATLAB"
      );
    } catch (error) {
      console.error("Error during sign out:", error);
      vscode.window.showErrorMessage("Failed to sign out from MATLAB");
    }
  }
  private async updateExtensionState(tokenResponse: Token): Promise<void> {
    console.log(tokenResponse.referenceDetail);

    this.sidebarProvider.updateAuthStatus(true, tokenResponse.referenceDetail);
    this.statusBarItem.text = "MATLAB: Connected";
  }
}
