// Serverless function: GET /api/schedule
// Fetches Tasks + Projects from Airtable and returns normalized JSON.
import { fetchAirtableTable } from "./_airtable";

const fetch = global.fetch || (await import('node-fetch')).default;

function clamp(n, min, max){ return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0)); }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const baseId = req.query.baseId || process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
    const table =
      req.query.scheduleTableId ||
      req.query.scheduleTableName ||
      process.env.AIRTABLE_SCHEDULE_TABLE_ID ||
      process.env.AIRTABLE_SCHEDULE_TABLE_NAME ||
      process.env.AIRTABLE_SCHEDULE_TABLE ||
      process.env.AIRTABLE_TASKS_TABLE ||
      "Tasks";

    const records = await fetchAirtableTable({ baseId, table, apiKey });

    const tasks = records.map(({ id, fields: f = {} }) => ({
      id,
      name: f["Task Name"] || f["Name"] || f["Task"] || "",
      project: f["Project"] || f["Project Name"] || "",
      crew: f["Crew"] || f["Assigned Crew"] || "",
      startDate: f["Start Date"] || f["Start"] || "",
      endDate: f["End Date"] || f["End"] || "",
      duration: f["Duration"] || null,
      percentComplete: clamp(Number(f["Percent Complete"] || f["Progress"] || 0), 0, 100),
      dependencies: f["Dependencies"] || null,
      status: f["Status"] || ""
    }));

    const projects = Array.from(new Set(tasks.map(t => t.project).filter(Boolean)))
      .map(name => ({ id: name, name }));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ tasks, projects });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to fetch schedule', detail: e.message });
  }
}
      percentComplete: clamp(Number(rec.fields["Percent Complete"] || rec.fields["Progress"] || 0), 0, 100),
      dependencies: rec.fields["Dependencies"] || null,
      status: rec.fields["Status"] || "In Progress"
    }));

    const projects = projectsRaw.map(rec => ({
      id: rec.id,
      name: rec.fields["Name"] || rec.fields["Project Name"] || "Unnamed Project"
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ tasks, projects });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to fetch schedule', detail: e.message });
  }
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
