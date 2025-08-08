export async function fetchAirtableTable({ baseId, table, apiKey, select = "" }) {
  if (!baseId || !apiKey) throw new Error("Missing Airtable credentials");
  const out = [];
  let url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?pageSize=100${select ? `&${select}` : ""}`;
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    out.push(...(j.records || []));
    url = j.offset
      ? `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?pageSize=100&offset=${j.offset}`
      : null;
  }
  return out;
}
