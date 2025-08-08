import { fetchAirtableTable } from "./_airtable";

export default async function handler(req, res) {
  try {
    const baseId = req.query.baseId || process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
    const table =
      req.query.overviewTableId ||
      req.query.overviewTableName ||
      process.env.AIRTABLE_OVERVIEW_TABLE_ID ||
      process.env.AIRTABLE_OVERVIEW_TABLE_NAME ||
      process.env.AIRTABLE_OVERVIEW_TABLE ||
      "Projects";

    const records = await fetchAirtableTable({ baseId, table, apiKey });

    const projects = records.map(({ id, fields: f = {} }) => ({
      id,
      name: f["Project"] || f["Project Name"] || f["Name"] || "",
      client: f["Client"] || "",
      status: f["Status"] || "",
      budget: f["Budget"] || "",
      start: f["Start Date"] || f["Start"] || "",
      end: f["End Date"] || f["End"] || ""
    }));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ projects });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
