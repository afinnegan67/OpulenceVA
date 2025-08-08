import { fetchAirtableTable } from "./_airtable";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const baseId = req.query.baseId || process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
    // Prefer table ID; fall back to name; default to your Problems table id
    const table =
      req.query.problemsTableId ||
      process.env.AIRTABLE_PROBLEMS_TABLE_ID ||
      req.query.problemsTableName ||
      process.env.AIRTABLE_PROBLEMS_TABLE_NAME ||
      process.env.AIRTABLE_PROBLEMS_TABLE ||
      "tbldVZsnQpnrR1Wvo";

    if (!baseId || !apiKey) {
      return res.status(500).json({ error: 'Missing AIRTABLE_BASE_ID or API key' });
    }

    const records = await fetchAirtableTable({ baseId, table, apiKey });

    // Map exact Airtable fields
    const issues = records.map(({ id, fields: f = {} }) => ({
      id,
      problemId: f["Problem ID"] || "",
      type: f["Type"] || "",
      description: f["Description"] || "",
      project: f["Project"] || "",
      reportedDate: f["Reported Date"] || "",
      status: f["Status"] || "",
      severity: f["Severity"] || "",
      assignedTo: f["Assigned to"] || ""
    }));

    const projects = Array.from(new Set(issues.map(i => i.project).filter(Boolean)))
      .map(name => ({ id: name, name }));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ issues, projects });
  } catch (e) {
    console.error('[api/problems] error:', e);
    return res.status(500).json({ error: e.message });
  }
}
