(function(){
  const cfg = window.OPULENCE || {};
  const isLocalStatic = ['localhost','127.0.0.1'].includes(location.hostname);
  const baseApi = isLocalStatic ? 'http://localhost:3000/api/overview' : '/api/overview';

  const getBtn = document.getElementById('getBtn');
  const statusEl = document.getElementById('status');
  const cards = document.getElementById('cards');

  function buildUrl() {
    const u = new URL(baseApi, window.location.origin);
    if (cfg.baseId) u.searchParams.set('baseId', cfg.baseId);
    if (cfg.overviewTableId) u.searchParams.set('overviewTableId', cfg.overviewTableId);
    if (cfg.overviewTableName) u.searchParams.set('overviewTableName', cfg.overviewTableName);
    return u.toString();
  }

  function escapeHTML(s){
    return String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }
  function fmtDate(d){
    if (!d) return '—';
    const t = new Date(d);
    return isNaN(t) ? '—' : t.toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });
  }
  function statusClass(s){
    const k = String(s||'').toLowerCase().replace(/\s+/g,'-');
    if (k.includes('progress')) return 'status-in-progress';
    if (k.includes('done') || k.includes('complete')) return 'status-done';
    if (k.includes('todo') || k.includes('not-started')) return 'status-todo';
    return 'status-in-progress';
  }
  function percent(n){
    const v = Number.isFinite(+n) ? +n : 0;
    return Math.max(0, Math.min(100, v));
  }

  function renderCards(projects){
    if (!Array.isArray(projects) || !projects.length){
      cards.innerHTML = '<p style="color:#6b7280;text-align:center;padding:12px;">No projects found.</p>';
      return;
    }
    cards.innerHTML = projects.map(p => {
      const pct = percent(p.percentComplete);
      return `
        <div class="proj-card">
          <div class="proj-head">
            <div>
              <div class="proj-title">${escapeHTML(p.name || '—')}</div>
              <div style="color:#6b7280;font-size:12px;">${escapeHTML(p.projectId || '')}</div>
            </div>
            <span class="badge ${statusClass(p.status)}">${escapeHTML(p.status || '—')}</span>
          </div>

          <div class="proj-meta">
            <div><span>Client:</span> ${escapeHTML(p.client || '—')}</div>
            <div><span>Percent:</span> ${pct}%</div>
            <div><span>Start:</span> ${escapeHTML(fmtDate(p.startDate))}</div>
            <div><span>End:</span> ${escapeHTML(fmtDate(p.endDate))}</div>
          </div>

          <div class="progress" aria-label="Percent Complete" title="${pct}% complete">
            <div class="bar" style="width:${pct}%"></div>
          </div>

          <div class="money">
            <div><span style="color:#6b7280;">Budget:</span> ${escapeHTML(p.budget || '—')}</div>
            <div><span style="color:#6b7280;">Spent:</span> ${escapeHTML(p.spent || '—')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function getOverview() {
    try {
      getBtn.disabled = true;
      getBtn.textContent = 'Loading…';
      statusEl.style.display = 'inline';
      statusEl.style.color = '#6b7280';
      statusEl.textContent = 'Fetching from API…';
      cards.innerHTML = '';

      const url = buildUrl();
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`HTTP ${r.status}: ${txt}`);
      }
      const data = await r.json();
      const projects = data.projects || [];

      renderCards(projects);

      statusEl.style.color = '#059669';
      statusEl.textContent = `Done. ${projects.length} projects.`;
    } catch (e) {
      statusEl.style.color = '#e11d48';
      statusEl.textContent = `Error: ${e.message}`;
      console.error(e);
      cards.innerHTML = '';
    } finally {
      getBtn.disabled = false;
      getBtn.textContent = 'Get';
    }
  }

  getBtn.addEventListener('click', getOverview);
})();
