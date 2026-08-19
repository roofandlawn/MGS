const storageKey = 'mgs-prototype-v1';

const defaultState = {
  projects: [],
  selectedProjectId: null,
  tasks: [
    { id: crypto.randomUUID(), text: 'Confirm project scope and applicable requirements', done: false },
    { id: crypto.randomUUID(), text: 'Record alarm panel and device locations', done: false },
    { id: crypto.randomUUID(), text: 'Record outlet / terminal locations and services', done: false },
    { id: crypto.randomUUID(), text: 'Collect verification, inspection, and closeout records', done: false }
  ]
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return saved && Array.isArray(saved.projects) ? saved : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();

const projectList = document.querySelector('#projectList');
const selectedTitle = document.querySelector('#selectedTitle');
const projectDetail = document.querySelector('#projectDetail');
const checklist = document.querySelector('#checklist');
const projectCount = document.querySelector('#projectCount');
const openCount = document.querySelector('#openCount');
const doneCount = document.querySelector('#doneCount');
const projectDialog = document.querySelector('#projectDialog');
const taskDialog = document.querySelector('#taskDialog');
const projectForm = document.querySelector('#projectForm');
const taskForm = document.querySelector('#taskForm');

function save() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  render();
}

function renderProjects() {
  if (!state.projects.length) {
    projectList.innerHTML = '<div class="empty">No projects yet. Create the first Med Gas project.</div>';
    selectedTitle.textContent = 'No project selected';
    projectDetail.innerHTML = '<div class="detail-empty">Create or select a project to begin.</div>';
    return;
  }

  if (!state.selectedProjectId || !state.projects.some(p => p.id === state.selectedProjectId)) {
    state.selectedProjectId = state.projects[0].id;
  }

  projectList.innerHTML = state.projects.map(project => `
    <button class="project-row ${project.id === state.selectedProjectId ? 'active' : ''}" data-project-id="${project.id}">
      <strong>${escapeHtml(project.name)}</strong>
      <span>${escapeHtml(project.facility || project.location || 'No facility entered')}</span>
    </button>
  `).join('');

  const selected = state.projects.find(p => p.id === state.selectedProjectId);
  selectedTitle.textContent = selected.name;
  projectDetail.innerHTML = `
    <div class="detail-grid">
      <div><span>Facility</span><strong>${escapeHtml(selected.facility || '—')}</strong></div>
      <div><span>Location</span><strong>${escapeHtml(selected.location || '—')}</strong></div>
      <div><span>Status</span><strong>Active</strong></div>
      <div><span>Created</span><strong>${escapeHtml(selected.createdAt)}</strong></div>
    </div>
    <div class="detail-notes">${escapeHtml(selected.notes || 'No notes yet.')}</div>
  `;
}

function renderChecklist() {
  if (!state.tasks.length) {
    checklist.innerHTML = '<div class="empty">No checklist items yet.</div>';
    return;
  }

  checklist.innerHTML = state.tasks.map(task => `
    <label class="task ${task.done ? 'done' : ''}">
      <input type="checkbox" data-task-toggle="${task.id}" ${task.done ? 'checked' : ''} />
      <span>${escapeHtml(task.text)}</span>
      <button type="button" aria-label="Delete item" data-task-delete="${task.id}">Delete</button>
    </label>
  `).join('');
}

function renderStats() {
  projectCount.textContent = state.projects.length;
  openCount.textContent = state.tasks.filter(task => !task.done).length;
  doneCount.textContent = state.tasks.filter(task => task.done).length;
}

function render() {
  renderProjects();
  renderChecklist();
  renderStats();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.querySelector('#newProjectBtn').addEventListener('click', () => projectDialog.showModal());
document.querySelector('#addTaskBtn').addEventListener('click', () => taskDialog.showModal());

document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => button.closest('dialog').close());
});

projectForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(projectForm);
  const project = {
    id: crypto.randomUUID(),
    name: data.get('name').trim(),
    facility: data.get('facility').trim(),
    location: data.get('location').trim(),
    notes: data.get('notes').trim(),
    createdAt: new Date().toLocaleDateString()
  };
  if (!project.name) return;
  state.projects.unshift(project);
  state.selectedProjectId = project.id;
  projectForm.reset();
  projectDialog.close();
  save();
});

taskForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(taskForm);
  const text = data.get('task').trim();
  if (!text) return;
  state.tasks.push({ id: crypto.randomUUID(), text, done: false });
  taskForm.reset();
  taskDialog.close();
  save();
});

projectList.addEventListener('click', event => {
  const button = event.target.closest('[data-project-id]');
  if (!button) return;
  state.selectedProjectId = button.dataset.projectId;
  save();
});

checklist.addEventListener('change', event => {
  const input = event.target.closest('[data-task-toggle]');
  if (!input) return;
  const task = state.tasks.find(item => item.id === input.dataset.taskToggle);
  if (task) task.done = input.checked;
  save();
});

checklist.addEventListener('click', event => {
  const button = event.target.closest('[data-task-delete]');
  if (!button) return;
  state.tasks = state.tasks.filter(item => item.id !== button.dataset.taskDelete);
  save();
});

render();
