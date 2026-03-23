/**
 * Main Application Bootstrapper
 */

document.addEventListener('DOMContentLoaded', () => {
  // `window.store` is already initialized in store.js
  const store = window.store;
  
  // Initialize the relay client
  const client = new window.RelayClient(store);
  window.client = client;
  
  // Initialize the UI, which binds to the store and client
  const ui = new window.UI(store, client);
  window.ui = ui;

  console.log("WeeChat Web Client Initialized");
});
