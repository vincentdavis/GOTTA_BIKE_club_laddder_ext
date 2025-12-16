/**
 * Service Worker for GOTTA.BIKE ladder
 * Handles background tasks for the extension
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('GOTTA.BIKE ladder extension installed');
  } else if (details.reason === 'update') {
    console.log('GOTTA.BIKE ladder extension updated');
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle any background tasks here if needed in the future
  return true;
});
