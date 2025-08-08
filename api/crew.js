import { fetchAirtableTable } from "./_airtable";

export default async function handler(req, res) {
  try {
    const baseId = req.query.baseId || process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
    const table =
      req.query.crewTableId ||
      req.query.crewTableName ||
      process.env.AIRTABLE_CREW_TABLE_ID ||
      process.env.AIRTABLE_CREW_TABLE_NAME ||
      process.env.AIRTABLE_CREW_TABLE ||
      "Crew";

    const records = await fetchAirtableTable({ baseId, table, apiKey });

    const crew = records.map(({ id, fields: f = {} }) => ({
      id,
      name: f["A Name"] || f["Name"] || "",
      role: f["A Role"] || f["Role"] || "",
      phone: f["Phone"] || "",
      email: f["Email"] || "",
      availability: f["Availability"] || "",
      assignedProject: f["A Current Project"] || f["Assigned Project"] || f["Current Project"] || "",
      status: f["A Status"] || f["Status"] || ""
    }));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ crew });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
