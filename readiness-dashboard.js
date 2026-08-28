(() => {
  const STORAGE_KEYS = ['mgs-prototype-v3', 'mgs-prototype-v2', 'mgs-prototype-v1'];
  const READINESS_KEYS = [
    'installerTesting',
    'inspectionWitness',
    'concealedInspection',
    'labelsComplete',
    'systemsReady',
    'documentationReady'
  ];

  const projectList = document.getElementById('projectList');
  const projectDetail = document.getElementById('projectDetail');
  if (!projectList || !projectDetail) return;

  const styles = document.createElement('style');
  styles.textContent = `
    .readiness-badge{display:inline-flex!important;align-items:center;gap:6px;width:max-content;margin-top:8px!important;padding:5px 8px;border-radius:999px;font-size:.72rem!important;font-weight:800;line-height:1.2}
    .readiness-badge.not-started{background:#edf1f5;color:#637083}
    .readiness-badge.in-progress{background:#fff1dc;color:#9a6400}
    .readiness-badge.ready{background:#e7f5ed;color:#1f7a4c}
    .readiness-summary{margin-top:14px;padding:14px;border:1px solid #dbe3ec;border-radius:12px;background:#fff;display:grid;gap:10px}
    .readiness-summary-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .readiness-summary-head strong{font-size:.95rem}
    .readiness-summary p{margin:0;color:#637083;font-size:.84rem;line-height:1.45}
    .readiness-meter{height:8px;background:#edf1f5;border-radius:999px;overflow:hidden}
    .readiness-meter span{display:block;height:100%;background:#1565c0;border-radius:999px;transition:width .2s ease}
    .readiness-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .readiness-link{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #dbe3ec;border-radius:9px;padding:8px 10px;color:#102033;background:#fff;font-size:.8rem;font-weight:750}
    .readiness-updated{font-size:.75rem;color:#637083}
  `;
  document.head.appendChild(styles);

  function loadState() {
    try {
      for (const key of STORAGE_KEYS) {
        const parsed = JSON.parse(localStorage.getItem(key));
        if (parsed && Array.isArray(parsed.projects)) return parsed;
      }
    } catch (error) {
      console.error('Unable to read project readiness', error);
    }
    return { projects: [], selectedProjectId: null };
  }

  function readinessFor(project) {
    const items = project?.verifierReadiness?.items || {};
    const completed = READINESS_KEYS.filter(key => Boolean(items[key])).length;
    const total = READINESS_KEYS.length;
    const percent = Math.round((completed / total) * 100);
    const status = completed === 0 ? 'not-started' : completed === total ? 'ready' : 'in-progress';
    const label = status === 'ready' ? 'Ready for Verifier' : status === 'in-progress' ? 'In Progress' : 'Not Started';
    return { completed, total, percent, status, label, updatedAt: project?.verifierReadiness?.updatedAt || null };
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function decorateProjectRows(state) {
    projectList.querySelectorAll('[data-project-id]').forEach(row => {
      const project = state.projects.find(item => item.id === row.dataset.projectId);
      if (!project) return;
      const readiness = readinessFor(project);
      let badge = row.querySelector('.readiness-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'readiness-badge';
        row.appendChild(badge);
      }
      badge.className = `readiness-badge ${readiness.status}`;
      const text = `${readiness.label} · ${readiness.completed}/${readiness.total}`;
      if (badge.textContent !== text) badge.textContent = text;
      badge.setAttribute('aria-label', `Verifier readiness: ${readiness.label}, ${readiness.completed} of ${readiness.total} handoff items complete`);
    });
  }

  function decorateSelectedProject(state) {
    const activeProjectId = projectList.querySelector('.project-row.active')?.dataset.projectId || null;
    const selectedProjectId = state.selectedProjectId || activeProjectId;
    const project = state.projects.find(item => item.id === selectedProjectId);
    const existing = projectDetail.querySelector('.readiness-summary');
    if (!project) {
      existing?.remove();
      return;
    }

    const readiness = readinessFor(project);
    const updated = readiness.updatedAt
      ? `Updated ${new Date(readiness.updatedAt).toLocaleString()}`
      : 'No handoff checklist activity yet.';
    const signature = [project.id, readiness.status, readiness.completed, readiness.updatedAt || 'never'].join('|');

    if (existing?.dataset.readinessSignature === signature) return;

    const html = `
      <div class="readiness-summary" data-readiness-project="${escapeHtml(project.id)}" data-readiness-signature="${escapeHtml(signature)}">
        <div class="readiness-summary-head">
          <strong>Verifier handoff</strong>
          <span class="readiness-badge ${readiness.status}">${readiness.label}</span>
        </div>
        <div class="readiness-meter" aria-label="${readiness.percent}% complete"><span style="width:${readiness.percent}%"></span></div>
        <p>${readiness.completed} of ${readiness.total} Ready for Verifier items are complete. This is a project handoff aid, not proof of inspection, compliance, or final verification.</p>
        <div class="readiness-actions">
          <span class="readiness-updated">${escapeHtml(updated)}</span>
          <a class="readiness-link" href="testing.html">Open Testing & Verification</a>
        </div>
      </div>`;

    existing?.remove();
    projectDetail.insertAdjacentHTML('beforeend', html);
  }

  let scheduled = false;
  function decorate() {
    const state = loadState();
    decorateProjectRows(state);
    decorateSelectedProject(state);
  }

  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorate();
    });
  }

  const observer = new MutationObserver(scheduleDecorate);
  observer.observe(projectList, { childList: true, subtree: true });
  observer.observe(projectDetail, { childList: true, subtree: true });
  window.addEventListener('storage', scheduleDecorate);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleDecorate();
  });

  decorate();
})();
