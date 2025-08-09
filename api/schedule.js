export default async function handler(req, res) {
  // CORS + preflight to help local Live Server testing
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
      req.query.scheduleTableId ||
      req.query.scheduleTableName ||
      process.env.AIRTABLE_SCHEDULE_TABLE_ID ||
      process.env.AIRTABLE_SCHEDULE_TABLE_NAME ||
      process.env.AIRTABLE_SCHEDULE_TABLE ||
      'Schedule';

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

    // Normalize to tasks array for the Gantt
    const tasks = records.map(({ id, fields: f = {} }) => {
      // Support both "A ..." and plain names
      const taskId = f['Task ID'] || f['A Task ID'] || id;
      const name = f['Task Name'] || f['A Task Name'] || '';
      const project = f['Project'] || f['A Project'] || '';
      const startDate = f['Start Date'] || f['A Start Date'] || '';
      const endDate = f['End Date'] || f['A End Date'] || '';
      const crew = f['Crew'] || f['A Crew'] || '';
      const dependencies = f['Dependencies'] || f['A Dependencies'] || '';
      let pct = f['Percent Complete'];
      if (pct === undefined) pct = f['% Percent Complete'];
      // Convert 0..1 to 0..100 if needed
      const percentComplete =
        typeof pct === 'number'
          ? (pct <= 1 ? Math.round(pct * 100) : Math.round(pct))
          : 0;

      return {
        id,
        taskId,
        name,
        project,
        crew,
        startDate,
        endDate,
        percentComplete,
        dependencies
      };
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ baseId, table, count: tasks.length, tasks });
  } catch (e) {
    console.error('[api/schedule]', e);
    return res.status(500).json({ error: 'Function crashed', detail: e.message });
  }
}
