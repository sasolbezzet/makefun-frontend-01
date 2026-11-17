// Main application router and state controller for make.fun institutional frontend

import { getAgent, getBounties, getBounty, getLeaderboard } from './api.js';
import { board, bounty, leaderboard, notFound, profile } from './views.js';

const app = document.getElementById('app');

// Local UI state
const state = {
  boardFilter: 'all',
  boardQuery: '',
  leaderboardQuery: '',
};

// Cached active data to support instantaneous live filtering
let currentBoardData = null;
let currentLeaderboardData = null;
let currentLeaderboardSlug = null;

/**
 * Main router triggered on hashchange or direct load
 */
async function render() {
  window.__shotReady = false;

  const hash = location.hash || '#/';

  // 1. Surface 2: Bounty Detail (#/bounty/<slug>)
  const bountyMatch = hash.match(/^#\/bounty\/([^/?]+)/);
  if (bountyMatch) {
    const slug = decodeURIComponent(bountyMatch[1]);
    app.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading bounty ${slug}…</p></div>`;
    try {
      const b = await getBounty(slug);
      document.title = `${b.title || slug} | make.fun bounties`;
      app.innerHTML = bounty(b);
    } catch (err) {
      console.error(err);
      app.innerHTML = notFound(`Bounty "${slug}" could not be loaded.`);
    }
    window.scrollTo(0, 0);
    window.__shotReady = true;
    return;
  }

  // 2. Surface 3: Live Leaderboard (#/leaderboard/<slug>)
  const lbMatch = hash.match(/^#\/leaderboard\/([^/?]+)/);
  if (lbMatch) {
    const slug = decodeURIComponent(lbMatch[1]);
    app.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading leaderboard for ${slug}…</p></div>`;
    try {
      const lb = await getLeaderboard(slug);
      currentLeaderboardData = lb;
      currentLeaderboardSlug = slug;
      document.title = `Leaderboard: ${lb.competition?.title || slug} | make.fun`;
      app.innerHTML = leaderboard(lb, slug, { query: state.leaderboardQuery });
    } catch (err) {
      console.error(err);
      app.innerHTML = notFound(`Leaderboard for "${slug}" could not be loaded.`);
    }
    window.scrollTo(0, 0);
    window.__shotReady = true;
    return;
  }

  // 3. Surface 4: Public Agent Profile (#/profile/<handle>)
  const profileMatch = hash.match(/^#\/profile\/([^/?]+)/);
  if (profileMatch) {
    const handle = decodeURIComponent(profileMatch[1]);
    app.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading profile @${handle}…</p></div>`;
    try {
      const p = await getAgent(handle);
      document.title = `@${p.handle || handle} | Agent Profile`;
      app.innerHTML = profile(p, handle);
    } catch (err) {
      console.error(err);
      app.innerHTML = notFound(`Profile for "@${handle}" could not be found.`);
    }
    window.scrollTo(0, 0);
    window.__shotReady = true;
    return;
  }

  // 4. Surface 1: Default Bounty Board (#/)
  app.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Fetching active bounties…</p></div>';
  try {
    const data = await getBounties();
    currentBoardData = data;
    document.title = 'Institutional Bounty Board | make.fun';
    app.innerHTML = board(data, { filter: state.boardFilter, query: state.boardQuery });
  } catch (err) {
    console.error(err);
    app.innerHTML = notFound('Failed to load bounties. Please try refreshing.');
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// Global click event delegation for interactive filters
document.addEventListener('click', (e) => {
  const target = e.target;

  // Filter pills on board
  if (target && target.matches('.pill-btn')) {
    const filter = target.getAttribute('data-filter');
    if (filter && currentBoardData) {
      state.boardFilter = filter;
      app.innerHTML = board(currentBoardData, { filter: state.boardFilter, query: state.boardQuery });
    }
  }
});

// Live input event delegation for responsive instant search
document.addEventListener('input', (e) => {
  const target = e.target;

  // Board search
  if (target && target.id === 'bounty-search' && currentBoardData) {
    state.boardQuery = target.value;
    const pos = target.selectionStart;
    app.innerHTML = board(currentBoardData, { filter: state.boardFilter, query: state.boardQuery });
    const refreshed = document.getElementById('bounty-search');
    if (refreshed) {
      refreshed.focus();
      refreshed.setSelectionRange(pos, pos);
    }
  }

  // Leaderboard search
  if (target && target.id === 'leaderboard-search' && currentLeaderboardData && currentLeaderboardSlug) {
    state.leaderboardQuery = target.value;
    const pos = target.selectionStart;
    app.innerHTML = leaderboard(currentLeaderboardData, currentLeaderboardSlug, { query: state.leaderboardQuery });
    const refreshed = document.getElementById('leaderboard-search');
    if (refreshed) {
      refreshed.focus();
      refreshed.setSelectionRange(pos, pos);
    }
  }
});

window.addEventListener('hashchange', render);
render();
