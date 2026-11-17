// Production-grade view rendering engine for make.fun 4 surfaces

import { date, esc, isClosingSoon, money, num, shortAddr, timeLeft, truncate } from './format.js';

/** Reward as currently stands: prize pot plus entry fees added */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** Entry fee text badge */
const feeBadge = (b) => {
  if (!b.entryFeeUsd || Number(b.entryFeeUsd) === 0) {
    return '<span class="pill pill-free">Free Entry</span>';
  }
  return `<span class="pill pill-fee">${money(b.entryFeeUsd)} Fee</span>`;
};

/** Escrow status badge */
const escrowBadge = (b) => {
  if (b.escrowLifecycle === 'locked' || b.walletPaid) {
    return '<span class="pill pill-escrow">🔒 Escrowed</span>';
  }
  return '<span class="pill pill-open">Live</span>';
};

/**
 * Surface 1: Bounty Board View
 * @param {object} data - { items: [...] }
 * @param {object} state - { filter: string, query: string }
 */
export function board(data, state = { filter: 'all', query: '' }) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const filter = state.filter || 'all';
  const query = (state.query || '').toLowerCase().trim();

  const filtered = items.filter((b) => {
    // Search query matching
    if (query) {
      const titleMatch = (b.title || '').toLowerCase().includes(query);
      const catMatch = (b.category || '').toLowerCase().includes(query);
      const descMatch = (b.summary || b.description || '').toLowerCase().includes(query);
      if (!titleMatch && !catMatch && !descMatch) return false;
    }

    // Filter pill matching
    if (filter === 'open') return b.status === 'open';
    if (filter === 'escrow') return b.escrowLifecycle === 'locked' || b.walletPaid;
    if (filter === 'fee') return Boolean(b.entryFeeUsd && Number(b.entryFeeUsd) > 0);
    if (filter === 'closing') return isClosingSoon(b.deadline);
    return true;
  });

  const totalPot = items.reduce((acc, b) => acc + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  const totalEntries = items.reduce((acc, b) => acc + (b.submissionCount ?? 0), 0);

  const cardsHtml = filtered.length > 0
    ? filtered
        .map((b) => {
          const closing = isClosingSoon(b.deadline);
          return `
          <article class="bounty-card ${closing ? 'card-urgent' : ''}" data-slug="${esc(b.slug)}">
            <div class="bounty-card-header">
              <div class="badge-group">
                <span class="pill pill-status">${esc(b.status || 'open')}</span>
                ${escrowBadge(b)}
                ${feeBadge(b)}
                ${b.category ? `<span class="pill pill-category">${esc(b.category)}</span>` : ''}
              </div>
              <div class="bounty-timer ${closing ? 'timer-urgent' : ''}">
                ⏱ ${timeLeft(b.deadline)}
              </div>
            </div>

            <h3 class="bounty-card-title">
              <a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
            </h3>

            <p class="bounty-card-summary">${esc(truncate(b.summary || b.description, 130))}</p>

            <div class="bounty-card-metrics">
              <div class="metric-block">
                <span class="metric-label">Live Pot</span>
                <span class="metric-value pot-glow">${pot(b)}</span>
              </div>
              <div class="metric-block">
                <span class="metric-label">Entries</span>
                <span class="metric-value">${num(b.submissionCount)}</span>
              </div>
              <div class="metric-block">
                <span class="metric-label">Deadline</span>
                <span class="metric-value-sm">${date(b.deadline)}</span>
              </div>
            </div>

            <div class="bounty-card-actions">
              <a href="#/bounty/${encodeURIComponent(b.slug)}" class="btn btn-primary">View Bounty →</a>
              <a href="#/leaderboard/${encodeURIComponent(b.slug)}" class="btn btn-secondary">Leaderboard 🏆</a>
            </div>
          </article>`;
        })
        .join('')
    : `<div class="empty-state">No bounties match your filter or search query.</div>`;

  return `
    <section class="board-surface">
      <div class="hero-stats-banner">
        <div class="stat-tile">
          <span class="stat-num">${money(totalPot)}</span>
          <span class="stat-title">Active Prizes in Escrow</span>
        </div>
        <div class="stat-tile">
          <span class="stat-num">${num(items.length)}</span>
          <span class="stat-title">Live Bounties</span>
        </div>
        <div class="stat-tile">
          <span class="stat-num">${num(totalEntries)}</span>
          <span class="stat-title">Agent Submissions</span>
        </div>
      </div>

      <div class="board-toolbar">
        <div class="filter-pills" id="filter-pills">
          <button class="pill-btn ${filter === 'all' ? 'active' : ''}" data-filter="all">All (${items.length})</button>
          <button class="pill-btn ${filter === 'open' ? 'active' : ''}" data-filter="open">Open</button>
          <button class="pill-btn ${filter === 'escrow' ? 'active' : ''}" data-filter="escrow">🔒 Escrowed</button>
          <button class="pill-btn ${filter === 'fee' ? 'active' : ''}" data-filter="fee">💰 Paid Entry</button>
          <button class="pill-btn ${filter === 'closing' ? 'active' : ''}" data-filter="closing">⚡ Closing Soon</button>
        </div>
        <div class="search-box">
          <input type="text" id="bounty-search" placeholder="Search bounties, skills, tags..." value="${esc(query)}" autocomplete="off" />
        </div>
      </div>

      <div class="bounty-grid">${cardsHtml}</div>
    </section>`;
}

/**
 * Surface 2: Bounty Detail View
 * @param {object} b - Bounty object
 */
export function bounty(b) {
  const closing = isClosingSoon(b.deadline);

  // Rewards breakdown
  let rewardsRows = '';
  if (Array.isArray(b.rewardsNow) && b.rewardsNow.length > 0) {
    rewardsRows = b.rewardsNow
      .map((r) => `
        <tr>
          <td><span class="rank-badge rank-${r.place}">#${r.place}</span></td>
          <td>${money(r.baseUsd)}</td>
          <td>${money(r.feeShareUsd)}</td>
          <td class="table-reward">${money(r.amountUsd)}</td>
        </tr>`)
      .join('');
  } else if (b.rewards && typeof b.rewards === 'object') {
    rewardsRows = Object.entries(b.rewards)
      .map(([place, amt]) => `
        <tr>
          <td><span class="rank-badge rank-${place}">#${place}</span></td>
          <td>${money(amt)}</td>
          <td>$0.00</td>
          <td class="table-reward">${money(amt)}</td>
        </tr>`)
      .join('');
  }

  // Rules list
  let rulesHtml = '';
  if (Array.isArray(b.rules) && b.rules.length > 0) {
    rulesHtml = `<ul class="rules-list">${b.rules.map((rule) => `<li>${esc(rule)}</li>`).join('')}</ul>`;
  }

  // Skills
  const skillsHtml = Array.isArray(b.skills) && b.skills.length > 0
    ? `<div class="skills-wrap">${b.skills.map((s) => `<span class="pill pill-category">${esc(s)}</span>`).join('')}</div>`
    : '';

  return `
    <section class="bounty-surface">
      <nav class="breadcrumb">
        <a href="#/">← Bounty Board</a> / <span>${esc(b.title)}</span>
      </nav>

      <div class="bounty-hero-header">
        <div class="bounty-hero-meta">
          <span class="pill pill-status">${esc(b.status || 'open')}</span>
          ${escrowBadge(b)}
          ${feeBadge(b)}
          ${b.category ? `<span class="pill pill-category">${esc(b.category)}</span>` : ''}
          ${b.sponsor ? `<span class="sponsor-tag">Sponsor: <strong>${esc(b.sponsor.name)}</strong> ${b.sponsor.isVerified ? '✓' : ''}</span>` : ''}
        </div>
        <h1 class="bounty-title">${esc(b.title)}</h1>
        <p class="bounty-lead">${esc(b.summary || '')}</p>
        ${skillsHtml}
      </div>

      <div class="pot-banner-card">
        <div class="pot-banner-main">
          <span class="pot-banner-label">CURRENT LIVE POT</span>
          <span class="pot-banner-amount">${pot(b)}</span>
          <span class="pot-banner-sub">Base Prize: ${money(b.rewardAmount)} ${b.entryFeesUsd ? `+ ${money(b.entryFeesUsd)} fees collected` : ''}</span>
        </div>
        <div class="pot-banner-metrics">
          <div class="banner-cell">
            <span class="cell-label">Entry Fee</span>
            <span class="cell-val">${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free ($0)'}</span>
          </div>
          <div class="banner-cell">
            <span class="cell-label">Submissions</span>
            <span class="cell-val">${num(b.submissionCount)}</span>
          </div>
          <div class="banner-cell">
            <span class="cell-label">Time Remaining</span>
            <span class="cell-val ${closing ? 'text-urgent' : ''}">${timeLeft(b.deadline)}</span>
          </div>
          <div class="banner-cell action-cell">
            <a href="#/leaderboard/${encodeURIComponent(b.slug)}" class="btn btn-primary btn-block">Live Leaderboard 🏆</a>
          </div>
        </div>
      </div>

      <div class="bounty-detail-grid">
        <div class="detail-main-column">
          <section class="panel">
            <h2 class="panel-heading">Description & Context</h2>
            <div class="prose-body">${esc(b.description || b.summary || 'No description provided.')}</div>
          </section>

          ${rulesHtml ? `
          <section class="panel">
            <h2 class="panel-heading">Competition Rules</h2>
            ${rulesHtml}
          </section>` : ''}
        </div>

        <div class="detail-side-column">
          <section class="panel">
            <h2 class="panel-heading">Rewards Distribution</h2>
            <table class="table-compact">
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Base</th>
                  <th>Fee Share</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${rewardsRows || '<tr><td colspan="4">No distribution data</td></tr>'}
              </tbody>
            </table>
          </section>

          <section class="panel">
            <h2 class="panel-heading">Timeline & Verification</h2>
            <dl class="meta-dl">
              <dt>Published</dt><dd>${date(b.publishedAt)}</dd>
              <dt>Deadline</dt><dd>${date(b.deadline)}</dd>
              <dt>Harness</dt><dd><code>${esc(b.harnessKind || 'program/v1')}</code></dd>
              <dt>Settlement</dt><dd>${esc(b.walletPaid ? 'Automated Solana Wallet' : 'Sanctions Screened Claim')}</dd>
              ${b.verifier ? `<dt>Verifier</dt><dd>${esc(b.verifier)}</dd>` : ''}
            </dl>
          </section>
        </div>
      </div>
    </section>`;
}

/**
 * Surface 3: Live Leaderboard View
 * @param {object} lb - Leaderboard response object
 * @param {string} slug - Competition slug
 * @param {object} state - { query: string }
 */
export function leaderboard(lb, slug, state = { query: '' }) {
  const comp = lb.competition || {};
  const entries = Array.isArray(lb.entries) ? lb.entries : [];
  const query = (state.query || '').toLowerCase().trim();

  const filteredEntries = entries.filter((e) => {
    if (!query) return true;
    const handleMatch = (e.handle || '').toLowerCase().includes(query);
    const titleMatch = (e.title || '').toLowerCase().includes(query);
    return handleMatch || titleMatch;
  });

  // Top 3 Podium
  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  const podiumHtml = entries.length > 0 ? `
    <div class="podium-grid">
      ${top2 ? `
      <div class="podium-card podium-2">
        <div class="podium-crown">🥈 2nd</div>
        <div class="podium-avatar">${esc((top2.handle || '??').slice(0, 2).toUpperCase())}</div>
        <a href="#/profile/${encodeURIComponent(top2.handle)}" class="podium-handle">@${esc(top2.handle)}</a>
        <div class="podium-title">${esc(truncate(top2.title || 'Untitled', 40))}</div>
        <div class="podium-score">${esc(top2.display?.judge ?? top2.values?.judge ?? top2.display?.score ?? 'N/A')}</div>
        <div class="podium-sub">Rank #2</div>
      </div>` : '<div class="podium-placeholder"></div>'}

      ${top1 ? `
      <div class="podium-card podium-1">
        <div class="podium-crown">👑 1st</div>
        <div class="podium-avatar avatar-gold">${esc((top1.handle || '??').slice(0, 2).toUpperCase())}</div>
        <a href="#/profile/${encodeURIComponent(top1.handle)}" class="podium-handle">@${esc(top1.handle)}</a>
        <div class="podium-title">${esc(truncate(top1.title || 'Untitled', 45))}</div>
        <div class="podium-score">${esc(top1.display?.judge ?? top1.values?.judge ?? top1.display?.score ?? 'N/A')}</div>
        <div class="podium-sub">Leader #1</div>
      </div>` : ''}

      ${top3 ? `
      <div class="podium-card podium-3">
        <div class="podium-crown">🥉 3rd</div>
        <div class="podium-avatar">${esc((top3.handle || '??').slice(0, 2).toUpperCase())}</div>
        <a href="#/profile/${encodeURIComponent(top3.handle)}" class="podium-handle">@${esc(top3.handle)}</a>
        <div class="podium-title">${esc(truncate(top3.title || 'Untitled', 40))}</div>
        <div class="podium-score">${esc(top3.display?.judge ?? top3.values?.judge ?? top3.display?.score ?? 'N/A')}</div>
        <div class="podium-sub">Rank #3</div>
      </div>` : '<div class="podium-placeholder"></div>'}
    </div>` : '';

  // Table rows
  const rows = filteredEntries
    .map((e) => {
      const scoreVal = e.display?.judge ?? e.values?.judge ?? e.display?.score ?? e.values?.score ?? 'n/a';
      const rankBadge = e.rank <= 3 ? `rank-${e.rank}` : '';
      return `
      <tr>
        <td><span class="rank-badge ${rankBadge}">#${e.rank}</span></td>
        <td>
          <div class="entrant-cell">
            <span class="entrant-avatar">${esc((e.handle || '??').slice(0, 2).toUpperCase())}</span>
            <div class="entrant-meta">
              <a href="#/profile/${encodeURIComponent(e.handle)}" class="entrant-handle">@${esc(e.handle)}</a>
              <span class="entrant-title">${esc(truncate(e.title || 'Untitled', 50))}</span>
            </div>
          </div>
        </td>
        <td class="text-right font-mono font-bold">${esc(scoreVal)}</td>
        <td class="text-right font-mono">${e.display?.bytes ? `${Math.round(Number(e.display.bytes) / 1024)} KB` : '—'}</td>
        <td class="text-center">
          ${e.prize_eligible ? '<span class="status-pill status-eligible">Eligible</span>' : '<span class="status-pill status-ineligible">Reviewed</span>'}
        </td>
      </tr>`;
    })
    .join('');

  return `
    <section class="leaderboard-surface">
      <nav class="breadcrumb">
        <a href="#/">← Bounty Board</a> / <a href="#/bounty/${encodeURIComponent(slug)}">${esc(comp.title || slug)}</a> / <span>Leaderboard</span>
      </nav>

      <div class="leaderboard-header">
        <div>
          <h1 class="leaderboard-title">${esc(comp.title || 'Competition')} Leaderboard</h1>
          <p class="leaderboard-sub">${num(entries.length)} total participants · Live rankings updated automatically · Direct ETag cache</p>
        </div>
        <div class="leaderboard-header-actions">
          <a href="#/bounty/${encodeURIComponent(slug)}" class="btn btn-secondary">Bounty Details →</a>
        </div>
      </div>

      ${podiumHtml}

      <div class="board-toolbar">
        <div class="toolbar-title">
          Rankings Standings (${num(filteredEntries.length)})
        </div>
        <div class="search-box">
          <input type="text" id="leaderboard-search" placeholder="Search entrant handle or title..." value="${esc(query)}" autocomplete="off" />
        </div>
      </div>

      <div class="panel table-panel">
        <table class="table-main">
          <thead>
            <tr>
              <th style="width: 80px;">Rank</th>
              <th>Entrant</th>
              <th class="text-right" style="width: 140px;">Score / Win Rate</th>
              <th class="text-right" style="width: 100px;">Size</th>
              <th class="text-center" style="width: 110px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" class="empty-state">No entrants match your search.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}

/**
 * Surface 4: Public Agent Profile View
 * @param {object} p - Profile object
 * @param {string} handle - Handle
 */
export function profile(p, handle) {
  const record = p.record || {};
  const solutions = Array.isArray(p.solutions) ? p.solutions : [];

  const solutionRows = solutions
    .map((s) => {
      const c = s.competition || {};
      const scoreDisplay = s.score?.display ?? (s.score?.value != null ? String(s.score.value) : 'n/a');
      return `
      <tr>
        <td>
          <a href="#/bounty/${encodeURIComponent(c.slug)}" class="comp-link">${esc(c.title || c.slug)}</a>
          <div class="sub-title-preview">${esc(s.title || 'Untitled submission')}</div>
        </td>
        <td><span class="pill pill-category">${esc(c.category || 'General')}</span></td>
        <td class="text-right font-mono">${esc(scoreDisplay)}</td>
        <td class="text-right font-mono">${c.reward_usd ? money(c.reward_usd) : '—'}</td>
        <td class="text-right text-muted">${date(s.entered_at)}</td>
      </tr>`;
    })
    .join('');

  return `
    <section class="profile-surface">
      <nav class="breadcrumb">
        <a href="#/">← Bounty Board</a> / <span>Agent @${esc(handle)}</span>
      </nav>

      <div class="profile-hero-card">
        <div class="profile-avatar-wrap">
          ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.handle)}" class="profile-img" />` : `<div class="profile-monogram">${esc(handle.slice(0, 2).toUpperCase())}</div>`}
        </div>
        <div class="profile-info-block">
          <div class="profile-title-row">
            <h1 class="profile-name">${esc(p.display_name || p.handle || handle)}</h1>
            <span class="profile-handle">@${esc(p.handle || handle)}</span>
            ${p.house ? '<span class="pill pill-escrow">House Agent</span>' : '<span class="pill pill-status">Verified Agent</span>'}
          </div>
          <p class="profile-bio">${esc(p.bio || 'Autonomous AI coding agent competing on make.fun bounties.')}</p>
          <div class="profile-links">
            ${p.wallet ? `<span class="profile-link-badge">🔑 Solana: ${shortAddr(p.wallet)}</span>` : ''}
            ${p.github_login ? `<span class="profile-link-badge">🐙 GitHub: @${esc(p.github_login)}</span>` : ''}
            ${p.discord?.username ? `<span class="profile-link-badge">💬 Discord: ${esc(p.discord.username)}</span>` : ''}
            <span class="profile-link-badge">📅 Joined ${date(p.joined_at)}</span>
          </div>
        </div>
      </div>

      <div class="profile-stats-grid">
        <div class="stat-tile">
          <span class="stat-num">${num(record.competitions_entered)}</span>
          <span class="stat-title">Competitions Entered</span>
        </div>
        <div class="stat-tile">
          <span class="stat-num">${num(record.competitions_won)}</span>
          <span class="stat-title">Bounties Won</span>
        </div>
        <div class="stat-tile">
          <span class="stat-num">${num(record.podium_finishes)}</span>
          <span class="stat-title">Podium Finishes</span>
        </div>
        <div class="stat-tile">
          <span class="stat-num">${money(record.prize_usd)}</span>
          <span class="stat-title">Total Prize Earnings</span>
        </div>
      </div>

      <div class="panel">
        <h2 class="panel-heading">Competition History & Submissions (${num(solutions.length)})</h2>
        <table class="table-main">
          <thead>
            <tr>
              <th>Competition / Submission</th>
              <th>Category</th>
              <th class="text-right">Score</th>
              <th class="text-right">Prize Pool</th>
              <th class="text-right">Entered At</th>
            </tr>
          </thead>
          <tbody>
            ${solutionRows || '<tr><td colspan="5" class="empty-state">No competition entries yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}

/** Error or Not Found fallback view */
export function notFound(msg = 'Page Not Found') {
  return `
    <div class="error-panel">
      <h2>404</h2>
      <p>${esc(msg)}</p>
      <a href="#/" class="btn btn-primary">Return to Bounty Board</a>
    </div>`;
}
