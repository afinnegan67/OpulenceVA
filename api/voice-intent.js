// In-memory latest view intent (ephemeral across function instances; OK for demo)
let LATEST = { view: null, updatedAt: 0 };

export default async function handler(req, res) {
  // CORS + preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const view = (body.view || '').toString().trim().toLowerCase();
      const allowed = new Set(['crew', 'schedule', 'problems', 'overview']);
      if (!view) return res.status(400).json({ error: 'Missing view' });
      if (!allowed.has(view)) return res.status(400).json({ error: 'Unsupported view', allowed: [...allowed] });
      LATEST = { view, updatedAt: Date.now() };
      return res.status(200).json({ ok: true, ...LATEST });
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body', detail: e.message });
    }
  }

  if (req.method === 'GET') {
    const since = Number(req.query.since || 0);
    const changed = LATEST.updatedAt > since;
    return res.status(200).json({ ...LATEST, changed });
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
