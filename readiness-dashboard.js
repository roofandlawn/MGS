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
  const READINESS_LABELS = {
    installerTesting: 'Installer testing complete',
    inspectionWitness: 'Required inspection / witnessing complete',
    concealedInspection: 'Concealed work inspected before cover',
    labelsComplete: 'Labels and valve tags complete',
    systemsReady: 'Source, alarms, outlets / inlets ready',
    documentationReady: 'Documentation ready for verifier'
  };

  const projectList = document.getElementById('projectList');
  const projectDetail = document.getElementById('projectDetail');
  if (!projectList || !projectDetail) return;

  const styles = document.createElement('style');
  styles.textContent = `
    .readiness-badge{display:inline-flex!important;align-items:center;gap:6px;width:max-content;margin-top:8px!important;padding:5px 8px;border-radius:999px;font-size:.72rem!important;font-weight:800;line-height:1.2}
    .readiness-badge.not-started{background:#edf1f5;color:#637083}
    .readiness-badge.in-progress{background:#fff1dc;color:#9a6400}
    .readiness-badge.ready{background:#e7f5ed;color:#1f7a4c}
    .readiness-evidence-badge{display:inline-flex!important;align-items:center;width:max-content;margin-top:6px!important;padding:4px 7px;border:1px solid #dbe3ec;border-radius:999px;background:#fff;color:#637083;font-size:.68rem!important;font-weight:750;line-height:1.2}
    .readiness-evidence-badge.complete{background:#eef7ff;border-color:#cfe4f7;color:#245f8f}
    .readiness-summary{margin-top:14px;padding:14px;border:1px solid #dbe3ec;border-radius:12px;background:#fff;display:grid;gap:10px}
    .readiness-summary-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .readiness-summary-head strong{font-size:.95rem}
    .readiness-summary p{margin:0;color:#637083;font-size:.84rem;line-height:1.45}
    .readiness-meter{height:8px;background:#edf1f5;border-radius:999px;overflow:hidden}
    .readiness-meter span{display:block;height:100%;background:#1565c0;border-radius:999px;transition:width .2s ease}
    .readiness-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .readiness-link{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #dbe3ec;border-radius:9px;padding:8px 10px;color:#102033;background:#fff;font-size:.8rem;font-weight:750}
    .readiness-updated{font-size:.75rem;color:#637083}
    .readiness-open-items{border-top:1px solid #edf1f5;padding-top:10px}
    .readiness-open-items summary{cursor:pointer;font-size:.82rem;font-weight:800;color:#102033;list-style-position:outside}
    .readiness-open-items ul{margin:9px 0 0;padding-left:20px;display:grid;gap:7px}
    .readiness-open-items li{color:#637083;font-size:.8rem;line-height:1.35}
    .readiness-open-link{color:#102033;text-decoration:none;font-weight:700}
    .readiness-open-link:hover,.readiness-open-link:focus{text-decoration:underline}
    .readiness-open-link::after{content:'  →';font-weight:800}
    .readiness-complete{margin:0;padding:9px 10px;border-radius:9px;background:#e7f5ed;color:#1f7a4c!important;font-weight:750}
    .readiness-evidence{border-top:1px solid #edf1f5;padding-top:10px;display:grid;gap:8px}
    .readiness-evidence-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .readiness-evidence-head strong{font-size:.82rem;color:#102033}
    .readiness-evidence-count{font-size:.74rem;color:#637083;font-weight:750}
    .readiness-evidence-meter{height:6px;background:#edf1f5;border-radius:999px;overflow:hidden}
    .readiness-evidence-meter span{display:block;height:100%;background:#4e86b4;border-radius:999px;transition:width .2s ease}
    .readiness-evidence-missing{margin:0;padding-left:20px;display:grid;gap:6px}
    .readiness-evidence-missing li{color:#637083;font-size:.78rem;line-height:1.35}
    .readiness-evidence-note{margin:0;padding:8px 10px;border-radius:9px;background:#f7fafc;color:#637083!important;font-size:.78rem!important}
    .readiness-evidence-good{margin:0;padding:8px 10px;border-radius:9px;background:#eef7ff;color:#245f8f!important;font-size:.78rem!important;font-weight:750}
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

  function normalizeEvidence(project, key) {
    const record = project?.verifierEvidence?.[key] || {};
    return {
      note: record.note || '',
      completionDate: record.completionDate || '',
      attachmentRef: record.attachmentRef || '',
      updatedAt: record.updatedAt || null
    };
  }

  function hasEvidence(record) {
    return Boolean(record.note || record.completionDate || record.attachmentRef);
  }

  function readinessFor(project) {
    const items = project?.verifierReadiness?.items || {};
    const completedKeys = READINESS_KEYS.filter(key => Boolean(items[key]));
    const missingKeys = READINESS_KEYS.filter(key => !items[key]);
    const completed = completedKeys.length;
    const total = READINESS_KEYS.length;
    const percent = Math.round((completed / total) * 100);
    const status = completed === 0 ? 'not-started' : completed === total ? 'ready' : 'in-progress';
    const label = status === 'ready' ? 'Ready for Verifier' : status === 'in-progress' ? 'In Progress' : 'Not Started';
    return {
      completed,
      total,
      percent,
      status,
      label,
      completedKeys,
      missingKeys,
      updatedAt: project?.verifierReadiness?.updatedAt || null
    };
  }

  function evidenceFor(project, readiness) {
    const supportedKeys = readiness.completedKeys.filter(key => hasEvidence(normalizeEvidence(project, key)));
    const unsupportedKeys = readiness.completedKeys.filter(key => !hasEvidence(normalizeEvidence(project, key)));
    const supported = supportedKeys.length;
    const completed = readiness.completedKeys.length;
    const percent = completed ? Math.round((supported / completed) * 100) : 0;
    const latestUpdate = READINESS_KEYS
      .map(key => normalizeEvidence(project, key).updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || null;
    const fingerprint = READINESS_KEYS
      .map(key => {
        const record = normalizeEvidence(project, key);
        return [key, record.note, record.completionDate, record.attachmentRef, record.updatedAt || ''].join(':');
      })
      .join('|');

    return {
      supported,
      completed,
      percent,
      supportedKeys,
      unsupportedKeys,
      latestUpdate,
      fingerprint
    };
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function testingLink(projectId, itemKey = null) {
    const params = new URLSearchParams();
    if (projectId) params.set('project', projectId);
    if (itemKey) params.set('item', itemKey);
    return `testing.html?${params.toString()}#readyForVerifier`;
  }

  function decorateProjectRows(state) {
    projectList.querySelectorAll('[data-project-id]').forEach(row => {
      const project = state.projects.find(item => item.id === row.dataset.projectId);
      if (!project) return;
      const readiness = readinessFor(project);
      const evidence = evidenceFor(project, readiness);
      let badge = row.querySelector('.readiness-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'readiness-badge';
        row.appendChild(badge);
      }
      badge.className = `readiness-badge ${readiness.status}`;
      const text = `${readiness.label} · ${readiness.completed}/${readiness.total}`;
      if (badge.textContent !== text) badge.textContent = text;
      const openCount = readiness.missingKeys.length;
      badge.setAttribute(
        'aria-label',
        `Verifier readiness: ${readiness.label}, ${readiness.completed} of ${readiness.total} handoff items complete, ${openCount} open`
      );

      let evidenceBadge = row.querySelector('.readiness-evidence-badge');
      if (!evidenceBadge) {
        evidenceBadge = document.createElement('span');
        evidenceBadge.className = 'readiness-evidence-badge';
        row.appendChild(evidenceBadge);
      }
      evidenceBadge.classList.toggle('complete', evidence.completed > 0 && evidence.supported === evidence.completed);
      evidenceBadge.textContent = evidence.completed
        ? `Evidence ${evidence.supported}/${evidence.completed} completed items`
        : 'Evidence — no completed items';
      evidenceBadge.setAttribute(
        'aria-label',
        evidence.completed
          ? `Evidence is saved for ${evidence.supported} of ${evidence.completed} completed handoff items`
          : 'No verifier handoff items are complete, so no evidence coverage is expected yet'
      );
    });
  }

  function openItemsMarkup(readiness, projectId) {
    if (!readiness.missingKeys.length) {
      return '<p class="readiness-complete">All six handoff items are marked complete. Open Testing & Verification to review the saved project record.</p>';
    }

    const items = readiness.missingKeys
      .map(key => {
        const label = escapeHtml(READINESS_LABELS[key] || key);
        const href = escapeHtml(testingLink(projectId, key));
        return `<li><a class="readiness-open-link" href="${href}">${label}</a></li>`;
      })
      .join('');

    return `
      <details class="readiness-open-items" open>
        <summary>Open items before verifier (${readiness.missingKeys.length})</summary>
        <ul>${items}</ul>
      </details>`;
  }

  function evidenceMarkup(evidence, projectId) {
    if (!evidence.completed) {
      return `
        <div class="readiness-evidence">
          <div class="readiness-evidence-head">
            <strong>Handoff evidence</strong>
            <span class="readiness-evidence-count">0 completed items</span>
          </div>
          <p class="readiness-evidence-note">Evidence coverage will appear here as handoff items are completed. A completion date, field note, or photo/document reference counts as saved evidence.</p>
        </div>`;
    }

    const missing = evidence.unsupportedKeys
      .map(key => {
        const label = escapeHtml(READINESS_LABELS[key] || key);
        const href = escapeHtml(testingLink(projectId, key));
        return `<li><a class="readiness-open-link" href="${href}">${label}</a> — no saved evidence</li>`;
      })
      .join('');

    const detail = evidence.unsupportedKeys.length
      ? `<ul class="readiness-evidence-missing">${missing}</ul>`
      : '<p class="readiness-evidence-good">Every completed handoff item has a saved completion date, note, or photo/document reference.</p>';

    return `
      <div class="readiness-evidence">
        <div class="readiness-evidence-head">
          <strong>Handoff evidence</strong>
          <span class="readiness-evidence-count">${evidence.supported}/${evidence.completed} supported</span>
        </div>
        <div class="readiness-evidence-meter" aria-label="${evidence.percent}% of completed items have evidence"><span style="width:${evidence.percent}%"></span></div>
        ${detail}
      </div>`;
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
    const evidence = evidenceFor(project, readiness);
    const updated = readiness.updatedAt
      ? `Checklist updated ${new Date(readiness.updatedAt).toLocaleString()}`
      : 'No handoff checklist activity yet.';
    const evidenceUpdated = evidence.latestUpdate
      ? ` Evidence updated ${new Date(evidence.latestUpdate).toLocaleString()}.`
      : '';
    const signature = [
      project.id,
      readiness.status,
      readiness.completed,
      readiness.missingKeys.join(','),
      readiness.updatedAt || 'never',
      evidence.supported,
      evidence.unsupportedKeys.join(','),
      evidence.fingerprint
    ].join('|');

    if (existing?.dataset.readinessSignature === signature) return;

    const html = `
      <div class="readiness-summary" data-readiness-project="${escapeHtml(project.id)}" data-readiness-signature="${escapeHtml(signature)}">
        <div class="readiness-summary-head">
          <strong>Verifier handoff</strong>
          <span class="readiness-badge ${readiness.status}">${readiness.label}</span>
        </div>
        <div class="readiness-meter" aria-label="${readiness.percent}% complete"><span style="width:${readiness.percent}%"></span></div>
        <p>${readiness.completed} of ${readiness.total} Ready for Verifier items are complete. This is a project handoff aid, not proof of inspection, compliance, or final verification.</p>
        ${openItemsMarkup(readiness, project.id)}
        ${evidenceMarkup(evidence, project.id)}
        <div class="readiness-actions">
          <span class="readiness-updated">${escapeHtml(updated + evidenceUpdated)}</span>
          <a class="readiness-link" href="${escapeHtml(testingLink(project.id))}">Open Testing & Verification</a>
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
