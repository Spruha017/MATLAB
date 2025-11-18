// import * as vscode from "vscode";
// import { SidebarProvider } from "./SidebarProvider";
// import { ReferenceDetail } from "./types";
// import { OAuthClient } from "./OAuthClient";

// export const CONNECTION_STATUS_LABELS = {
//   CONNECTED: "MATLAB: Connected",
//   NOT_CONNECTED: "MATLAB: Not Connected",
//   CONNECTING: "MATLAB: Establishing Connection",
// };

// // MATLAB extension ID
// const MATLAB_EXTENSION_ID = 'mathworks.matlab-interactive';

// export async function activate(context: vscode.ExtensionContext) {
//   console.log('MATLAB extension "matlab" is now active!');
//   vscode.window.showInformationMessage("Welcome to MATLAB extension");

//   const statusBarItem = vscode.window.createStatusBarItem(
//     vscode.StatusBarAlignment.Right,
//     100
//   );
//   statusBarItem.text = CONNECTION_STATUS_LABELS.NOT_CONNECTED;
//   statusBarItem.show();
//   context.subscriptions.push(statusBarItem);

//   const sidebarProvider = new SidebarProvider(context.extensionUri);
//   context.subscriptions.push(
//     vscode.window.registerWebviewViewProvider("matlab-sidebar", sidebarProvider)
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand("matlab.login", async () => {
//       await oauthClient.loginHandler();
//     })
//   );

//   const oauthClient = new OAuthClient(context, statusBarItem, sidebarProvider);

//   const uriHandler = vscode.window.registerUriHandler({
//     handleUri: async (uri: vscode.Uri) => {
//       console.log("Received URI:", uri.toString());

//       await oauthClient.handleAuthCallback(uri);
//     },
//   });
//   context.subscriptions.push(uriHandler);

//   context.subscriptions.push(
//     vscode.commands.registerCommand("matlab.authenticate", async () => {
//       statusBarItem.text = CONNECTION_STATUS_LABELS.CONNECTING;
//       await oauthClient.loginHandler();
//     })
//   );

//   context.subscriptions.push(
//     vscode.commands.registerCommand("matlab.signOut", async () => {
//       await vscode.workspace
//         .getConfiguration()
//         .update(
//           "matlab.userData",
//           undefined,
//           vscode.ConfigurationTarget.Global
//         );
//       await vscode.workspace
//         .getConfiguration()
//         .update(
//           "matlab.accessToken",
//           undefined,
//           vscode.ConfigurationTarget.Global
//         );

//       statusBarItem.text = CONNECTION_STATUS_LABELS.NOT_CONNECTED;
//       sidebarProvider.updateAuthStatus(false);

//       vscode.window.showInformationMessage(
//         "Signed out from MATLAB successfully"
//       );
//     })
//   );

//   // send data to other extension
//   const checkMatlabExtension = () => {
//     const matlabExtension = vscode.extensions.getExtension(MATLAB_EXTENSION_ID);

//     if (matlabExtension) {
//       console.log('Official MATLAB extension is installed');

//       if (matlabExtension.isActive) {
//         console.log('Official MATLAB extension is active');
//         return { installed: true, active: true };
//       } else {
//         console.log('Official MATLAB extension is installed but not active');
//         return { installed: true, active: false };
//       }
//     } else {
//       console.log('Official MATLAB extension is not installed');
//       return { installed: false, active: false };
//     }
//   };

//   // Register a command to check MATLAB extension status
//   context.subscriptions.push(
//     vscode.commands.registerCommand('matlab.checkMatlabExtension', () => {
//       const status = checkMatlabExtension();

//       if (status.installed) {
//         if (status.active) {
//           vscode.window.showInformationMessage('Official MATLAB extension is installed and active');
//         } else {
//           vscode.window.showInformationMessage('Official MATLAB extension is installed but not active');
//         }
//       } else {
//         vscode.window.showInformationMessage('Official MATLAB extension is not installed');
//       }

//       return status;
//     })
//   );

//   // Initial check
//   const initialStatus = checkMatlabExtension();

//   // Listen for extension changes
//   context.subscriptions.push(
//     vscode.extensions.onDidChange(() => {
//       const newStatus = checkMatlabExtension();

//       // If status changed, log it
//       if (newStatus.installed !== initialStatus.installed ||
//           newStatus.active !== initialStatus.active) {
//         console.log('MATLAB extension status changed:', newStatus);
//       }
//     })
//   );

//   return checkMatlabExtension;
// }

// async function getExtensionAPI(extensionId: string): Promise<any | undefined>{

//   const extension = vscode.extensions.getExtension(extensionId);

//    if (!extension) {
//     console.log(`Extension ${extensionId} is not installed`);
//     return undefined;
//   }

//   if (!extension.isActive) {
//     try {
//       await extension.activate();
//     } catch (error) {
//       console.error(`Failed to activate extension ${extensionId}:`, error);
//       return undefined;
//     }
//   }

//   return extension.exports;
// }

import * as vscode from "vscode";
import { SidebarProvider } from "./SidebarProvider";
import { ReferenceDetail } from "./types";
import { OAuthClient } from "./OAuthClient";

export const CONNECTION_STATUS_LABELS = {
  CONNECTED: "MATLAB: Connected",
  NOT_CONNECTED: "MATLAB: Not Connected",
  CONNECTING: "MATLAB: Establishing Connection",
};

// MATLAB extension ID
const MATLAB_EXTENSION_ID = "MathWorks.language-matlab";
const OTHER_EXTENSION_ID = "spruha.matlab-inter-extension";

export async function activate(context: vscode.ExtensionContext) {
  console.log('MATLAB extension "matlab" is now active!');
  vscode.window.showInformationMessage("Welcome to MATLAB extension");

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = CONNECTION_STATUS_LABELS.NOT_CONNECTED;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("matlab-sidebar", sidebarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("matlab.login", async () => {
      await oauthClient.loginHandler();
    })
  );

  const oauthClient = new OAuthClient(context, statusBarItem, sidebarProvider);

  const uriHandler = vscode.window.registerUriHandler({
    handleUri: async (uri: vscode.Uri) => {
      console.log("Received URI:", uri.toString());

      await oauthClient.handleAuthCallback(uri);
    },
  });
  context.subscriptions.push(uriHandler);

  context.subscriptions.push(
    vscode.commands.registerCommand("matlab.authenticate", async () => {
      statusBarItem.text = CONNECTION_STATUS_LABELS.CONNECTING;
      await oauthClient.loginHandler();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("matlab.signOut", async () => {
      await vscode.workspace
        .getConfiguration()
        .update(
          "matlab.userData",
          undefined,
          vscode.ConfigurationTarget.Global
        );
      await vscode.workspace
        .getConfiguration()
        .update(
          "matlab.accessToken",
          undefined,
          vscode.ConfigurationTarget.Global
        );

      statusBarItem.text = CONNECTION_STATUS_LABELS.NOT_CONNECTED;
      sidebarProvider.updateAuthStatus(false);

      vscode.window.showInformationMessage(
        "Signed out from MATLAB successfully"
      );
    })
  );

  // Check if the official MATLAB extension is installed
  const checkMatlabExtension = async () => {

      const sumResult = await callOtherExtensionSum(10, 20);
    const matlabExtension = vscode.extensions.getExtension(MATLAB_EXTENSION_ID);
    console.log(matlabExtension);
    if (!matlabExtension) {
      vscode.window.showErrorMessage(
        "Official MATLAB extension is not installed"
      );
      return;
    }

    if (!matlabExtension.isActive) {
      vscode.window.showWarningMessage(
        "MATLAB extension is not active. Activating..."
      );
      try {
        await matlabExtension.activate();
        console.log("MATLAB extension activated successfully");
      } catch (error) {
        vscode.window.showErrorMessage("Failed to activate MATLAB extension");
        return;
      }
    }

    try {


      // update install path

      await updateMatlabSetting('installPath', "customPath");
      vscode.window.showInformationMessage(`MATLAB installation path set to: ${"customPath"}`);

    // upadte settings
       await updateMatlabSetting('signIn', true);
       // command
      // await vscode.commands.executeCommand("matlab.enableSignIn");
      vscode.window.showInformationMessage("MATLAB Command Window opened");
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to open MATLAB Command Window: ${error}`
      );
    }
  };


  // Initial check
  const initialStatus = checkMatlabExtension();




// interact with settings

 async function updateMatlabSetting(settingName: string, value: any) {
    try {

      await vscode.workspace.getConfiguration('MATLAB').update(
        settingName,
        value,
        vscode.ConfigurationTarget.Global // or Workspace or WorkspaceFolder
      );
      vscode.window.showInformationMessage(`Updated MATLAB setting: ${settingName}`);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update MATLAB setting: ${error}`);
      return false;
    }
  }
//    function getMatlabSettings() {
//     const config = vscode.workspace.getConfiguration('MATLAB');
//     // return {
//     //   installPath: config.get('installPath'),
//     //   connectionTiming: config.get('matlabConnectionTiming'),
//     //   indexWorkspace: config.get('indexWorkspace'),
//     //   startDebuggerAutomatically: config.get('startDebuggerAutomatically'),
//     //   telemetry: config.get('telemetry'),
//     //   signIn: config.get('signIn'),
//     //   showFeatureNotAvailableError: config.get('showFeatureNotAvailableError'),
//     //   maxFileSizeForAnalysis: config.get('maxFileSizeForAnalysis'),
//     //   prewarmGraphics: config.get('prewarmGraphics'),
//     //   defaultEditor: config.get('defaultEditor')
//     // };

//     return config;
  // }
  /// RPC call to to other extension

async function getOtherExtensionAPI() {
   try {
    console.log(`Looking for extension with ID: ${OTHER_EXTENSION_ID}`);

    // List all extensions to see what's available
    const allExtensions = vscode.extensions.all;
    console.log('All available extensions:');
    allExtensions.forEach(ext => {
      console.log(`- ${ext.id} (active: ${ext.isActive})`);
    });

    const extension = vscode.extensions.getExtension(OTHER_EXTENSION_ID);

    if (!extension) {
      console.error(`Extension ${OTHER_EXTENSION_ID} not found`);
      return null;
    }

    console.log(`Found extension ${OTHER_EXTENSION_ID}, isActive: ${extension.isActive}`);

    if (!extension.isActive) {
      console.log(`Activating extension ${OTHER_EXTENSION_ID}...`);
      try {
        await extension.activate();
        console.log(`Successfully activated extension ${OTHER_EXTENSION_ID}`);
      } catch (error) {
        console.error(`Failed to activate extension ${OTHER_EXTENSION_ID}:`, error);
        return null;
      }
    }

    console.log(`Extension exports:`, extension.exports);

    if (!extension.exports) {
      console.error(`Extension ${OTHER_EXTENSION_ID} does not export any API`);
      return null;
    }

    if (!extension.exports.sum) {
      console.error(`Extension ${OTHER_EXTENSION_ID} does not export a sum function`);
      console.log(`Available exports:`, Object.keys(extension.exports));
      return null;
    }

    return extension.exports;
  } catch (error) {
    console.error(`Unexpected error getting extension API:`, error);
    return null;
  }
  }

  //  Function to call the sum function from the other extension
  async function callOtherExtensionSum(a: number, b: number) {
    try {
      const api = await getOtherExtensionAPI();

      if (!api) {
        console.error("Failed to get the other extension's API");
        return null;
      }

      // Call the sum function from the other extension
      if (typeof api.sum === 'function') {
        const result = api.sum(a, b);
        console.log(`Sum result: ${result}`);
        return result;
      } else {
        console.error("The other extension does not export a 'sum' function");
        return null;
      }
    } catch (error) {
      console.error(`Error calling other extension's sum function:`, error);
      return null;
    }
  }


   return {
    checkMatlabExtension,
    updateMatlabSetting,
    callOtherExtensionSum
  };
}

async function getExtensionAPI(extensionId: string): Promise<any | undefined>{

  const extension = vscode.extensions.getExtension(extensionId);

   if (!extension) {
    console.log(`Extension ${extensionId} is not installed`);
    return undefined;
  }

  if (!extension.isActive) {
    try {
      await extension.activate();
    } catch (error) {
      console.error(`Failed to activate extension ${extensionId}:`, error);
      return undefined;
    }
  }

  return extension.exports;
}
