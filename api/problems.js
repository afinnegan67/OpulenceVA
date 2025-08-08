<div id="problems-view" class="dash dash-problems">
  <div class="panel">
    <div class="panel-head">
      <h3>🚨 Active Problems</h3>
      <p>Track and resolve issues across all projects</p>
    </div>

    <!-- Summary Bar -->
    <div id="summary-bar" class="summary-bar">
      <div class="loader" style="display:block; margin:2rem auto;"></div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <select id="statusFilter" class="filter-select">
        <option value="">All Statuses</option>
      </select>
      <select id="projectFilter" class="filter-select">
        <option value="">All Projects</option>
      </select>
      <select id="severityFilter" class="filter-select">
        <option value="">All Severities</option>
      </select>
      <button id="refreshBtn" class="refresh-btn">🔄 Refresh</button>
      <button id="testConnectionBtn" class="test-btn">🔍 Test Connection</button>
    </div>

    <!-- Problems Table -->
    <div id="problems-table" class="problems-table">
      <div class="loader" style="display:block; margin:2rem auto;"></div>
    </div>

    <div id="problems-status" class="status muted" style="display:none"></div>
  </div>
</div>

<!-- Modal -->
<div id="problemModal" class="modal">
  <div class="modal-content">
    <h3 id="modalTitle"></h3>
    <div id="modalBody"></div>
    <button onclick="closeProblemModal()" class="modal-btn">Close</button>
  </div>
</div>

<div id="problemOverlay" class="modal-overlay" onclick="closeProblemModal()"></div>

<style>
  #problems-view .panel{background:rgba(255,255,255,.95);border-radius:16px;padding:1.25rem;box-shadow:0 8px 24px rgba(0,0,0,.08)}
  #problems-view .panel-head{text-align:center;margin-bottom:1.5rem}
  #problems-view .panel-head h3{color:#4f46e5;font-size:1.8rem;margin-bottom:.5rem}
  #problems-view .panel-head p{color:#6b7280;font-size:1rem}
  #problems-view .summary-bar{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;margin-bottom:1rem}
  #problems-view .summary-card{flex:1;min-width:150px;background:white;padding:1rem;border-radius:12px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.05)}
  #problems-view .summary-card h2{font-size:1.8rem;margin-bottom:.5rem}
  #problems-view .summary-card p{color:#6b7280;font-size:.9rem}
  #problems-view .filters{margin-bottom:1rem;text-align:center}
  #problems-view .filter-select{padding:0.5rem;border-radius:8px;border:1px solid #ddd;margin-left:0.5rem}
  #problems-view .refresh-btn{background:#4f46e5;color:white;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;margin-left:0.5rem}
  #problems-view .refresh-btn:hover{background:#4338ca}
  #problems-view .test-btn{background:#059669;color:white;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;margin-left:0.5rem}
  #problems-view .test-btn:hover{background:#047857}
  #problems-view .problems-table{overflow-x:auto}
  #problems-view .problems-table table{width:100%;border-collapse:collapse}
  #problems-view .problems-table th{background:#eef2ff;color:#4f46e5;padding:0.75rem;text-align:left;font-weight:600}
  #problems-view .problems-table td{padding:0.75rem;border-bottom:1px solid #f3f4f6}
  #problems-view .status-badge{color:white;padding:0.25rem 0.5rem;border-radius:6px;font-size:.8rem}
  #problems-view .status-open{background:#e11d48}
  #problems-view .status-in-progress{background:#f59e0b}
  #problems-view .status-resolved{background:#059669}
  #problems-view .severity-badge{color:white;padding:0.25rem 0.5rem;border-radius:6px;font-size:.8rem}
  #problems-view .severity-high{background:#dc2626}
  #problems-view .severity-medium{background:#f59e0b}
  #problems-view .severity-low{background:#10b981}
  #problems-view .view-btn{background:#4f46e5;color:white;border:none;padding:0.4rem 0.8rem;border-radius:6px;cursor:pointer}
  #problems-view .view-btn:hover{background:#4338ca}
  #problems-view .status.muted{color:#6b7280;text-align:center;margin-top:1rem}
  #problems-view .loader{display:inline-block;width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#4f46e5;border-radius:50%;animation:spin 1s linear infinite}
  @keyframes spin { to { transform: rotate(360deg); } }
  
  .modal{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%, -50%);background:white;padding:20px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:1000;width:400px;max-width:90%}
  .modal-content h3{color:#4f46e5;margin-bottom:10px}
  .modal-btn{margin-top:15px;padding:8px 14px;border:none;border-radius:8px;background:#4f46e5;color:white;cursor:pointer}
  .modal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999}
</style>

<script>
(function(){
  const SLOT = document.getElementById('problems-view');
  const summaryBar = SLOT.querySelector('#summary-bar');
  const problemsTable = SLOT.querySelector('#problems-table');
  const status = SLOT.querySelector('#problems-status');
  const statusFilter = SLOT.querySelector('#statusFilter');
  const projectFilter = SLOT.querySelector('#projectFilter');
  const severityFilter = SLOT.querySelector('#severityFilter');
  const refreshBtn = SLOT.querySelector('#refreshBtn');
  const testConnectionBtn = SLOT.querySelector('#testConnectionBtn');

  let PROBLEMS_DATA = [];

  // Fetch data from /api/problems
  async function fetchProblemsData() {
    try {
      console.log('Attempting to fetch from /api/problems...');
      const response = await fetch('/api/problems', { 
        cache: "no-store",
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Successfully fetched data:', data);
      return { issues: data.issues || [], projects: data.projects || [] };
    } catch (e) {
      console.error('Problems fetch error:', e);
      status.style.display = "block";
      status.textContent = `Error loading data: ${e.message}. Using demo data.`;
      status.style.color = "#e11d48";
      
      // Return demo data as fallback
      return {
        issues: [
          {
            id: "demo1",
            problemId: "P-001",
            type: "Scheduling Hole", 
            description: "Drywall finished early, gap in schedule",
            project: "Kitchen Remodel",
            reportedDate: "2025-08-07",
            status: "Open",
            severity: "High",
            assignedTo: "Dan The Man"
          },
          {
            id: "demo2",
            problemId: "P-002",
            type: "Material Delay",
            description: "Cement delivery pushed back 4 days", 
            project: "Patio Extension",
            reportedDate: "2025-08-05",
            status: "In Progress",
            severity: "High",
            assignedTo: "Bob Builder"
          }
        ],
        projects: [
          { id: "demo1", name: "Kitchen Remodel" },
          { id: "demo2", name: "Patio Extension" }
        ]
      };
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString([], { month:"short", day:"numeric", year:"numeric" });
  }

  function getStatusClass(status) {
    const s = (status || "").toLowerCase().replace(/\s+/g, '-');
    return `status-${s}`;
  }

  function getSeverityClass(severity) {
    const s = (severity || "").toLowerCase();
    return `severity-${s}`;
  }

  function escapeHTML(s){
    return String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }

  // Render summary statistics
  function renderSummary(issues) {
    const openIssues = issues.filter(i => (i.status || "").toLowerCase() === "open").length;
    const highSeverityIssues = issues.filter(i => 
      (i.severity || "").toLowerCase() === "high" && 
      (i.status || "").toLowerCase() !== "resolved"
    ).length;
    const resolvedIssues = issues.filter(i => (i.status || "").toLowerCase() === "resolved").length;

    summaryBar.innerHTML = `
      <div class="summary-card">
        <h2 style="color:#4f46e5;">${openIssues}</h2>
        <p>Open Issues</p>
      </div>
      <div class="summary-card">
        <h2 style="color:#e11d48;">${highSeverityIssues}</h2>
        <p>High Severity</p>
      </div>
      <div class="summary-card">
        <h2 style="color:#059669;">${resolvedIssues}</h2>
        <p>Resolved</p>
      </div>
    `;
  }

  // Populate filter dropdowns
  function populateFilters(issues) {
    const statuses = [...new Set(issues.map(i => i.status).filter(Boolean))];
    const projects = [...new Set(issues.map(i => i.project).filter(Boolean))];
    const severities = [...new Set(issues.map(i => i.severity).filter(Boolean))];

    statusFilter.innerHTML = '<option value="">All Statuses</option>' + 
      statuses.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");
    
    projectFilter.innerHTML = '<option value="">All Projects</option>' + 
      projects.map(p => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`).join("");
    
    severityFilter.innerHTML = '<option value="">All Severities</option>' + 
      severities.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");
  }

  // Filter issues based on current filter selections
  function filterIssues(issues) {
    const statusValue = statusFilter.value;
    const projectValue = projectFilter.value;
    const severityValue = severityFilter.value;
    
    return issues.filter(issue => {
      const statusMatch = !statusValue || issue.status === statusValue;
      const projectMatch = !projectValue || issue.project === projectValue;
      const severityMatch = !severityValue || issue.severity === severityValue;
      return statusMatch && projectMatch && severityMatch;
    });
  }

  // Render the problems table
  function renderProblemsTable(issues) {
    const filteredIssues = filterIssues(issues);
    
    if (filteredIssues.length === 0) {
      problemsTable.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">No problems match your filters.</p>';
      return;
    }

    problemsTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Problem ID</th>
            <th>Type</th>
            <th>Description</th>
            <th>Project</th>
            <th>Status</th>
            <th>Severity</th>
            <th>Assigned To</th>
            <th>Reported Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${filteredIssues.map((issue, index) => `
            <tr>
              <td>${escapeHTML(issue.problemId)}</td>
              <td>${escapeHTML(issue.type)}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(issue.description)}</td>
              <td>${escapeHTML(issue.project)}</td>
              <td><span class="status-badge ${getStatusClass(issue.status)}">${escapeHTML(issue.status)}</span></td>
              <td><span class="severity-badge ${getSeverityClass(issue.severity)}">${escapeHTML(issue.severity)}</span></td>
              <td>${escapeHTML(issue.assignedTo)}</td>
              <td>${formatDate(issue.reportedDate)}</td>
              <td><button onclick="openProblemModal(${index})" class="view-btn">View</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // Main render function
  function render(data) {
    const { issues } = data;
    PROBLEMS_DATA = issues;
    renderSummary(issues);
    populateFilters(issues);
    renderProblemsTable(issues);
  }

  // Modal functions
  window.openProblemModal = function(index) {
    const filteredIssues = filterIssues(PROBLEMS_DATA);
    const issue = filteredIssues[index];
    if (!issue) return;

    document.getElementById('modalTitle').innerText = `Problem ${issue.problemId}`;
    document.getElementById('modalBody').innerHTML = `
      <p><strong>Type:</strong> ${escapeHTML(issue.type)}</p>
      <p><strong>Project:</strong> ${escapeHTML(issue.project)}</p>
      <p><strong>Status:</strong> <span class="status-badge ${getStatusClass(issue.status)}">${escapeHTML(issue.status)}</span></p>
      <p><strong>Severity:</strong> <span class="severity-badge ${getSeverityClass(issue.severity)}">${escapeHTML(issue.severity)}</span></p>
      <p><strong>Assigned To:</strong> ${escapeHTML(issue.assignedTo)}</p>
      <p><strong>Reported Date:</strong> ${formatDate(issue.reportedDate)}</p>
      <p><strong>Description:</strong></p>
      <div style="background:#f8f9fa;padding:0.75rem;border-radius:6px;margin-top:0.5rem;">${escapeHTML(issue.description)}</div>
    `;
    
    document.getElementById('problemModal').style.display = 'block';
    document.getElementById('problemOverlay').style.display = 'block';
  };

  window.closeProblemModal = function() {
    document.getElementById('problemModal').style.display = 'none';
    document.getElementById('problemOverlay').style.display = 'none';
  };

  // Test connection function
  async function testConnection() {
    try {
      status.style.display = "block";
      status.textContent = "Testing connection...";
      status.style.color = "#6b7280";
      
      const response = await fetch('/api/problems');
      if (response.ok) {
        const data = await response.json();
        status.textContent = `✅ Connection successful! Found ${data.issues?.length || 0} problems.`;
        status.style.color = "#059669";
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      status.textContent = `❌ Connection failed: ${error.message}`;
      status.style.color = "#e11d48";
    }
  }

  // Boot function - loads data and renders
  async function boot() {
    console.log('Problems dashboard booting...');
    status.style.display = "block";
    status.textContent = "Loading problems data…";
    status.style.color = "#6b7280";
    
    try {
      const data = await fetchProblemsData();
      console.log('Rendering data:', data);
      render(data);
      
      // Hide status if we have data, otherwise show fallback message
      if (data.issues.length > 0) {
        status.style.display = "none";
      } else {
        status.textContent = "No problems found.";
        status.style.color = "#6b7280";
      }
    } catch (e) {
      console.error('Boot error:', e);
      status.textContent = `Failed to load: ${e.message}`;
      status.style.color = "#e11d48";
    }
  }

  // Event listeners
  refreshBtn.addEventListener('click', () => {
