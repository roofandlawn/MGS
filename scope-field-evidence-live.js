(() => {
  const container = document.getElementById('scopeFieldChecklist');
  const summary = document.getElementById('scopeFieldChecklistSummary');
  if (!container) return;

  const SYSTEM_TERMS = {
    oxygen: ['oxygen', 'o2'],
    medicalAir: ['medical air', 'med air'],
    medicalVacuum: ['medical surgical vacuum', 'medical vacuum', 'vacuum'],
    wagd: ['wagd', 'waste anesthetic gas disposal'],
    nitrousOxide: ['nitrous oxide', 'n2o'],
    nitrogen: ['nitrogen', 'n2'],
    instrumentAir: ['instrument air'],
    carbonDioxide: ['carbon dioxide', 'co2']
  };

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function containsTerm(value, term) {
    const text = normalize(value);
    const expected = normalize(term);
    if (!text || !expected) return false;
    if (expected.length <= 3 && !expected.includes(' ')) return text.split(' ').includes(expected);
    return text.includes(expected);
  }

  function itemContext(project, itemId) {
    if (itemId === 'project:scope-review') return { kind: 'project', suffix: 'scope-review', label: 'Project scope' };
    if (itemId === 'project:handoff-review') return { kind: 'project', suffix: 'handoff-review', label: 'Project closeout' };

    const parts = String(itemId || '').split(':');
    if (parts[0] === 'specialty') {
      return {
        kind: 'specialty',
        suffix: parts[parts.length - 1] || '',
        label: String(project?.systemScopeOther || '').trim()
      };
    }

    const systemId = parts[0] || '';
    const system = typeof systemForId === 'function' ? systemForId(systemId) : null;
    return {
      kind: 'system',
      systemId,
      suffix: parts[1] || '',
      label: system?.label || systemId
    };
  }

  function systemTerms(context) {
    if (context.kind === 'specialty') return context.label ? [context.label] : [];
    if (context.kind !== 'system') return [];
    return SYSTEM_TERMS[context.systemId] || [context.label];
  }

  function textMatchesContext(value, context) {
    if (context.kind === 'project') return true;
    return systemTerms(context).some(term => containsTerm(value, term));
  }

  function structuredTagMatch(record, context) {
    const systemIds = Array.isArray(record?.systemIds) ? record.systemIds.map(String).filter(Boolean) : [];
    const systemOther = String(record?.systemOther || '').trim();
    const hasStructuredTags = systemIds.length > 0 || Boolean(systemOther);
    if (!hasStructuredTags) return { hasStructuredTags: false, matches: false };
    if (context.kind === 'project') return { hasStructuredTags: true, matches: true };
    if (context.kind === 'system') return { hasStructuredTags: true, matches: systemIds.includes(context.systemId) };
    if (context.kind === 'specialty') return { hasStructuredTags: true, matches: normalize(systemOther) === normalize(context.label) };
    return { hasStructuredTags: true, matches: false };
  }

  function recordMatchesContext(record, legacyText, context) {
    const tagMatch = structuredTagMatch(record, context);
    if (tagMatch.hasStructuredTags) return tagMatch.matches;
    return textMatchesContext(legacyText, context);
  }

  function candidate(label, detail) {
    return { label, detail: String(detail || '').trim() };
  }

  function drawingEvidence(project) {
    const metadata = project?.handoffMetadata || {};
    const matches = [];
    if (String(metadata.documentSet || '').trim()) matches.push(candidate('Drawing / closeout document set', metadata.documentSet));
    return matches;
  }

  function closeoutEvidence(project) {
    const metadata = project?.handoffMetadata || {};
    const matches = drawingEvidence(project);
    if (String(metadata.reportId || '').trim()) matches.push(candidate('Verification / inspection report', metadata.reportId));
    const attachment = project?.verifierEvidence?.documentationReady?.attachmentRef;
    if (String(attachment || '').trim()) matches.push(candidate('Verifier handoff attachment reference', attachment));
    return matches;
  }

  function photoEvidence(project, context) {
    return (project?.photos || [])
      .filter(photo => recordMatchesContext(photo, [photo.caption, photo.location, photo.notes].filter(Boolean).join(' '), context))
      .map(photo => candidate('Project photo', photo.caption || photo.location || 'Saved photo'));
  }

  function testEvidence(project, context) {
    return (project?.tests || [])
      .filter(record => textMatchesContext(record.system, context))
      .map(record => candidate('Test record', [record.type, record.system, record.location, record.date].filter(Boolean).join(' · ')));
  }

  function outletEvidence(project, context) {
    return (project?.outlets || [])
      .filter(record => textMatchesContext(record.gas, context))
      .map(record => candidate('Outlet / terminal record', [record.gas, record.location, record.identifier].filter(Boolean).join(' · ')));
  }

  function alarmEvidence(project, context) {
    return (project?.alarms || [])
      .filter(record => recordMatchesContext(record, [record.serves, record.notes].filter(Boolean).join(' '), context))
      .map(record => candidate('Alarm record', [record.type, record.location, record.serves].filter(Boolean).join(' · ')));
  }

  function valveEvidence(project, context) {
    return (project?.valves || [])
      .filter(record => recordMatchesContext(record, [record.type, record.location, record.identifier, record.serves, record.notes].filter(Boolean).join(' '), context))
      .map(record => candidate('Valve / control record', [record.type, record.location, record.identifier, record.serves].filter(Boolean).join(' · ')));
  }

  function noteEvidence(project, context) {
    const notes = String(project?.fieldNotes || '').trim();
    if (!notes || !textMatchesContext(notes, context)) return [];

    const needsControlTerm = ['valves', 'controls'].includes(context.suffix);
    if (needsControlTerm && !/\b(valve|valves|zvb|zone valve|isolation|shutoff|shut off|control|controls)\b/i.test(notes)) return [];
    return [candidate('Field notes', notes.length > 90 ? `${notes.slice(0, 87)}...` : notes)];
  }

  function fieldRecordEvidence(project, context) {
    if (context.suffix === 'alarms') return alarmEvidence(project, context);
    if (context.suffix === 'terminals') return outletEvidence(project, context);
    if (['valves', 'controls'].includes(context.suffix)) {
      const structured = valveEvidence(project, context);
      return structured.length ? structured : noteEvidence(project, context);
    }
    return noteEvidence(project, context);
  }

  function evidenceFor(project, itemId, evidenceType) {
    const context = itemContext(project, itemId);
    if (evidenceType === 'Drawing') return drawingEvidence(project);
    if (evidenceType === 'Closeout document') return closeoutEvidence(project);
    if (evidenceType === 'Photo') return photoEvidence(project, context);
    if (evidenceType === 'Test record') return testEvidence(project, context);
    if (evidenceType === 'Field record') return fieldRecordEvidence(project, context);
    return [];
  }

  function evidenceTypeFor(article) {
    const chips = [...article.querySelectorAll('.scope-field-meta-chip')];
    const evidenceChip = chips.find(chip => normalize(chip.querySelector('b')?.textContent) === 'evidence');
    if (!evidenceChip) return '';
    const clone = evidenceChip.cloneNode(true);
    clone.querySelector('b')?.remove();
    return clone.textContent.trim();
  }

  function evidenceTitle(matches) {
    if (!matches.length) return 'No matching project evidence is currently saved. This is a record-presence check only, not a code-compliance determination.';
    const preview = matches.slice(0, 4).map(match => `${match.label}: ${match.detail || 'saved record'}`).join(' | ');
    const more = matches.length > 4 ? ` | +${matches.length - 4} more` : '';
    return `${preview}${more}. Matching evidence does not by itself establish compliance, inspection, or verification.`;
  }

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function setAction(article, project, evidenceType, count, isNa) {
    const button = article.querySelector('.scope-field-item-actions [data-open-field-tab], .scope-field-item-actions [data-evidence-tab], .scope-field-item-actions [data-evidence-handoff]');
    if (!button) return;

    const originalTab = button.dataset.openFieldTab || button.dataset.evidenceTab || '';
    if (originalTab) button.dataset.evidenceTab = originalTab;

    if (isNa) {
      setText(button, 'Open records');
      button.removeAttribute('data-evidence-handoff');
      if (originalTab) button.dataset.openFieldTab = originalTab;
      return;
    }

    const documentTarget = evidenceType === 'Drawing' || evidenceType === 'Closeout document';
    if (documentTarget) {
      button.removeAttribute('data-open-field-tab');
      button.dataset.evidenceHandoff = project.id;
      setText(button, count ? `View document (${count})` : 'Add document ref');
      button.title = 'Open the project Handoff Summary / Closeout Record.';
      return;
    }

    button.removeAttribute('data-evidence-handoff');
    if (originalTab) button.dataset.openFieldTab = originalTab;
    setText(button, count ? `View evidence (${count})` : 'Add evidence');
    button.title = count ? 'Open the matching project record area.' : 'Open the project record area to add supporting evidence.';
  }

  function decorate() {
    const project = typeof selectedProject === 'function' ? selectedProject() : null;
    if (!project) return;

    let applicable = 0;
    let supported = 0;

    container.querySelectorAll('.scope-field-item[data-field-item]').forEach(article => {
      const itemId = article.dataset.fieldItem;
      const evidenceType = evidenceTypeFor(article);
      const isNa = article.classList.contains('status-na');
      const matches = isNa ? [] : evidenceFor(project, itemId, evidenceType);
      const found = matches.length > 0;

      if (!isNa) {
        applicable += 1;
        if (found) supported += 1;
      }

      let badge = article.querySelector('[data-live-evidence-state]');
      if (!badge) {
        badge = document.createElement('span');
        badge.dataset.liveEvidenceState = 'true';
        badge.className = 'scope-field-evidence-state';
        badge.setAttribute('role', 'status');
        article.querySelector('.scope-field-meta')?.append(badge);
      }

      if (!badge) return;
      badge.className = `scope-field-evidence-state ${isNa ? 'na' : found ? 'found' : 'missing'}`;
      const badgeText = isNa ? 'Evidence not tracked · N/A' : found ? `Evidence found · ${matches.length} ${matches.length === 1 ? 'record' : 'records'}` : 'Evidence missing';
      setText(badge, badgeText);
      badge.title = isNa ? 'This checklist prompt is marked N/A.' : evidenceTitle(matches);
      badge.setAttribute('aria-label', badgeText);

      article.classList.toggle('evidence-found', found && !isNa);
      article.classList.toggle('evidence-missing', !found && !isNa);
      setAction(article, project, evidenceType, matches.length, isNa);
    });

    if (summary && applicable) {
      const base = summary.textContent.replace(/\s·\sEvidence\s\d+\/\d+.*$/i, '');
      const next = `${base} · Evidence ${supported}/${applicable}`;
      setText(summary, next);
      summary.title = 'Evidence coverage counts candidate saved records for applicable prompts. It does not automatically mark a prompt complete or compliant.';
    }
  }

  container.addEventListener('click', event => {
    const button = event.target.closest('[data-evidence-handoff]');
    if (!button) return;
    event.preventDefault();
    const projectId = button.dataset.evidenceHandoff;
    window.location.href = `handoff-summary.html?project=${encodeURIComponent(projectId)}`;
  });

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      decorate();
    });
  });
  observer.observe(container, { childList: true, subtree: true });

  decorate();

  if (!document.querySelector('link[href="structured-system-records.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'structured-system-records.css';
    document.head.append(link);
  }
  if (!document.querySelector('script[src="structured-system-records.js"]')) {
    const script = document.createElement('script');
    script.src = 'structured-system-records.js';
    script.async = false;
    document.body.append(script);
  }
})();
