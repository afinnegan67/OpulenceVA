// In-memory latest view intent (ephemeral across function instances; OK for demo)
let LATEST = { view: null, updatedAt: 0 };

export default async function handler(req, res) {
  // CORS + preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const allowed = new Set(['crew', 'schedule', 'problems', 'overview']);

  // Helper: extract view from flexible payloads
  const extractView = (obj) => {
    const pick = (v) => (v && typeof v === 'string') ? v.toLowerCase().trim() : null;
    if (!obj || typeof obj !== 'object') return null;
    return (
      pick(obj.view) ||
      pick(obj.name) ||
      pick(obj.targetView) ||
      pick(obj.intent && obj.intent.view) ||
      pick(obj.action && obj.action.view) ||
      pick(obj.payload && obj.payload.view) ||
      null
    );
  };

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const view = extractView(body);
      if (!view) return res.status(400).json({ error: 'Missing view', allowed: [...allowed] });
      if (!allowed.has(view)) return res.status(400).json({ error: 'Unsupported view', view, allowed: [...allowed] });

      LATEST = { view, updatedAt: Date.now(), echo: body };
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
      if (!allowed.has(qView)) return res.status(400).json({ error: 'Unsupported view', allowed: [...allowed] });
      LATEST = { view: qView, updatedAt: Date.now(), echo: { via: 'query' } };
    }

    const since = Number(req.query.since || 0);
    const changed = LATEST.updatedAt > since;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ...LATEST, changed, allowed: [...allowed] });
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
