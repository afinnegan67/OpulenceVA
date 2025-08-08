export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const baseId = req.query.baseId || process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
    const table =
      req.query.problemsTableId ||
      req.query.problemsTableName ||
      process.env.AIRTABLE_PROBLEMS_TABLE_ID ||
      process.env.AIRTABLE_PROBLEMS_TABLE_NAME ||
      process.env.AIRTABLE_PROBLEMS_TABLE ||
      'Problems';

    if (!baseId || !apiKey || !table) {
      return res.status(500).json({ error: 'Missing AIRTABLE_BASE_ID, AIRTABLE_API_KEY, or Problems table id/name' });
    }

    // Build initial URL (supports optional query overrides like view/maxRecords/sort)
    const mkUrl = (offset) => {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);
      url.searchParams.set('pageSize', '100');
      if (offset) url.searchParams.set('offset', offset);
      if (req.query.view) url.searchParams.set('view', req.query.view);
      if (req.query.maxRecords) url.searchParams.set('maxRecords', req.query.maxRecords);
      if (req.query.returnFieldsByFieldId === 'true') url.searchParams.set('returnFieldsByFieldId', 'true');
      return url.toString();
    };

    const records = [];
    let nextUrl = mkUrl();
    while (nextUrl) {
      const r = await fetch(nextUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Airtable error ${r.status}: ${text}`);
      }
      const j = await r.json();
      records.push(...(j.records || []));
      nextUrl = j.offset ? mkUrl(j.offset) : null;
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ records });
  } catch (e) {
    console.error('[api/problems]', e);
    return res.status(500).json({ error: e.message });
  }
}
