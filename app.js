const storageKey = 'mgs-prototype-v3';

const seedTasks = () => [
  { id: crypto.randomUUID(), text: 'Confirm project scope and applicable requirements', done: false },
  { id: crypto.randomUUID(), text: 'Record alarm panel and device locations', done: false },
  { id: crypto.randomUUID(), text: 'Record outlet / terminal locations and services', done: false },
  { id: crypto.randomUUID(), text: 'Collect verification, inspection, and closeout records', done: false }
];

function normalizeProject(project) {
  return {
    ...project,
    tasks: Array.isArray(project.tasks) ? project.tasks : seedTasks(),
    alarms: Array.isArray(project.alarms) ? project.alarms : [],
    outlets: Array.isArray(project.outlets) ? project.outlets : [],
    tests: Array.isArray(project.tests) ? project.tests : [],
    photos: Array.isArray(project.photos) ? project.photos : [],
    fieldNotes: project.fieldNotes || ''
  };
}

function loadState() {
  try {
    for (const key of [storageKey, 'mgs-prototype-v2', 'mgs-prototype-v1']) {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && Array.isArray(saved.projects)) {
        saved.projects = saved.projects.map((p, index) => normalizeProject({
          ...p,
          tasks: Array.isArray(p.tasks) ? p.tasks : (key === 'mgs-prototype-v1' && index === 0 ? saved.tasks : undefined)
        }));
        return saved;
      }
    }
  } catch {}
  return { projects: [], selectedProjectId: null };
}

let state = loadState();
let pendingPhotoData = null;
const $ = selector => document.querySelector(selector);
const projectList = $('#projectList');
const selectedTitle = $('#selectedTitle');
const projectDetail = $('#projectDetail');
const checklist = $('#checklist');
const alarmList = $('#alarmList');
const outletList = $('#outletList');
const testList = $('#testList');
const photoList = $('#photoList');
const fieldNotes = $('#fieldNotes');

const projectDialog = $('#projectDialog');
const taskDialog = $('#taskDialog');
const alarmDialog = $('#alarmDialog');
const outletDialog = $('#outletDialog');
const testDialog = $('#testDialog');
const photoDialog = $('#photoDialog');

function selectedProject() {
  return state.projects.find(p => p.id === state.selectedProjectId) || null;
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    alert('This device has reached its browser storage limit. Delete one or more project photos, or use smaller images.');
    console.error(error);
  }
  render();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function statusClass(status) {
  if (status === 'Pass') return 'pass';
  if (status === 'Needs attention') return 'attention';
  return 'unchecked';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function renderProjects() {
  if (!state.projects.length) {
    projectList.innerHTML = '<div class="empty">No projects yet. Create the first Med Gas project.</div>';
    selectedTitle.textContent = 'No project selected';
    projectDetail.innerHTML = '<div class="detail-empty">Create or select a project to begin.</div>';
    return;
  }

  if (!selectedProject()) state.selectedProjectId = state.projects[0].id;
  projectList.innerHTML = state.projects.map(p => `
    <button class="project-row ${p.id === state.selectedProjectId ? 'active' : ''}" data-project-id="${p.id}">
      <strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.facility || p.location || 'No facility entered')}</span>
    </button>`).join('');

  const p = selectedProject();
  selectedTitle.textContent = p.name;
  projectDetail.innerHTML = `
    <div class="detail-grid">
      <div><span>Facility</span><strong>${escapeHtml(p.facility || '—')}</strong></div>
      <div><span>Location</span><strong>${escapeHtml(p.location || '—')}</strong></div>
      <div><span>Alarm records</span><strong>${p.alarms.length}</strong></div>
      <div><span>Outlet records</span><strong>${p.outlets.length}</strong></div>
      <div><span>Test records</span><strong>${p.tests.length}</strong></div>
      <div><span>Photos</span><strong>${p.photos.length}</strong></div>
    </div>
    <div class="detail-notes">${escapeHtml(p.notes || 'No project notes yet.')}</div>`;
}

function renderChecklist() {
  const p = selectedProject();
  if (!p) return checklist.innerHTML = '<div class="empty">Select a project first.</div>';
  if (!p.tasks.length) return checklist.innerHTML = '<div class="empty">No checklist items.</div>';
  checklist.innerHTML = p.tasks.map(t => `
    <label class="task ${t.done ? 'done' : ''}">
      <input type="checkbox" data-task-toggle="${t.id}" ${t.done ? 'checked' : ''}>
      <span>${escapeHtml(t.text)}</span>
      <button type="button" data-task-delete="${t.id}">Delete</button>
    </label>`).join('');
}

function renderAlarms() {
  const p = selectedProject();
  if (!p) return alarmList.innerHTML = '<div class="empty">Select a project first.</div>';
  if (!p.alarms.length) return alarmList.innerHTML = '<div class="empty">No alarm records yet.</div>';
  alarmList.innerHTML = p.alarms.map(a => `
    <article class="record-card">
      <div class="record-main"><strong>${escapeHtml(a.type)}</strong><span>${escapeHtml(a.location)}</span><small>${escapeHtml(a.serves || 'No service description')}</small></div>
      <span class="status ${statusClass(a.status)}">${escapeHtml(a.status)}</span>
      <button class="delete-link" data-alarm-delete="${a.id}">Delete</button>
      ${a.notes ? `<p>${escapeHtml(a.notes)}</p>` : ''}
    </article>`).join('');
}

function renderOutlets() {
  const p = selectedProject();
  if (!p) return outletList.innerHTML = '<div class="empty">Select a project first.</div>';
  if (!p.outlets.length) return outletList.innerHTML = '<div class="empty">No outlet records yet.</div>';
  outletList.innerHTML = p.outlets.map(o => `
    <article class="record-card">
      <div class="record-main"><strong>${escapeHtml(o.gas)}</strong><span>${escapeHtml(o.location)}</span><small>${escapeHtml(o.identifier || 'No identifier entered')}</small></div>
      <span class="status ${statusClass(o.status)}">${escapeHtml(o.status)}</span>
      <button class="delete-link" data-outlet-delete="${o.id}">Delete</button>
      ${o.notes ? `<p>${escapeHtml(o.notes)}</p>` : ''}
    </article>`).join('');
}

function renderTests() {
  const p = selectedProject();
  if (!p) return testList.innerHTML = '<div class="empty">Select a project first.</div>';
  if (!p.tests.length) return testList.innerHTML = '<div class="empty">No inspection or test records yet.</div>';
  testList.innerHTML = p.tests.map(t => `
    <article class="record-card">
      <div class="record-main">
        <strong>${escapeHtml(t.type)}</strong>
        <span>${escapeHtml(t.system || 'System not entered')} · ${escapeHtml(t.location || 'Location not entered')}</span>
        <small>${escapeHtml(formatDate(t.date))}${t.person ? ` · ${escapeHtml(t.person)}` : ''}${t.reading ? ` · ${escapeHtml(t.reading)}` : ''}</small>
      </div>
      <span class="status ${statusClass(t.status)}">${escapeHtml(t.status)}</span>
      <button class="delete-link" data-test-delete="${t.id}">Delete</button>
      ${t.notes ? `<p>${escapeHtml(t.notes)}</p>` : ''}
    </article>`).join('');
}

function renderPhotos() {
  const p = selectedProject();
  if (!p) return photoList.innerHTML = '<div class="empty">Select a project first.</div>';
  if (!p.photos.length) return photoList.innerHTML = '<div class="empty">No project photos yet.</div>';
  photoList.innerHTML = p.photos.map(photo => `
    <figure class="photo-card">
      <img src="${photo.dataUrl}" alt="${escapeHtml(photo.caption || 'Project photo')}">
      <figcaption><strong>${escapeHtml(photo.caption || 'Project photo')}</strong><span>${escapeHtml(photo.location || '')}</span>${photo.notes ? `<small>${escapeHtml(photo.notes)}</small>` : ''}</figcaption>
      <button type="button" class="delete-link" data-photo-delete="${photo.id}">Delete</button>
    </figure>`).join('');
}

function renderNotes() {
  fieldNotes.value = selectedProject()?.fieldNotes || '';
  fieldNotes.disabled = !selectedProject();
  $('#saveNotesBtn').disabled = !selectedProject();
}

function renderStats() {
  const allTasks = state.projects.flatMap(p => p.tasks);
  $('#projectCount').textContent = state.projects.length;
  $('#openCount').textContent = allTasks.filter(t => !t.done).length;
  $('#deviceCount').textContent = state.projects.reduce((n,p) => n + p.alarms.length + p.outlets.length + p.tests.length + p.photos.length, 0);
}

function reportRows(items, cells) {
  if (!items.length) return '<p class="report-empty">No records.</p>';
  return `<table><tbody>${items.map(item => `<tr>${cells(item).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderReport() {
  const p = selectedProject();
  const report = $('#report');
  if (!p) return report.innerHTML = '<h1>Med Gas Project Report</h1><p>No project selected.</p>';
  const done = p.tasks.filter(t => t.done).length;
  report.innerHTML = `
    <div class="report-head"><div><p class="eyebrow">MGS</p><h1>Med Gas Project Report</h1></div><div class="report-date">Generated ${escapeHtml(new Date().toLocaleString())}</div></div>
    <section class="report-summary"><h2>${escapeHtml(p.name)}</h2><p><strong>Facility:</strong> ${escapeHtml(p.facility || '—')}<br><strong>Location:</strong> ${escapeHtml(p.location || '—')}<br><strong>Created:</strong> ${escapeHtml(p.createdAt || '—')}</p>${p.notes ? `<p>${escapeHtml(p.notes)}</p>` : ''}</section>
    <section><h3>Checklist (${done}/${p.tasks.length} complete)</h3>${reportRows(p.tasks, t => [`${t.done ? '✓' : '○'} ${escapeHtml(t.text)}`])}</section>
    <section><h3>Alarm records</h3>${reportRows(p.alarms, a => [`<strong>${escapeHtml(a.type)}</strong><br>${escapeHtml(a.location)}<br><small>${escapeHtml(a.serves || '')}</small>`, `<strong>${escapeHtml(a.status)}</strong>${a.notes ? `<br>${escapeHtml(a.notes)}` : ''}`])}</section>
    <section><h3>Outlet / terminal records</h3>${reportRows(p.outlets, o => [`<strong>${escapeHtml(o.gas)}</strong><br>${escapeHtml(o.location)}<br><small>${escapeHtml(o.identifier || '')}</small>`, `<strong>${escapeHtml(o.status)}</strong>${o.notes ? `<br>${escapeHtml(o.notes)}` : ''}`])}</section>
    <section><h3>Inspection & test records</h3>${reportRows(p.tests, t => [`<strong>${escapeHtml(t.type)}</strong><br>${escapeHtml(t.system || '')}<br>${escapeHtml(t.location || '')}`, `<strong>${escapeHtml(t.status)}</strong><br>${escapeHtml(formatDate(t.date))}${t.person ? `<br>${escapeHtml(t.person)}` : ''}${t.reading ? `<br>${escapeHtml(t.reading)}` : ''}${t.notes ? `<br>${escapeHtml(t.notes)}` : ''}`])}</section>
    <section><h3>Field notes</h3><div class="report-notes">${escapeHtml(p.fieldNotes || 'No field notes.')}</div></section>
    <section><h3>Project photos</h3>${p.photos.length ? `<div class="report-photos">${p.photos.map(photo => `<figure><img src="${photo.dataUrl}" alt="${escapeHtml(photo.caption || 'Project photo')}"><figcaption><strong>${escapeHtml(photo.caption || 'Project photo')}</strong>${photo.location ? `<br>${escapeHtml(photo.location)}` : ''}${photo.notes ? `<br>${escapeHtml(photo.notes)}` : ''}</figcaption></figure>`).join('')}</div>` : '<p class="report-empty">No photos.</p>'}</section>
    <p class="report-disclaimer">Field organization record only. This report does not replace required code compliance, inspection, certification, verification, manufacturer instructions, or qualified professional judgment.</p>`;
}

function render() {
  renderProjects(); renderChecklist(); renderAlarms(); renderOutlets(); renderTests(); renderPhotos(); renderNotes(); renderStats(); renderReport();
}

$('#newProjectBtn').onclick = () => projectDialog.showModal();
$('#addTaskBtn').onclick = () => selectedProject() ? taskDialog.showModal() : alert('Create or select a project first.');
$('#addAlarmBtn').onclick = () => selectedProject() ? alarmDialog.showModal() : alert('Create or select a project first.');
$('#addOutletBtn').onclick = () => selectedProject() ? outletDialog.showModal() : alert('Create or select a project first.');
$('#addTestBtn').onclick = () => selectedProject() ? testDialog.showModal() : alert('Create or select a project first.');
$('#printReportBtn').onclick = () => {
  if (!selectedProject()) return alert('Create or select a project first.');
  renderReport(); window.print();
};

document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());

document.querySelectorAll('.tab').forEach(tab => tab.onclick = () => {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab.dataset.tab}`));
});

$('#projectForm').addEventListener('submit', e => {
  e.preventDefault(); const f = new FormData(e.currentTarget);
  const p = normalizeProject({
    id: crypto.randomUUID(), name: f.get('name').trim(), facility: f.get('facility').trim(),
    location: f.get('location').trim(), notes: f.get('notes').trim(), createdAt: new Date().toLocaleDateString()
  });
  if (!p.name) return;
  state.projects.unshift(p); state.selectedProjectId = p.id;
  e.currentTarget.reset(); projectDialog.close(); save();
});

$('#taskForm').addEventListener('submit', e => {
  e.preventDefault(); const p = selectedProject(); if (!p) return;
  const text = new FormData(e.currentTarget).get('task').trim(); if (!text) return;
  p.tasks.push({ id: crypto.randomUUID(), text, done: false });
  e.currentTarget.reset(); taskDialog.close(); save();
});

$('#alarmForm').addEventListener('submit', e => {
  e.preventDefault(); const p = selectedProject(); if (!p) return;
  const f = new FormData(e.currentTarget);
  p.alarms.unshift({ id: crypto.randomUUID(), type:f.get('type'), location:f.get('location').trim(), serves:f.get('serves').trim(), status:f.get('status'), notes:f.get('notes').trim() });
  e.currentTarget.reset(); alarmDialog.close(); save();
});

$('#outletForm').addEventListener('submit', e => {
  e.preventDefault(); const p = selectedProject(); if (!p) return;
  const f = new FormData(e.currentTarget);
  p.outlets.unshift({ id: crypto.randomUUID(), gas:f.get('gas'), location:f.get('location').trim(), identifier:f.get('identifier').trim(), status:f.get('status'), notes:f.get('notes').trim() });
  e.currentTarget.reset(); outletDialog.close(); save();
});

$('#testForm').addEventListener('submit', e => {
  e.preventDefault(); const p = selectedProject(); if (!p) return;
  const f = new FormData(e.currentTarget);
  p.tests.unshift({
    id: crypto.randomUUID(), type:f.get('type').trim(), system:f.get('system').trim(), location:f.get('location').trim(),
    date:f.get('date'), status:f.get('status'), person:f.get('person').trim(), reading:f.get('reading').trim(), notes:f.get('notes').trim()
  });
  e.currentTarget.reset(); testDialog.close(); save();
});

$('#photoInput').addEventListener('change', e => {
  const p = selectedProject();
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!p || !file) return;
  if (file.size > 1500000) return alert('Please choose a photo under 1.5 MB. Smaller photos are more reliable in browser storage.');
  const reader = new FileReader();
  reader.onload = () => {
    pendingPhotoData = reader.result;
    $('#photoPreview').src = pendingPhotoData;
    photoDialog.showModal();
  };
  reader.readAsDataURL(file);
});

$('#photoForm').addEventListener('submit', e => {
  e.preventDefault(); const p = selectedProject(); if (!p || !pendingPhotoData) return;
  const f = new FormData(e.currentTarget);
  p.photos.unshift({ id: crypto.randomUUID(), dataUrl: pendingPhotoData, caption:f.get('caption').trim(), location:f.get('location').trim(), notes:f.get('notes').trim(), addedAt:new Date().toLocaleString() });
  pendingPhotoData = null; e.currentTarget.reset(); $('#photoPreview').removeAttribute('src'); photoDialog.close(); save();
});

projectList.addEventListener('click', e => {
  const b = e.target.closest('[data-project-id]'); if (!b) return;
  state.selectedProjectId = b.dataset.projectId; save();
});

checklist.addEventListener('change', e => {
  const input = e.target.closest('[data-task-toggle]'); if (!input) return;
  const task = selectedProject()?.tasks.find(t => t.id === input.dataset.taskToggle);
  if (task) { task.done = input.checked; save(); }
});

checklist.addEventListener('click', e => {
  const b = e.target.closest('[data-task-delete]'); if (!b) return;
  const p = selectedProject(); p.tasks = p.tasks.filter(t => t.id !== b.dataset.taskDelete); save();
});

alarmList.addEventListener('click', e => {
  const b = e.target.closest('[data-alarm-delete]'); if (!b) return;
  const p = selectedProject(); p.alarms = p.alarms.filter(a => a.id !== b.dataset.alarmDelete); save();
});

outletList.addEventListener('click', e => {
  const b = e.target.closest('[data-outlet-delete]'); if (!b) return;
  const p = selectedProject(); p.outlets = p.outlets.filter(o => o.id !== b.dataset.outletDelete); save();
});

testList.addEventListener('click', e => {
  const b = e.target.closest('[data-test-delete]'); if (!b) return;
  const p = selectedProject(); p.tests = p.tests.filter(t => t.id !== b.dataset.testDelete); save();
});

photoList.addEventListener('click', e => {
  const b = e.target.closest('[data-photo-delete]'); if (!b) return;
  const p = selectedProject(); p.photos = p.photos.filter(photo => photo.id !== b.dataset.photoDelete); save();
});

$('#saveNotesBtn').onclick = () => {
  const p = selectedProject(); if (!p) return;
  p.fieldNotes = fieldNotes.value; save();
};

render();