// background.js — service worker
// Minimal, just keeps the extension alive and handles icon state

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Orchestrator] Extension installed');
});
