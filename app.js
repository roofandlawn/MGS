const storageKey = 'mgs-prototype-v2';

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
    fieldNotes: project.fieldNotes || ''
  };
}

function loadState() {
  try {
    const savedV2 = JSON.parse(localStorage.getItem(storageKey));
    if (savedV2 && Array.isArray(savedV2.projects)) {
      savedV2.projects = savedV2.projects.map(normalizeProject);
      return savedV2;
    }

    const old = JSON.parse(localStorage.getItem('mgs-prototype-v1'));
    if (old && Array.isArray(old.projects)) {
      old.projects = old.projects.map((p, index) => normalizeProject({ ...p, tasks: index === 0 ? old.tasks : seedTasks() }));
      return old;
    }
  } catch {}
  return { projects: [], selectedProjectId: null };
}

let state = loadState();
const $ = selector => document.querySelector(selector);
const projectList = $('#projectList');
const selectedTitle = $('#selectedTitle');
const projectDetail = $('#projectDetail');
const checklist = $('#checklist');
const alarmList = $('#alarmList');
const outletList = $('#outletList');
const fieldNotes = $('#fieldNotes');

const projectDialog = $('#projectDialog');
const taskDialog = $('#taskDialog');
const alarmDialog = $('#alarmDialog');
const outletDialog = $('#outletDialog');

function selectedProject() {
  return state.projects.find(p => p.id === state.selectedProjectId) || null;
}

function save() {
  localStorage.setItem(storageKey, JSON.stringify(state));
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

function renderNotes() {
  fieldNotes.value = selectedProject()?.fieldNotes || '';
  fieldNotes.disabled = !selectedProject();
  $('#saveNotesBtn').disabled = !selectedProject();
}

function renderStats() {
  const allTasks = state.projects.flatMap(p => p.tasks);
  $('#projectCount').textContent = state.projects.length;
  $('#openCount').textContent = allTasks.filter(t => !t.done).length;
  $('#deviceCount').textContent = state.projects.reduce((n,p) => n + p.alarms.length + p.outlets.length, 0);
}

function render() {
  renderProjects(); renderChecklist(); renderAlarms(); renderOutlets(); renderNotes(); renderStats();
}

$('#newProjectBtn').onclick = () => projectDialog.showModal();
$('#addTaskBtn').onclick = () => selectedProject() ? taskDialog.showModal() : alert('Create or select a project first.');
$('#addAlarmBtn').onclick = () => selectedProject() ? alarmDialog.showModal() : alert('Create or select a project first.');
$('#addOutletBtn').onclick = () => selectedProject() ? outletDialog.showModal() : alert('Create or select a project first.');

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

$('#saveNotesBtn').onclick = () => {
  const p = selectedProject(); if (!p) return;
  p.fieldNotes = fieldNotes.value; save();
};

render();