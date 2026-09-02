(()=>{
  const STORAGE_KEYS=['mgs-prototype-v3','mgs-prototype-v2','mgs-prototype-v1'];
  const ITEMS=[
    {key:'installerTesting',label:'Installer testing complete',hint:'Installing-contractor testing and related records are ready for the project handoff.'},
    {key:'inspectionWitness',label:'Required inspection / witnessing complete',hint:'Required inspection or witnessing has been addressed and recorded for the project.'},
    {key:'concealedInspection',label:'Concealed work inspected before cover',hint:'Required concealed-work inspection has been addressed before the piping is hidden.'},
    {key:'labelsComplete',label:'Labels and valve tags complete',hint:'Required identification and tagging work is ready for project review.'},
    {key:'systemsReady',label:'Source, alarms, outlets / inlets ready',hint:'Relevant system components are marked ready for the verifier handoff.'},
    {key:'documentationReady',label:'Documentation ready for verifier',hint:'Project handoff documents and references are assembled for review.'}
  ];

  const projectSelect=document.getElementById('handoffProjectSelect');
  const summary=document.getElementById('handoffSummary');
  const empty=document.getElementById('handoffEmpty');
  const testingLink=document.getElementById('testingLink');

  function loadState(){
    try{
      for(const key of STORAGE_KEYS){
        const parsed=JSON.parse(localStorage.getItem(key));
        if(parsed&&Array.isArray(parsed.projects)) return {state:parsed,storageKey:key};
      }
    }catch(error){console.error('Unable to read MGS project data',error);}
    return {state:{projects:[],selectedProjectId:null},storageKey:STORAGE_KEYS[0]};
  }

  let {state,storageKey}=loadState();

  function escapeHtml(value){
    return String(value??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function selectedIdFromUrl(){
    return new URLSearchParams(window.location.search).get('project');
  }

  function selectedProject(){
    const requested=selectedIdFromUrl();
    const id=requested||state.selectedProjectId||state.projects[0]?.id||null;
    return state.projects.find(project=>project.id===id)||state.projects[0]||null;
  }

  function evidence(project,key){
    const record=project?.verifierEvidence?.[key]||{};
    return {
      note:record.note||'',
      completionDate:record.completionDate||'',
      attachmentRef:record.attachmentRef||'',
      updatedAt:record.updatedAt||null
    };
  }

  function hasEvidence(record){
    return Boolean(record.note||record.completionDate||record.attachmentRef);
  }

  function formatDate(value){
    if(!value) return '—';
    const date=new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())?value:date.toLocaleDateString();
  }

  function formatDateTime(value){
    if(!value) return '—';
    const date=new Date(value);
    return Number.isNaN(date.getTime())?value:date.toLocaleString();
  }

  function readiness(project){
    const items=project?.verifierReadiness?.items||{};
    const completed=ITEMS.filter(item=>Boolean(items[item.key])).length;
    const total=ITEMS.length;
    const percent=Math.round((completed/total)*100);
    const status=completed===0?'not-started':completed===total?'ready':'in-progress';
    const label=status==='ready'?'Ready for Verifier':status==='in-progress'?'In Progress':'Not Started';
    const completedWithEvidence=ITEMS.filter(item=>Boolean(items[item.key])&&hasEvidence(evidence(project,item.key))).length;
    const evidencePercent=completed?Math.round((completedWithEvidence/completed)*100):0;
    return {completed,total,percent,status,label,completedWithEvidence,evidencePercent};
  }

  function persistSelection(projectId){
    state.selectedProjectId=projectId;
    try{localStorage.setItem(storageKey,JSON.stringify(state));}catch(error){console.error('Unable to save selected project',error);}
    const url=new URL(window.location.href);
    url.searchParams.set('project',projectId);
    history.replaceState({},'',url);
  }

  function populateProjects(){
    if(!state.projects.length){
      projectSelect.innerHTML='<option value="">No projects</option>';
      projectSelect.disabled=true;
      return;
    }
    projectSelect.disabled=false;
    projectSelect.innerHTML=state.projects.map(project=>`<option value="${escapeHtml(project.id)}">${escapeHtml(project.name||'Untitled project')}</option>`).join('');
    const project=selectedProject();
    if(project) projectSelect.value=project.id;
  }

  function itemMarkup(project,item){
    const done=Boolean(project?.verifierReadiness?.items?.[item.key]);
    const record=evidence(project,item.key);
    const evidencePresent=hasEvidence(record);
    const statusText=done?'Complete':'Open';
    const evidenceText=evidencePresent?'Evidence saved':'No saved evidence';
    return `
      <article class="handoff-item ${done?'complete':''}">
        <div class="handoff-item-head">
          <div class="handoff-item-title">
            <span class="mark" aria-hidden="true">${done?'✓':'○'}</span>
            <div><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.hint)}</p></div>
          </div>
          <span class="item-state">${statusText}</span>
        </div>
        <div class="handoff-item-body">
          <div class="evidence-field"><span>Completion date</span><strong class="${record.completionDate?'':'no-evidence'}">${escapeHtml(formatDate(record.completionDate))}</strong></div>
          <div class="evidence-field"><span>Photo / document reference</span><strong class="${record.attachmentRef?'':'no-evidence'}">${escapeHtml(record.attachmentRef||'None saved')}</strong></div>
          <div class="evidence-field full"><span>Field note</span><p class="${record.note?'':'no-evidence'}">${escapeHtml(record.note||'No field note saved.')}</p></div>
          <div class="evidence-field full"><span>Evidence status</span><strong class="${evidencePresent?'':'no-evidence'}">${evidenceText}${record.updatedAt?` · Last updated ${escapeHtml(formatDateTime(record.updatedAt))}`:''}</strong></div>
        </div>
      </article>`;
  }

  function render(){
    populateProjects();
    const project=selectedProject();
    if(!project){
      summary.hidden=true;
      empty.hidden=false;
      testingLink.href='testing.html';
      return;
    }

    empty.hidden=true;
    summary.hidden=false;
    projectSelect.value=project.id;
    testingLink.href=`testing.html?project=${encodeURIComponent(project.id)}#readyForVerifier`;

    const r=readiness(project);
    document.getElementById('projectName').textContent=project.name||'Untitled project';
    const meta=[project.facility,project.location,project.createdAt?`Created ${project.createdAt}`:''].filter(Boolean).join(' · ');
    document.getElementById('projectMeta').textContent=meta||'No facility or location entered.';
    document.getElementById('projectNotes').textContent=project.notes||project.fieldNotes||'No project notes saved.';

    const badge=document.getElementById('readinessBadge');
    badge.textContent=r.label;
    badge.className=`handoff-status ${r.status}`;
    document.getElementById('readinessCount').textContent=`${r.completed} of ${r.total} complete`;
    document.getElementById('readinessPercent').textContent=`${r.percent}%`;
    document.getElementById('readinessBar').style.width=`${r.percent}%`;
    document.getElementById('evidenceCount').textContent=`${r.completedWithEvidence} of ${r.completed} completed items`;
    document.getElementById('evidenceBar').style.width=`${r.evidencePercent}%`;
    document.getElementById('generatedAt').textContent=`Generated ${new Date().toLocaleString()}`;
    document.getElementById('handoffItems').innerHTML=ITEMS.map(item=>itemMarkup(project,item)).join('');
  }

  projectSelect.addEventListener('change',()=>{
    const id=projectSelect.value;
    if(!id) return;
    persistSelection(id);
    render();
  });

  document.getElementById('printSummaryBtn').addEventListener('click',()=>{
    if(!selectedProject()) return;
    render();
    window.print();
  });

  window.addEventListener('storage',()=>{
    const loaded=loadState();
    state=loaded.state;
    storageKey=loaded.storageKey;
    render();
  });

  render();
})();
