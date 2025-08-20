// In-memory latest view intent (ephemeral across function instances; OK for demo)
let LATEST = { view: null, updatedAt: 0, rev: 0 };

// Only accept these four incoming words; map singular 'problem' to canonical 'problems'
const CANON = {
  problem: 'problems',
  problems: 'problems', // tolerate but webhook sends singular
  crew: 'crew',
  overview: 'overview',
  schedule: 'schedule'
};

export default async function handler(req, res) {
  // CORS + preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const allowed = new Set(['crew', 'schedule', 'problems', 'overview']);

  // Helper: extract view from flexible payloads
  const extractView = (obj) => {
    if (!obj) return null;
    const tryKeys = [
      obj.view,
      obj.word,
      obj?.payload?.view,
      obj?.payload?.word,
      obj?.intent?.view,
      obj?.intent?.word
    ];
    for (const v of tryKeys) {
      if (typeof v === 'string') {
        const k = v.toLowerCase().trim();
        if (CANON[k]) return CANON[k];
      }
    }
    return null;
  };

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string'
        ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return { view: req.body }; } })()
        : (req.body || {});
      const view = extractView(body);
      if (!view) {
        return res.status(400).json({ error: 'Missing view', expected: Object.keys(CANON) });
      }
      // view is already canonical (one of allowed)
      LATEST = { view, updatedAt: Date.now(), rev: (LATEST.rev || 0) + 1, echo: body };
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, ...LATEST });
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body', detail: e.message });
    }
  }

  if (req.method === 'GET') {
    // Optional quick-test: /api/voice-intent?set=1&view=crew
    const set = String(req.query.set || '').trim() === '1';
    const qView = (req.query.view || '').toString().trim().toLowerCase();
    if (set && qView) {
      const canonical = CANON[qView];
      if (!canonical || !allowed.has(canonical)) return res.status(400).json({ error: 'Unsupported view', received: qView, allowed: [...allowed] });
      LATEST = { view: canonical, updatedAt: Date.now(), rev: (LATEST.rev || 0) + 1, echo: { via: 'query' } };
    }

    const since = Number(req.query.since || 0);
  const changed = LATEST.updatedAt > since; // retained for backward compatibility
    res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ...LATEST, changed, allowed: [...allowed] });
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
