<!-- <script>
  let count = 0;

  function increment() {
    count += 1;
  }
</script>

<div>
  <h2>MATLAB Sidebar</h2>
  <p>Count: {count}</p>
  <button on:click={increment}>Increment</button>
</div>

<style>
  div {
    padding: 10px;
  }
  button {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 6px 12px;
    cursor: pointer;
  }
</style> -->

<!-- <script lang="ts">
  // You can add any reactive variables or logic here
  let count = 0;

  function increment() {
    count += 1;
  }

  // You can also communicate with the extension if needed
  function sendMessageToExtension() {
    // This assumes you've set up a message handler in your SidebarProvider
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      type: 'alert',
      value: 'Hello from Sidebar component!'
    });
  }
</script>

<div class="container">
  <h1>MATLAB Sidebar</h1>

  <div class="card">
    <p>Welcome to the MATLAB extension!</p>
    <button on:click={increment}>
      Clicked {count} {count === 1 ? 'time' : 'times'}
    </button>
  </div>

  <div class="card">
    <button on:click={sendMessageToExtension}>
      Send Message to Extension
    </button>
  </div>
</div>

<style>
  .container {
    padding: 20px;
    font-family: Arial, sans-serif;
  }

  h1 {
    color: #0066b8;
    font-size: 1.5em;
    margin-bottom: 20px;
  }

  .card {
    background-color: #f3f3f3;
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  button {
    background-color: #0066b8;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  button:hover {
    background-color: #005099;
  }
</style> -->

<script>
  // Minimal script
</script>

<div style="padding: 20px; color: red; font-size: 24px;">
  Hello from Sidebar Component!
</div>