// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
    const vscode = acquireVsCodeApi();
     const counter = document.getElementById('Button');
   Button.innerText= "Hello from Javascript";
   console.log("Hellow there from jas")
}());