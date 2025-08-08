import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Environment variables (no hardcoded secrets; must be provided externally)
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
  console.warn("⚠️ Missing AIRTABLE_BASE_ID or AIRTABLE_TOKEN. API routes will return 500 until set.");
}

// Table identifiers (either ID or Name). Names are fallbacks.
const PROBLEMS_TABLE_ID = process.env.AIRTABLE_PROBLEMS_TABLE_ID;
const PROBLEMS_TABLE_NAME = process.env.AIRTABLE_PROBLEMS_TABLE_NAME || 'Problems';
const PROJECTS_TABLE_ID = process.env.AIRTABLE_PROJECTS_TABLE_ID;
const PROJECTS_TABLE_NAME = process.env.AIRTABLE_PROJECTS_TABLE_NAME || 'Projects';

// Proxy endpoint for Problems table
app.get("/api/problems", async (req, res) => {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return res.status(500).json({ error: "Server not configured: set AIRTABLE_BASE_ID and AIRTABLE_TOKEN." });
  }
  try {
    console.log('Fetching problems from Airtable...');

    // Allow overrides via query string (prefer IDs)
    const baseId = req.query.baseId || AIRTABLE_BASE_ID;
    const problemsTable =
      req.query.problemsTableId || PROBLEMS_TABLE_ID ||
      req.query.problemsTableName || PROBLEMS_TABLE_NAME;
    const projectsTable =
      req.query.projectsTableId || PROJECTS_TABLE_ID ||
      req.query.projectsTableName || PROJECTS_TABLE_NAME;

    const problemsUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(problemsTable)}?pageSize=100`;
    const projectsUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(projectsTable)}?pageSize=100`;

    const [problemsRes, projectsRes] = await Promise.all([
      fetch(problemsUrl, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }),
      fetch(projectsUrl, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
    ]);

    if (!problemsRes.ok || !projectsRes.ok) {
      console.error(`Airtable API Error - Problems: ${problemsRes.status}, Projects: ${projectsRes.status}`);
      return res.status(500).json({
        error: `Airtable API error: Problems ${problemsRes.status}, Projects ${projectsRes.status}`
      });
    }

    const [problemsData, projectsData] = await Promise.all([
      problemsRes.json(),
      projectsRes.json()
    ]);

    // Transform the data to match the expected format
    const issues = (problemsData.records || []).map(rec => ({
      id: rec.id,
      problemId: rec.fields["A Problem ID"] || rec.fields["Problem ID"] || "—",
      type: rec.fields["A Type"] || rec.fields["Type"] || "—",
      description: rec.fields["Description"] || "No description provided",
      project: rec.fields["A Project"] || rec.fields["Project"] || "—",
      reportedDate: rec.fields["Reported Date"] || null,
      status: rec.fields["A Status"] || rec.fields["Status"] || "Open",
      severity: rec.fields["A Severity"] || rec.fields["Severity"] || "Medium",
      assignedTo: rec.fields["A Assigned to"] || rec.fields["Assigned to"] || "—"
    }));

    const projects = (projectsData.records || []).map(rec => ({
      id: rec.id,
      name: rec.fields["Name"] || rec.fields["Project Name"] || "Unnamed Project"
    }));

    console.log(`✅ Successfully fetched ${issues.length} problems and ${projects.length} projects`);
    res.json({ issues, projects });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for Crew table
app.get("/api/crew", async (req, res) => {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return res.status(500).json({ error: "Server not configured: set AIRTABLE_BASE_ID and AIRTABLE_TOKEN." });
  }
  try {
    console.log('Fetching crew from Airtable...');
    
    const crewUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Crew?pageSize=100`;
    
    const response = await fetch(crewUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });

    if (!response.ok) {
      console.error(`Airtable API Error - Crew: ${response.status}`);
      return res.status(500).json({ 
        error: `Airtable API error: Crew ${response.status}` 
      });
    }

    const data = await response.json();
    
    // Transform the data to match the expected format
    const crews = (data.records || []).map(rec => ({
      id: rec.id,
      name: rec.fields["A Name"] || rec.fields["Name"] || "Unnamed Crew",
      role: rec.fields["A Role"] || rec.fields["Role"] || "—",
      members: Number(rec.fields["Members"] || 1),
      utilization: Math.min(Math.max(Number(rec.fields["Utilization"] || 75), 0), 100),
      nextFreeISO: rec.fields["NextFreeISO"] || rec.fields["Next Free"] || null,
      tags: Array.isArray(rec.fields["Skills"]) ? rec.fields["Skills"] : [],
      project: rec.fields["A Current Project"] || rec.fields["Current Project"] || "—",
      status: rec.fields["A Status"] || rec.fields["Status"] || "Active",
      contact: rec.fields["A Contact"] || rec.fields["Contact"] || "—"
    }));

    console.log(`✅ Successfully fetched ${crews.length} crew members`);
    
    res.json({ crews });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔗 Using Git repo? Push changes to trigger redeploy on Vercel.`);
  console.log(
    AIRTABLE_BASE_ID && AIRTABLE_TOKEN
      ? "✅ Airtable credentials loaded from env."
      : "❌ Airtable credentials missing (set AIRTABLE_BASE_ID & AIRTABLE_TOKEN)."
  );
  console.log(`📊 Dashboard available at http://localhost:${PORT}/index.html`);
  console.log(`🔧 API endpoints:`);
  console.log(`   - GET /api/problems`);
  console.log(`   - GET /api/crew`);
  console.log(`   - GET /api/health`);
});
