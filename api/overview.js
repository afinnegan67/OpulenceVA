export default async function handler(req, res) {
  // CORS + preflight (helps during Live Server testing)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Polyfill fetch for older runtimes
  async function getFetch() {
    if (typeof fetch !== 'undefined') return fetch;
    const mod = await import('node-fetch');
    return mod.default;
  }

  try {
    const baseId = req.query.baseId || process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
    const table =
      req.query.overviewTableId ||
      req.query.overviewTableName ||
      process.env.AIRTABLE_OVERVIEW_TABLE_ID ||
      process.env.AIRTABLE_OVERVIEW_TABLE_NAME ||
      process.env.AIRTABLE_OVERVIEW_TABLE ||
      'Overview';

    if (!baseId || !apiKey || !table) {
      return res.status(500).json({
        error: 'Missing configuration',
        detail: { hasBaseId: !!baseId, hasApiKey: !!apiKey, table }
      });
    }

    const $fetch = await getFetch();

    // Paged fetch
    const makeUrl = (offset) => {
      const u = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);
      u.searchParams.set('pageSize', '100');
      if (offset) u.searchParams.set('offset', offset);
      if (req.query.view) u.searchParams.set('view', req.query.view);
      if (req.query.maxRecords) u.searchParams.set('maxRecords', req.query.maxRecords);
      if (req.query.returnFieldsByFieldId === 'true') u.searchParams.set('returnFieldsByFieldId', 'true');
      return u.toString();
    };

    const records = [];
    let next = makeUrl();
    while (next) {
      const r = await $fetch(next, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!r.ok) {
        const text = await r.text();
        return res.status(r.status).json({ error: 'Airtable error', status: r.status, detail: text, baseId, table });
      }
      const j = await r.json();
      records.push(...(j.records || []));
      next = j.offset ? makeUrl(j.offset) : null;
    }

    // Normalize fields
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const parsePercent = (v) => {
      if (typeof v === 'number') return v <= 1 ? Math.round(v * 100) : Math.round(v);
      if (typeof v === 'string') {
        const t = v.trim();
        if (t.endsWith('%')) return clamp(parseFloat(t.slice(0, -1)) || 0, 0, 100);
        const n = parseFloat(t);
        if (!isNaN(n)) return n <= 1 ? Math.round(n * 100) : Math.round(n);
      }
      return 0;
    };

    const projects = records.map(({ id, fields: f = {} }) => ({
      id,
      projectId: f['Project ID'] || f['A Project ID'] || '',
      name: f['Project Name'] || f['A Project Name'] || f['Name'] || '',
      client: f['Client'] || f['A Client'] || '',
      startDate: f['Start Date'] || f['A Start Date'] || '',
      endDate: f['End Date'] || f['A End Date'] || '',
      status: f['Status'] || f['A Status'] || '',
      percentComplete: parsePercent(f['Percent Complete'] ?? f['% Percent Complete']),
      budget: f['Budget'] || f['A Budget'] || '',
      spent: f['Spent'] || f['A Spent'] || ''
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ baseId, table, count: projects.length, projects });
  } catch (e) {
    console.error('[api/overview]', e);
    return res.status(500).json({ error: 'Function crashed', detail: e.message });
  }
}
