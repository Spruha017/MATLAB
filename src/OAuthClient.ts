import * as vscode from 'vscode';

import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import fetch from 'node-fetch';
import { ReferenceDetail  } from './types';


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

const OAUTH_HOST =process.env.OAUTH_HOST|| 'https://signin-integ1.mathworks.com';
const CLIENT_ID = 'go-test-client';
const CLIENT_SECRET = 'ramdomsecretkey';
const REDIRECT_URI = 'http://127.0.0.1:8012/clientapp/acceptauthcode';
const SERVER_PORT = 8012;


const sessionStore: Record<string, SessionData> = {};
export class OAuthClient {
  private server: http.Server | null = null;
  private codeVerifier: string = '';
  private sessionId: string = '';
  private statusBarItem: vscode.StatusBarItem;
  private sidebarProvider: any;

  constructor(statusBarItem: vscode.StatusBarItem, sidebarProvider: any) {
    this.statusBarItem = statusBarItem;
    this.sidebarProvider = sidebarProvider;
  }


  private generateSessionId(): string {
    return crypto.randomBytes(4).toString('hex');
  }


  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }


  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return Buffer.from(hash).toString('base64url');
  }

//   public async sessionHandler(){

 // cookies for session management
// const sessionId = req.cookies['sessionId'];

//   sessionStore[sessionId] = {
//     initialUrl: '/clientapp/login',
//     authState: false,
//     accessToken: '',
//     codeVerifier: '',
//     userInfo: null,
//   };
//   }
  public async loginHandler(): Promise<void> {

    this.sessionId = this.generateSessionId();
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);



    await this.startServer();


    const authParams = {
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state: this.sessionId,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      txn_id: this.sessionId,
      release: 'R2023a', // get version from setttings
      platform: process.platform === 'darwin' ? 'Mac OS X' : 'Windows',
      profile_tier: 'extended',
      locale: 'en_US'
    };

    const authUrl = `${OAUTH_HOST}/oauth2/v1/oauth/authorize?${querystring.stringify(authParams)}`;


    vscode.env.openExternal(vscode.Uri.parse(authUrl));
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close();
      }

      this.server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname || '';

        if (pathname === '/clientapp/acceptauthcode') {

          const { code, state } = parsedUrl.query;

          if (state !== this.sessionId) {
            this.sendErrorResponse(res, 'Invalid state parameter');
            return;
          }

          if (!code || typeof code !== 'string') {
            this.sendErrorResponse(res, 'No authorization code received');
            return;
          }

          try {

            const tokenResponse = await this.aacceptAuthCodeHandler(code);


            this.sendSuccessResponse(res, tokenResponse.referenceDetail);


            this.updateExtensionState(tokenResponse.referenceDetail);
          } catch (error) {
            console.error('Error exchanging code for token:', error);
            this.sendErrorResponse(res, 'Failed to exchange authorization code for token');
          }
        } else if (pathname === '/clientapp/login') {

          this.loginHandler();
          res.writeHead(302, { 'Location': '/' });
          res.end();
        }

      });

      this.server.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      this.server.listen(SERVER_PORT, () => {
        console.log(`OAuth server listening on port ${SERVER_PORT}`);
        resolve();
      });
    });
  }


  private async aacceptAuthCodeHandler(code: string): Promise<any> {
    const tokenEndpoint = `${OAUTH_HOST}/oauth2/v1/oauth/token`;

    const payload = {
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code_verifier: this.codeVerifier
    };

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`OAuth server returned status ${response.status}`);
    }

    return await response.json();
  }

  // Send an error response
  private sendErrorResponse(res: http.ServerResponse, message: string): void {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
            }
            .error {
              margin: 20px;
              padding: 20px;
              background-color: #ffebee;
              border-radius: 5px;
              color: #c62828;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Authentication Error</h1>
            <p>${message}</p>
          </div>
        </body>
      </html>
    `);
  }

  // Send a success response with redirect to VS Code
private sendSuccessResponse(res: http.ServerResponse, userData: ReferenceDetail ): void {
  const encodedUserData = encodeURIComponent(JSON.stringify(userData));
  const vscodeUri = `vscode://spruhath.matlab/auth-complete?userData=${encodedUserData}`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background-color: #f5f5f5;
          }
          .message {
            margin: 20px auto;
            padding: 20px;
            background-color: #e6f7e6;
            border-radius: 5px;
            max-width: 500px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .spinner {
            margin: 20px auto;
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #0076A8;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
       <div class="message">
          <h1>Authentication Successful!</h1>
          <p>You have successfully signed in to MATLAB.</p>

          <div id="auto-redirect">
            <p>Redirecting back to VS Code automatically...</p>
            <div class="spinner"></div>
          </div>

          <div id="manual-redirect" style="display:none;">
            <p>Click the button below to return to VS Code:</p>
            <a href="${vscodeUri}" class="redirect-button">Return to VS Code</a>


          </div>
        </div>

        <script>
          // Try to redirect automatically
          window.location.href = "${vscodeUri}";


          setTimeout(function() {
            document.getElementById('auto-redirect').style.display = 'none';
            document.getElementById('manual-redirect').style.display = 'block';
          }, 3000);

          setTimeout(function() {
            window.close();
          }, 1000);
        </script>
      </body>
    </html>
  `);
}

  // Send a landing page
//   private sendLandingPage(res: http.ServerResponse): void {
//     res.writeHead(200, { 'Content-Type': 'text/html' });
//     res.end(`
//       <html>
//         <head>
//           <title>Welcome to MATLAB Authentication</title>
//           <style>
//             body {
//               font-family: Arial, sans-serif;
//               margin: 0;
//               display: flex;
//               justify-content: center;
//               align-items: center;
//               min-height: 100vh;
//               background-color: #f5f5f5;
//             }
//             .container {
//               text-align: center;
//               padding: 40px;
//               background: white;
//               border-radius: 10px;
//               box-shadow: 0 2px 10px rgba(0,0,0,0.1);
//             }
//             .btn {
//               display: inline-block;
//               padding: 12px 24px;
//               background-color: #0076A8;
//               color: white;loginHandler
//               text-decoration: none;
//               border-radius: 5px;
//               font-weight: bold;
//               margin-top: 20px;
//             }
//             .btn:hover {
//               background-color: #005a80;
//             }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <h1>Welcome to MATLAB Authentication</h1>
//             <p>Click Get Started to Sign-in</p>
//             <a href="/clientapp/login" class="btn">Get Started</a>
//           </div>
//         </body>
//       </html>
//     `);
//   }

  // Update the extension state with the user data
  private updateExtensionState(userData: ReferenceDetail ): void {
    // Save user data to configuration
    vscode.workspace.getConfiguration().update('ReferenceDetail ', userData, vscode.ConfigurationTarget.Global);


    this.statusBarItem.text = 'MATLAB: Connected';
    this.sidebarProvider.updateAuthStatus(true, userData);

    vscode.window.showInformationMessage('Successfully connected to MATLAB');
  }


  public dispose(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
