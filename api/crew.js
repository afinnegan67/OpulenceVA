export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const baseId = req.query.baseId || process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
    const table =
      req.query.crewTableId ||
      req.query.crewTableName ||
      process.env.AIRTABLE_CREW_TABLE_ID ||
      process.env.AIRTABLE_CREW_TABLE_NAME ||
      process.env.AIRTABLE_CREW_TABLE ||
      'Crew';

    if (!baseId || !apiKey || !table) {
      return res.status(500).json({ error: 'Missing AIRTABLE_BASE_ID, AIRTABLE_API_KEY, or Crew table id/name' });
    }

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
      const r = await fetch(next, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Airtable error ${r.status}: ${text}`);
      }
      const j = await r.json();
      records.push(...(j.records || []));
      next = j.offset ? makeUrl(j.offset) : null;
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ records });
  } catch (e) {
    console.error('[api/crew]', e);
    return res.status(500).json({ error: e.message });
  }
}
