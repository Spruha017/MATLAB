import * as vscode from "vscode";

export class MatlabAuthenticationProvider
  implements vscode.AuthenticationProvider, vscode.Disposable {

  static readonly ID = "matlab-auth";

  private _onDidChangeSessions =
    new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

  readonly onDidChangeSessions = this._onDidChangeSessions.event;

  constructor(private context: vscode.ExtensionContext) {}

  // VS Code reads sessions from here
  async getSessions(): Promise<vscode.AuthenticationSession[]> {
    const session =
      this.context.globalState.get<vscode.AuthenticationSession>("matlab.authSession");
    return session ? [session] : [];
  }

  // We don't allow VS Code to start OAuth directly
  async createSession(): Promise<vscode.AuthenticationSession> {
    throw new Error("Use MATLAB Sign In command");
  }

  async removeSession(sessionId: string): Promise<void> {
    await this.context.globalState.update("matlab.authSession", undefined);
    await this.context.secrets.delete("matlab.accessToken");

    this._onDidChangeSessions.fire({
      added: [],
      removed: [{ id: sessionId } as vscode.AuthenticationSession],
      changed: [],
    });
  }

  // 🔑 CALLED AFTER OAUTH SUCCESS
  async createSessionFromOAuth(
    accessToken: string,
    user: { id: string; email: string; name: string }
  ): Promise<void> {

    const session: vscode.AuthenticationSession = {
      id: user.id,
      accessToken,
      scopes: [],
      account: {
        id: user.email,
        label: `${user.name} `,
      },
    };

    await this.context.secrets.store("matlab.accessToken", accessToken);
    await this.context.globalState.update("matlab.authSession", session);

    this._onDidChangeSessions.fire({
      added: [session],
      removed: [],
      changed: [],
    });
  }

  dispose(): void {
    this._onDidChangeSessions.dispose();
  }
}
