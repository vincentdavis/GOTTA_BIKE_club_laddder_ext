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
const settingsBtn = document.getElementById('settings-btn');
const fixturesPreviewEl = document.getElementById('fixtures-preview');
const fixturesListEl = document.getElementById('fixtures-list');
const fixtureTeamsEl = document.getElementById('fixture-teams');
const fixtureTeamsListEl = document.getElementById('fixture-teams-list');

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

// Load saved team name from settings
async function getSavedTeamName() {
  try {
    const result = await chrome.storage.sync.get(['teamName']);
    return result.teamName || '';
  } catch (error) {
    console.error('Error loading team name:', error);
    return '';
  }
}

// Filter fixtures that match the team name (case-insensitive, partial match)
function filterFixtures(fixtures, teamName) {
  if (!teamName) return [];

  const searchTerm = teamName.toLowerCase();
  return fixtures.filter(fixture =>
    fixture.homeTeam.toLowerCase().includes(searchTerm) ||
    fixture.awayTeam.toLowerCase().includes(searchTerm)
  );
}

// Render fixtures list
function renderFixtures(fixtures) {
  if (fixtures.length === 0) {
    fixturesListEl.innerHTML = '<p class="no-fixtures">No matching fixtures found.</p>';
    return;
  }

  let html = '';
  fixtures.forEach(fixture => {
    html += `
      <div class="fixture-item" data-fixture-id="${fixture.id}">
        <span class="fixture-time">${fixture.time}</span>
        <span class="fixture-match">${fixture.homeTeam} v ${fixture.awayTeam}</span>
      </div>
    `;
  });

  fixturesListEl.innerHTML = html;

  // Add click handlers
  fixturesListEl.querySelectorAll('.fixture-item').forEach(item => {
    item.addEventListener('click', () => {
      const fixtureId = item.getAttribute('data-fixture-id');
      navigateTo(`https://ladder.cycleracing.club/rider/fixture/${fixtureId}`);
    });
  });
}

// Load and display fixtures for the current page
async function loadFixtures() {
  const teamName = await getSavedTeamName();

  if (!teamName) {
    fixturesPreviewEl.classList.remove('hidden');
    fixturesListEl.innerHTML = '<p class="no-fixtures">Set your team name in <a href="#" id="settings-link">Settings</a> to see your fixtures.</p>';
    document.getElementById('settings-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'settings.html';
    });
    return;
  }

  const tab = await getCurrentTab();

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractFixtures' });

    if (response.error) {
      return; // Silently fail if no fixtures found
    }

    const matchingFixtures = filterFixtures(response.fixtures, teamName);

    if (matchingFixtures.length > 0) {
      fixturesPreviewEl.classList.remove('hidden');
      renderFixtures(matchingFixtures);
    }
  } catch (error) {
    console.error('Error loading fixtures:', error);
  }
}

// Render fixture teams with get data links
function renderFixtureTeams(teams) {
  let html = '';
  teams.forEach(team => {
    html += `
      <div class="fixture-team-item">
        <span class="fixture-team-name">${team.name}</span>
        <button class="btn btn-sm btn-team-data" data-team-url="${team.url}" data-team-name="${team.name}">
          View
        </button>
      </div>
    `;
  });

  fixtureTeamsListEl.innerHTML = html;

  // Add click handlers for get data buttons
  fixtureTeamsListEl.querySelectorAll('.btn-team-data').forEach(btn => {
    btn.addEventListener('click', async () => {
      const teamUrl = btn.getAttribute('data-team-url');
      const teamName = btn.getAttribute('data-team-name');
      await fetchAndDownloadTeamData(teamUrl, teamName);
    });
  });
}

// Fetch team data by navigating to team page and extracting data
async function fetchAndDownloadTeamData(teamUrl, teamName) {
  const tab = await getCurrentTab();

  // Navigate to team page
  await chrome.tabs.update(tab.id, { url: teamUrl });

  // Wait for page to load and then extract data
  showMessage('Navigating to team page...', 'info');

  // Listen for page load completion
  const listener = async (tabId, changeInfo) => {
    if (tabId === tab.id && changeInfo.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);

      // Small delay to ensure content script is ready
      setTimeout(async () => {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });

          if (response.error) {
            showMessage('Failed to extract team data.', 'error');
          } else {
            // Download the JSON
            const filename = `ladder-team-${teamName || 'data'}-${Date.now()}.json`;
            downloadFile(JSON.stringify(response, null, 2), filename, 'application/json');
            showMessage(`Downloaded ${teamName} data!`, 'success');
          }
        } catch (error) {
          showMessage('Error extracting data. Try refreshing.', 'error');
          console.error('Extract error:', error);
        }
      }, 500);
    }
  };

  chrome.tabs.onUpdated.addListener(listener);
}

// Load and display teams for a fixture page
async function loadFixtureTeams() {
  const tab = await getCurrentTab();

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractFixtureTeams' });

    if (response.error) {
      return;
    }

    if (response.teams && response.teams.length > 0) {
      fixtureTeamsEl.classList.remove('hidden');
      renderFixtureTeams(response.teams);
    }
  } catch (error) {
    console.error('Error loading fixture teams:', error);
  }
}

// Detect page type from URL
function detectPageType(url) {
  if (!url) return null;

  const patterns = [
    { pattern: /\/rider\/team\/n\/\d+/, type: 'TEAM', description: 'Team Page' },
    { pattern: /\/rider\/profile\/n\/\d+/, type: 'RIDER', description: 'Rider Profile' },
    { pattern: /\/rider\/profile\//, type: 'RIDER', description: 'Rider Profile' },
    { pattern: /\/rider\/fixture\/\d+/, type: 'FIXTURE', description: 'Fixture' },
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
    const pageInfo = detectPageType(tab.url);
    showPageType(tab.url);

    // Show context-aware status and enable/disable features
    if (pageInfo && pageInfo.type === 'TEAM') {
      setStatus('Ready to capture team data.', 'info');
    } else if (pageInfo && pageInfo.type === 'FIXTURES') {
      loadFixtures();
      captureBtn.disabled = true;
      statusEl.classList.add('hidden');
    } else if (pageInfo && pageInfo.type === 'FIXTURE') {
      loadFixtureTeams();
      captureBtn.disabled = true;
      statusEl.classList.add('hidden');
    } else {
      captureBtn.disabled = true;
      statusEl.classList.add('hidden');
    }
  } else {
    statusEl.innerHTML = `
      Please navigate to ladder.cycleracing.club
      <a href="#" id="open-ladder-link" class="open-link" title="Open Fixtures">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>
    `;
    statusEl.className = 'status error';
    document.getElementById('open-ladder-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: NAV_URLS.fixtures });
    });
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

// Settings button
settingsBtn.addEventListener('click', () => {
  window.location.href = 'settings.html';
});
