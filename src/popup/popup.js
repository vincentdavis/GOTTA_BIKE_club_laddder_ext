/**
 * Popup script for GOTTA.BIKE ladder
 */

let capturedData = null;

// DOM Elements
const statusEl = document.getElementById('status');
const pageTypeEl = document.getElementById('page-type');
const dataPreviewEl = document.getElementById('data-preview');
const teamInfoEl = document.getElementById('team-info');
const captureBtn = document.getElementById('capture-btn');
const copyBtn = document.getElementById('copy-btn');
const downloadJsonBtn = document.getElementById('download-json-btn');
const downloadCsvBtn = document.getElementById('download-csv-btn');
const messageEl = document.getElementById('message');
const navFixturesBtn = document.getElementById('nav-fixtures');

// Navigation URLs
const NAV_URLS = {
  fixtures: 'https://ladder.cycleracing.club/rider/fixtures/active'
};

// Navigate to a URL in the current tab
async function navigateTo(url) {
  const tab = await getCurrentTab();
  await chrome.tabs.update(tab.id, { url });
  window.close(); // Close the popup after navigation
}

// Detect page type from URL
function detectPageType(url) {
  if (!url) return null;

  const patterns = [
    { pattern: /\/rider\/team\/n\/\d+/, type: 'TEAM', description: 'Team Page' },
    { pattern: /\/rider\/profile\/n\/\d+/, type: 'RIDER', description: 'Rider Profile' },
    { pattern: /\/rider\/profile\//, type: 'RIDER', description: 'Rider Profile' },
    { pattern: /\/rider\/fixtures\//, type: 'FIXTURES', description: 'Fixtures' },
    { pattern: /\/division\//, type: 'DIVISION', description: 'Division' },
    { pattern: /\/events?\//, type: 'EVENT', description: 'Event' },
    { pattern: /\/leaderboard/, type: 'LEADERBOARD', description: 'Leaderboard' },
    { pattern: /\/results?\//, type: 'RESULTS', description: 'Results' },
    { pattern: /\/schedule/, type: 'SCHEDULE', description: 'Schedule' },
  ];

  for (const { pattern, type, description } of patterns) {
    if (pattern.test(url)) {
      return { type, description };
    }
  }

  return { type: 'OTHER', description: 'Ladder Page' };
}

// Display page type
function showPageType(url) {
  const pageInfo = detectPageType(url);
  if (pageInfo) {
    pageTypeEl.textContent = pageInfo.type;
    pageTypeEl.title = pageInfo.description;
    pageTypeEl.className = `page-type page-type-${pageInfo.type.toLowerCase()}`;
  } else {
    pageTypeEl.classList.add('hidden');
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getCurrentTab();
  if (tab && tab.url && tab.url.includes('ladder.cycleracing.club')) {
    showPageType(tab.url);
    setStatus('Ready to capture data from this page.', 'info');
  } else {
    setStatus('Please navigate to ladder.cycleracing.club to capture data.', 'error');
    captureBtn.disabled = true;
  }
});

// Get current tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Set status message
function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// Show temporary message
function showMessage(message, type) {
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  setTimeout(() => {
    messageEl.className = 'message hidden';
  }, 3000);
}

// Render team data preview
function renderTeamData(data) {
  if (data.error) {
    teamInfoEl.innerHTML = `<p class="error">${data.message}</p>`;
    return;
  }

  const team = data.team;
  let html = `
    <p><span class="label">Team:</span> ${team.name || 'N/A'}</p>
    <p><span class="label">Club:</span> ${team.club || 'N/A'}</p>
    <p><span class="label">Captain:</span> ${team.captain || 'N/A'}</p>
    <p><span class="label">Vice Captains:</span> ${team.viceCaptains.length > 0 ? team.viceCaptains.join(', ') : 'N/A'}</p>
  `;

  if (team.ranks.length > 0) {
    html += '<div class="ranks"><span class="label">Ranks:</span><br>';
    team.ranks.forEach(rank => {
      html += `<span class="rank-item">${rank.division}: #${rank.position}</span>`;
    });
    html += '</div>';
  }

  if (team.riders && team.riders.length > 0) {
    html += `<div class="riders"><span class="label">Riders (${team.riders.length}):</span><br>`;
    team.riders.slice(0, 5).forEach(rider => {
      html += `<span class="rider-item">${rider.name || 'Unknown'}</span>`;
    });
    if (team.riders.length > 5) {
      html += `<span class="rider-more">+${team.riders.length - 5} more</span>`;
    }
    html += '</div>';
  }

  teamInfoEl.innerHTML = html;
}

// Convert data to CSV - creates a row per rider with all stats
function dataToCSV(data) {
  if (data.error) return '';

  const team = data.team;
  const ranksStr = team.ranks.map(r => `${r.division}:#${r.position}`).join('; ');

  // Collect all unique power data keys from all riders
  const powerKeys = new Set();
  if (team.riders && team.riders.length > 0) {
    team.riders.forEach(rider => {
      if (rider.power) {
        Object.keys(rider.power).forEach(key => powerKeys.add(key));
      }
    });
  }
  const sortedPowerKeys = Array.from(powerKeys).sort();

  // Build headers including all power columns
  const baseHeaders = [
    'Timestamp', 'URL', 'Team Name', 'Club', 'Captain', 'Vice Captains', 'Ranks',
    'Rider ID', 'Rider Name', 'Rider Profile', 'Position', 'Zwift Cat', 'Played', 'Won', 'Pts', 'FTP'
  ];
  const headers = [...baseHeaders, ...sortedPowerKeys];

  // If there are riders, create a row for each rider
  if (team.riders && team.riders.length > 0) {
    const rows = [headers.join(',')];

    team.riders.forEach(rider => {
      const baseValues = [
        data.timestamp,
        data.url,
        team.name || '',
        team.club || '',
        team.captain || '',
        team.viceCaptains.join('; '),
        ranksStr,
        rider.rider_id || '',
        rider.name || '',
        rider.profile || '',
        rider.position || '',
        rider.zwift_cat || '',
        rider.played || '',
        rider.won || '',
        rider.pts || '',
        rider.ftp || ''
      ];

      // Add power data values in the same order as headers
      const powerValues = sortedPowerKeys.map(key =>
        rider.power && rider.power[key] ? rider.power[key] : ''
      );

      const values = [...baseValues, ...powerValues];
      const escapedValues = values.map(v => `"${String(v).replace(/"/g, '""')}"`);
      rows.push(escapedValues.join(','));
    });

    return rows.join('\n');
  }

  // No riders - single row without rider data
  const values = [
    data.timestamp,
    data.url,
    team.name || '',
    team.club || '',
    team.captain || '',
    team.viceCaptains.join('; '),
    ranksStr,
    '', '', '', '', '', '', '', '', '',
    ...sortedPowerKeys.map(() => '')
  ];
  const escapedValues = values.map(v => `"${String(v).replace(/"/g, '""')}"`);
  return headers.join(',') + '\n' + escapedValues.join(',');
}

// Download file
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Capture button click
captureBtn.addEventListener('click', async () => {
  const tab = await getCurrentTab();

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });

    if (response.error) {
      setStatus(response.message, 'error');
      dataPreviewEl.classList.add('hidden');
      capturedData = null;
    } else {
      capturedData = response;
      setStatus('Data captured successfully!', 'success');
      renderTeamData(capturedData);
      dataPreviewEl.classList.remove('hidden');

      // Enable export buttons
      copyBtn.disabled = false;
      downloadJsonBtn.disabled = false;
      downloadCsvBtn.disabled = false;
    }
  } catch (error) {
    setStatus('Error: Could not communicate with page. Try refreshing.', 'error');
    console.error('Capture error:', error);
  }
});

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
  if (!capturedData) return;

  try {
    await navigator.clipboard.writeText(JSON.stringify(capturedData, null, 2));
    showMessage('Copied to clipboard!', 'success');
  } catch (error) {
    showMessage('Failed to copy to clipboard.', 'error');
    console.error('Copy error:', error);
  }
});

// Download JSON
downloadJsonBtn.addEventListener('click', () => {
  if (!capturedData) return;

  const filename = `ladder-team-${capturedData.team.name || 'data'}-${Date.now()}.json`;
  downloadFile(JSON.stringify(capturedData, null, 2), filename, 'application/json');
  showMessage('JSON downloaded!', 'success');
});

// Download CSV
downloadCsvBtn.addEventListener('click', () => {
  if (!capturedData) return;

  const csv = dataToCSV(capturedData);
  const filename = `ladder-team-${capturedData.team.name || 'data'}-${Date.now()}.csv`;
  downloadFile(csv, filename, 'text/csv');
  showMessage('CSV downloaded!', 'success');
});

// Navigation buttons
navFixturesBtn.addEventListener('click', () => {
  navigateTo(NAV_URLS.fixtures);
});
