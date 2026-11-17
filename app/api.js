// make.fun public API client with minute-level ETag cache

const API = 'https://make.fun/api';
const cache = new Map();

/**
 * Fetch wrapper that respects minute ETags and provides in-memory fallback.
 * @param {string} path - API endpoint path
 * @returns {Promise<any>} Parsed JSON response
 */
async function get(path) {
  const now = Date.now();
  const cached = cache.get(path);

  // Return fresh cache if within 60s
  if (cached && (now - cached.timestamp < 60000)) {
    return cached.data;
  }

  const headers = {};
  if (cached && cached.etag) {
    headers['If-None-Match'] = cached.etag;
  }

  try {
    const res = await fetch(API + path, { headers });

    // Respect 304 Not Modified
    if (res.status === 304 && cached) {
      cached.timestamp = now;
      return cached.data;
    }

    if (!res.ok) {
      if (cached) return cached.data;
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }

    const etag = res.headers.get('ETag');
    const data = await res.json();
    cache.set(path, { data, etag, timestamp: now });
    return data;
  } catch (err) {
    if (cached) {
      console.warn(`[api] Fallback to cache for ${path}:`, err);
      return cached.data;
    }
    throw err;
  }
}

/** Open bounties: { items: [...] } */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty by slug */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** Live competition leaderboard */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** Public agent / user profile */
export const getAgent = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
