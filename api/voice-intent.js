// /api/voice-intent.js

let LATEST = { view: null, updatedAt: 0 };

export default async function handler(req, res) {
  try {
    // --- CORS ---
    const reqAllowHeaders =
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', reqAllowHeaders);

    // Preflight
    if (req.method === 'OPTIONS') return res.status(204).end();

    // --- POST: update latest view ---
    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const view = (body.view || '').toString().trim().toLowerCase();
      const allowed = new Set(['crew', 'schedule', 'problems', 'overview']);
      if (!view) return res.status(400).json({ error: 'Missing view' });
      if (!allowed.has(view))
        return res
          .status(400)
          .json({ error: 'Unsupported view', allowed: [...allowed] });

      LATEST = { view, updatedAt: Date.now() };
      return res.status(200).json({ ok: true, ...LATEST });
    }

    // --- GET: fetch latest view ---
    if (req.method === 'GET') {
      const since = Number(req.query?.since || 0);
      const changed = LATEST.updatedAt > since;
      return res.status(200).json({ ...LATEST, changed });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('voice-intent error', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
