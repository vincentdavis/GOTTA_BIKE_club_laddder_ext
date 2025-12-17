/**
 * Content script for GOTTA.BIKE ladder
 * Extracts team data from ladder.cycleracing.club pages
 */

function extractTeamData() {
  const teamSection = document.querySelector('#teamId');

  if (!teamSection) {
    return {
      error: true,
      message: 'You must be on a team page like https://ladder.cycleracing.club/rider/team/n/72 .'
    };
  }

  // Extract team name
  const teamNameEl = teamSection.querySelector('.h1');
  const teamName = teamNameEl ? teamNameEl.textContent.trim() : null;

  // Extract club name from the newpill span
  const clubPillEl = teamSection.querySelector('.newpill');
  let clubName = null;
  if (clubPillEl && clubPillEl.textContent) {
    clubName = clubPillEl.textContent.trim();
  }

  // Extract captain (text starts with "Captain")
  const captainEl = teamSection.querySelector('.fw-bold');
  let captain = null;
  if (captainEl) {
    const captainText = captainEl.textContent.trim();
    if (captainText.startsWith('Captain ')) {
      captain = captainText.replace('Captain ', '');
    } else {
      captain = captainText;
    }
  }

  // Extract vice captains
  const viceCaptainsEl = teamSection.querySelector('.h6.text-muted');
  let viceCaptains = [];
  if (viceCaptainsEl) {
    const vcText = viceCaptainsEl.textContent.trim();
    if (vcText.startsWith('Vice captains ')) {
      const vcNames = vcText.replace('Vice captains ', '');
      viceCaptains = vcNames.split(', ').map(name => name.trim());
    } else if (vcText.startsWith('Vice captain ')) {
      viceCaptains = [vcText.replace('Vice captain ', '').trim()];
    }
  }

  // Extract division ranks
  const ranksContainer = teamSection.querySelector('.teamRanks');
  const ranks = [];
  if (ranksContainer) {
    const rankPills = ranksContainer.querySelectorAll('.rounded-pill');
    rankPills.forEach(pill => {
      const positionEl = pill.querySelector('.bg-warning, .bg-white');
      const divisionEl = pill.querySelector('span.ms-2');

      if (positionEl && divisionEl) {
        ranks.push({
          division: divisionEl.textContent.trim(),
          position: parseInt(positionEl.textContent.trim(), 10)
        });
      }
    });
  }

  // Extract riders from the power table
  const riders = extractRiders();

  return {
    error: false,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    team: {
      name: teamName,
      club: clubName,
      captain: captain,
      viceCaptains: viceCaptains,
      ranks: ranks,
      riders: riders
    }
  };
}

/**
 * Extract rider data from the newPowerTable including all stats
 */
function extractRiders() {
  const riders = [];
  const powerTable = document.querySelector('.newPowerTable');

  if (!powerTable) {
    return riders;
  }

  const riderRows = powerTable.querySelectorAll('tr[data-rider-id]');

  riderRows.forEach(row => {
    const riderId = row.getAttribute('data-rider-id');
    const cells = row.querySelectorAll('td');

    // Find the cell with rider name (has data-goto attribute)
    const nameCell = row.querySelector('td[data-goto]');
    let riderName = null;
    let profilePath = null;

    if (nameCell) {
      profilePath = nameCell.getAttribute('data-goto');
      riderName = nameCell.textContent.trim();
    }

    // Extract basic stats from cells (position, zwift cat, played, won, pts, ftp)
    // Cell order: [position, name, dates, zwift, played, won, pts, ftp, ...power data]
    const position = cells[0] ? cells[0].textContent.trim() : '';
    const zwiftCat = row.querySelector('.zwiftCats') ? row.querySelector('.zwiftCats').textContent.trim() : '';

    // Find cells by their position after the name cell
    let played = '';
    let won = '';
    let pts = '';
    let ftp = '';

    // Get non-power cells (those without data-power-time attribute)
    const statCells = Array.from(cells).filter(cell =>
      !cell.hasAttribute('data-goto') &&
      !cell.hasAttribute('data-power-time') &&
      !cell.classList.contains('zwiftCats') &&
      !cell.querySelector('.flexiDate')
    );

    // Stats are typically: position, played, won, pts, ftp
    if (statCells.length >= 5) {
      played = statCells[1] ? statCells[1].textContent.trim() : '';
      won = statCells[2] ? statCells[2].textContent.trim() : '';
      pts = statCells[3] ? statCells[3].textContent.trim() : '';
      ftp = statCells[4] ? statCells[4].textContent.trim() : '';
    }

    // Extract power data (cells with data-power-time attribute)
    const powerData = {};
    const powerCells = row.querySelectorAll('td[data-power-time]');
    powerCells.forEach(cell => {
      const powerTime = cell.getAttribute('data-power-time');
      const format = cell.getAttribute('data-format');
      const time = cell.getAttribute('data-time');
      const value = cell.textContent.trim();

      // Create a key like "wkg_30_5" for format_time_powerTime
      const key = `${format}_${time}_${powerTime}`;
      powerData[key] = value;
    });

    if (riderId) {
      riders.push({
        rider_id: riderId,
        name: riderName,
        profile: profilePath,
        position: position,
        zwift_cat: zwiftCat,
        played: played,
        won: won,
        pts: pts,
        ftp: ftp,
        power: powerData
      });
    }
  });

  return riders;
}

/**
 * Extract fixtures data from the fixtures page
 */
function extractFixtures() {
  const fixtureRows = document.querySelectorAll('tr.opener[data-id]');

  if (fixtureRows.length === 0) {
    return {
      error: true,
      message: 'No fixtures found on this page.'
    };
  }

  const fixtures = [];

  fixtureRows.forEach(row => {
    const fixtureId = row.getAttribute('data-id');
    const timeCell = row.querySelector('td:first-child');
    const homeTeamEl = row.querySelector('.homeTeam .teamOpener');
    const awayTeamEl = row.querySelector('.awayTeam .teamOpener');

    if (fixtureId && homeTeamEl && awayTeamEl) {
      fixtures.push({
        id: fixtureId,
        time: timeCell ? timeCell.textContent.trim() : '',
        homeTeam: homeTeamEl.textContent.trim(),
        awayTeam: awayTeamEl.textContent.trim()
      });
    }
  });

  return {
    error: false,
    fixtures: fixtures
  };
}

/**
 * Extract team info from a single fixture page
 */
function extractFixtureTeams() {
  const teamElements = document.querySelectorAll('.teamRiderOpener[data-id]');

  if (teamElements.length < 2) {
    return {
      error: true,
      message: 'Could not find teams on this fixture page.'
    };
  }

  const teams = [];
  teamElements.forEach(el => {
    const teamId = el.getAttribute('data-id');
    const teamName = el.textContent.trim();
    if (teamId && teamName) {
      teams.push({
        id: teamId,
        name: teamName,
        url: `https://ladder.cycleracing.club/rider/team/n/${teamId}`
      });
    }
  });

  return {
    error: false,
    teams: teams.slice(0, 2) // Only first two teams
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const data = extractTeamData();
    sendResponse(data);
  } else if (request.action === 'extractFixtures') {
    const data = extractFixtures();
    sendResponse(data);
  } else if (request.action === 'extractFixtureTeams') {
    const data = extractFixtureTeams();
    sendResponse(data);
  }
  return true;
});
