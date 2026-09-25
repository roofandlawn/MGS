const roles=[
  {id:'new',label:'New to Medical Gas',summary:'Use this view to understand the order of the project and why installer work, inspection, and verification are separate responsibilities.',focus:['install','inspect','verify']},
  {id:'6010',label:'ASSE 6010 Installer',summary:'Installer-focused view: complete the installation and required installer testing, preserve access for inspection, and hand clear records to the inspection/verification team.',focus:['install','handoff']},
  {id:'6020',label:'ASSE 6020 Inspector',summary:'Inspection-focused view: system inspection occurs before concealed piping is hidden. NFPA 99-2024 §5.1.12.3 identifies ASSE 6020 or ASSE 6030 qualification for this inspection role.',focus:['inspect']},
  {id:'6030',label:'ASSE 6030 Verifier',summary:'Verification-focused view: final verification follows completion of the required installer tests and is performed by a qualified verifier independent of the installing contractor, subject to the code provisions.',focus:['verify']},
  {id:'6035',label:'ASSE 6035 Bulk Verifier',summary:'Bulk/cryogenic source verification has a separate qualification path. NFPA 99-2024 §5.1.12.4.1.4 points cryogenic fluid central supply verification to ASSE 6035 and CGA M-1 requirements.',focus:['bulk']}
];

const stages=[
  {id:'install',step:'Stage 1',title:'Installation & installer tests',text:'The installing contractor completes the installation and the tests assigned to the installer before system inspection and verification move forward.',ref:'§5.1.12.2'},
  {id:'inspect',step:'Stage 2',title:'System inspection',text:'Inspection occurs before piping is concealed. Initial pressure testing is witnessed and concealed labels / valve tags are checked.',ref:'§5.1.12.3'},
  {id:'handoff',step:'Stage 3',title:'Document handoff',text:'Witnessed installer-test documentation is provided so the verifier can begin the verification sequence with the project record intact.',ref:'§5.1.12.3.2.1'},
  {id:'verify',step:'Stage 4',title:'System verification',text:'Verification begins only after the required installer tests are complete and covers the applicable final system tests.',ref:'§5.1.12.4'}
];

const testDetails={
  standing:{title:'Standing Pressure',text:'Why it matters to the installer: the verifier is confirming the finished distribution system can hold the required test condition. Installer records and completed repairs need to be resolved before this stage.',ref:'NFPA 99-2024 §5.1.12.4.2'},
  cross:{title:'Cross-Connection',text:'Why it matters to the installer: this confirms each terminal is connected to the intended gas or vacuum service. Correct rough-in identification and final connections are critical before verification.',ref:'NFPA 99-2024 §5.1.12.4.3'},
  alarms:{title:'Alarm Verification',text:'Why it matters to the installer: alarm sensors, panels, labels, and system relationships must be complete and ready to demonstrate the correct condition at the correct panel.',ref:'NFPA 99-2024 §5.1.12.4.5'},
  purge:{title:'Piping Purge',text:'Why it matters to the installer: this is a verification checkpoint on the completed piping system. The app intentionally does not teach brazing or pipe-prep technique.',ref:'NFPA 99-2024 §5.1.12.4.6'},
  particulates:{title:'Piping Particulates',text:'Why it matters to the installer: finished piping needs to be delivered in a condition that can pass final cleanliness-related verification. Protecting completed work matters through the entire project.',ref:'NFPA 99-2024 §5.1.12.4.7'}
};

const storageKey='mgs-prototype-v3';
const readinessKeys=['installerTesting','inspectionWitness','concealedInspection','labelsComplete','systemsReady','documentationReady'];
const urlParams=new URLSearchParams(window.location.search);
const requestedProjectId=urlParams.get('project');
const requestedReadinessKey=urlParams.get('item');
let requestedFocusHandled=false;

const roleButtons=document.getElementById('roleButtons');
const roleSummary=document.getElementById('roleSummary');
const workflow=document.getElementById('workflow');
const testDetail=document.getElementById('testDetail');
const projectSelect=document.getElementById('projectSelect');
const projectSaveStatus=document.getElementById('projectSaveStatus');
const readyChecks=document.getElementById('readyChecks');
const readyProgressText=document.getElementById('readyProgressText');
const readyPercent=document.getElementById('readyPercent');
const readyProgressBar=document.getElementById('readyProgressBar');
const resetReadyBtn=document.getElementById('resetReadyBtn');

function loadProjectState(){
  try{
    for(const key of [storageKey,'mgs-prototype-v2','mgs-prototype-v1']){
      const parsed=JSON.parse(localStorage.getItem(key));
      if(parsed&&Array.isArray(parsed.projects)) return parsed;
    }
  }catch(error){
    console.error('Unable to read project storage',error);
  }
  return {projects:[],selectedProjectId:null};
}

let projectState=loadProjectState();
if(requestedProjectId&&projectState.projects.some(project=>project.id===requestedProjectId)){
  projectState.selectedProjectId=requestedProjectId;
}

function selectedProject(){
  return projectState.projects.find(project=>project.id===projectState.selectedProjectId)||null;
}

function emptyReadiness(){
  return {
    items:Object.fromEntries(readinessKeys.map(key=>[key,false])),
    updatedAt:null
  };
}

function normalizeReadiness(project){
  const existing=project?.verifierReadiness;
  return {
    items:Object.fromEntries(readinessKeys.map(key=>[key,Boolean(existing?.items?.[key])])),
    updatedAt:existing?.updatedAt||null
  };
}

function saveProjectState(message='Saved to project'){
  try{
    localStorage.setItem(storageKey,JSON.stringify(projectState));
    projectSaveStatus.textContent=`${message} · ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
    projectSaveStatus.classList.remove('error');
  }catch(error){
    projectSaveStatus.textContent='Could not save on this device.';
    projectSaveStatus.classList.add('error');
    console.error('Unable to save project storage',error);
  }
}

function renderProjectSelect(){
  if(!projectState.projects.length){
    projectSelect.innerHTML='<option value="">No projects yet — create one in Projects</option>';
    projectSelect.disabled=true;
    projectSaveStatus.textContent='Create a project before saving handoff readiness.';
    renderReadiness();
    return;
  }

  projectSelect.disabled=false;
  if(!selectedProject()) projectState.selectedProjectId=projectState.projects[0].id;
  projectSelect.innerHTML=projectState.projects.map(project=>`<option value="${escapeHtml(project.id)}" ${project.id===projectState.selectedProjectId?'selected':''}>${escapeHtml(project.name||'Untitled project')}${project.facility?` — ${escapeHtml(project.facility)}`:''}</option>`).join('');
  const project=selectedProject();
  const readiness=normalizeReadiness(project);
  projectSaveStatus.textContent=readiness.updatedAt?`Last handoff update ${new Date(readiness.updatedAt).toLocaleString()}`:'No handoff progress saved yet.';
  renderReadiness();
}

function renderReadiness(){
  const project=selectedProject();
  const inputs=[...readyChecks.querySelectorAll('[data-ready-key]')];
  resetReadyBtn.disabled=!project;

  if(!project){
    inputs.forEach(input=>{input.checked=false;input.disabled=true;});
    updateReadinessProgress(0,readinessKeys.length);
    return;
  }

  const readiness=normalizeReadiness(project);
  inputs.forEach(input=>{
    input.disabled=false;
    input.checked=Boolean(readiness.items[input.dataset.readyKey]);
  });
  const completed=readinessKeys.filter(key=>readiness.items[key]).length;
  updateReadinessProgress(completed,readinessKeys.length);
  focusRequestedReadiness();
}

function focusRequestedReadiness(){
  if(requestedFocusHandled||!requestedReadinessKey||!readinessKeys.includes(requestedReadinessKey)) return;
  const input=readyChecks.querySelector(`[data-ready-key="${requestedReadinessKey}"]`);
  if(!input||input.disabled) return;
  const label=input.closest('label');
  if(!label) return;
  requestedFocusHandled=true;
  label.classList.add('deep-linked');
  requestAnimationFrame(()=>{
    label.scrollIntoView({behavior:'smooth',block:'center'});
    input.focus({preventScroll:true});
  });
}

function updateReadinessProgress(completed,total){
  const percent=total?Math.round((completed/total)*100):0;
  readyProgressText.textContent=`${completed} of ${total} complete`;
  readyPercent.textContent=`${percent}%`;
  readyProgressBar.style.width=`${percent}%`;
}

function updateReadinessItem(key,checked){
  const project=selectedProject();
  if(!project||!readinessKeys.includes(key)) return;
  const readiness=normalizeReadiness(project);
  readiness.items[key]=Boolean(checked);
  readiness.updatedAt=new Date().toISOString();
  project.verifierReadiness=readiness;
  saveProjectState('Handoff checklist saved');
  renderReadiness();
}

function escapeHtml(value){
  return String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function renderRole(roleId){
  const role=roles.find(r=>r.id===roleId)||roles[0];
  document.querySelectorAll('.role-button').forEach(button=>button.classList.toggle('active',button.dataset.role===role.id));
  roleSummary.innerHTML=`<strong>${role.label}</strong><p>${role.summary}</p>`;
  workflow.innerHTML=stages.map(stage=>`<article class="workflow-card ${role.focus.includes(stage.id)?'active':''}"><span class="step">${stage.step}</span><h4>${stage.title}</h4><p>${stage.text}</p><span class="ref">${stage.ref}</span></article>`).join('');
}

roles.forEach((role,index)=>{
  const button=document.createElement('button');
  button.type='button';
  button.className='role-button';
  button.dataset.role=role.id;
  button.textContent=role.label;
  button.addEventListener('click',()=>renderRole(role.id));
  roleButtons.appendChild(button);
  if(index===0)button.classList.add('active');
});

document.querySelectorAll('.test-card').forEach(button=>{
  button.addEventListener('click',()=>{
    document.querySelectorAll('.test-card').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
    const detail=testDetails[button.dataset.test];
    testDetail.innerHTML=`<strong>${detail.title}</strong><p>${detail.text}</p><small>${detail.ref}</small>`;
  });
});

projectSelect.addEventListener('change',()=>{
  projectState.selectedProjectId=projectSelect.value||null;
  requestedFocusHandled=true;
  readyChecks.querySelectorAll('.deep-linked').forEach(label=>label.classList.remove('deep-linked'));
  saveProjectState('Selected project saved');
  renderProjectSelect();
});

readyChecks.addEventListener('change',event=>{
  const input=event.target.closest('[data-ready-key]');
  if(!input) return;
  input.closest('label')?.classList.remove('deep-linked');
  updateReadinessItem(input.dataset.readyKey,input.checked);
});

resetReadyBtn.addEventListener('click',()=>{
  const project=selectedProject();
  if(!project) return;
  if(!confirm(`Reset the Ready for Verifier checklist for ${project.name||'this project'}?`)) return;
  project.verifierReadiness=emptyReadiness();
  project.verifierReadiness.updatedAt=new Date().toISOString();
  saveProjectState('Handoff checklist reset');
  renderProjectSelect();
});

renderRole('new');
renderProjectSelect();
