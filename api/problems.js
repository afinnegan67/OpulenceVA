import { fetchAirtableTable } from "./_airtable";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const baseId = req.query.baseId || process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
    const table =
      req.query.problemsTableId ||
      req.query.problemsTableName ||
      process.env.AIRTABLE_PROBLEMS_TABLE_ID ||
      process.env.AIRTABLE_PROBLEMS_TABLE_NAME ||
      process.env.AIRTABLE_PROBLEMS_TABLE ||
      "Problems";

    const records = await fetchAirtableTable({ baseId, table, apiKey });

    const issues = records.map(({ id, fields: f = {} }) => ({
      id,
      problemId: f["A Problem ID"] || f["Problem ID"] || f["ID"] || "",
      type: f["A Type"] || f["Type"] || "",
      description: f["Description"] || "",
      project: f["A Project"] || f["Project"] || f["Project Name"] || "",
      status: f["A Status"] || f["Status"] || "",
      severity: f["A Severity"] || f["Severity"] || "",
      assignedTo: f["A Assigned to"] || f["Assigned To"] || f["Owner"] || "",
      reportedDate: f["Reported Date"] || f["Reported"] || f["Date"] || ""
    }));

    const projects = Array.from(new Set(issues.map(i => i.project).filter(Boolean)))
      .map(name => ({ id: name, name }));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ issues, projects });
  } catch (e) {
    console.error('[api/problems]', e);
    res.status(500).json({ error: e.message });
  }
}
