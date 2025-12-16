/**
 * Settings page script for GOTTA.BIKE ladder
 */

// DOM Elements
const backBtn = document.getElementById('back-btn');
const teamNameInput = document.getElementById('team-name');
const saveBtn = document.getElementById('save-btn');
const messageEl = document.getElementById('message');

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
});

// Load settings from chrome.storage.sync
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['teamName']);
    if (result.teamName) {
      teamNameInput.value = result.teamName;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings to chrome.storage.sync
async function saveSettings() {
  try {
    const teamName = teamNameInput.value.trim();
    console.log('Attempting to save teamName:', teamName);

    await chrome.storage.sync.set({ teamName });

    // Verify save worked
    const result = await chrome.storage.sync.get(['teamName']);
    console.log('Verified saved value:', result.teamName);

    showMessage('Settings saved!', 'success');
  } catch (error) {
    showMessage(`Failed to save: ${error.message}`, 'error');
    console.error('Error saving settings:', error);
  }
}

// Show temporary message
function showMessage(message, type) {
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  setTimeout(() => {
    messageEl.className = 'message hidden';
  }, 3000);
}

// Event listeners
backBtn.addEventListener('click', () => {
  window.location.href = 'popup.html';
});

saveBtn.addEventListener('click', () => {
  saveSettings();
});

// Save on Enter key in input
teamNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveSettings();
  }
});
