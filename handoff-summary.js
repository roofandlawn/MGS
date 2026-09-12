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
  const CLOSEOUT_FIELDS=[
    {key:'projectNumber',displayId:'closeoutProjectNumber',label:'Project / job number',requirement:'required'},
    {key:'installerCompany',displayId:'closeoutInstallerCompany',label:'Installing contractor / company',requirement:'required'},
    {key:'installerContact',displayId:'closeoutInstallerContact',label:'Installer contact',requirement:'optional'},
    {key:'verifierName',displayId:'closeoutVerifierName',label:'Verifier name',requirement:'optional'},
    {key:'verifierCompany',displayId:'closeoutVerifierCompany',label:'Verifier company',requirement:'optional'},
    {key:'ahjName',displayId:'closeoutAhjName',label:'AHJ / inspecting authority',requirement:'optional'},
    {key:'ahjContact',displayId:'closeoutAhjContact',label:'AHJ contact',requirement:'optional'},
    {key:'reportId',displayId:'closeoutReportId',label:'Verification / inspection report ID',requirement:'optional'},
    {key:'documentSet',displayId:'closeoutDocumentSet',label:'Drawing / closeout document set',requirement:'required'}
  ];

  const projectSelect=document.getElementById('handoffProjectSelect');
  const summary=document.getElementById('handoffSummary');
  const empty=document.getElementById('handoffEmpty');
  const testingLink=document.getElementById('testingLink');
  const closeoutForm=document.getElementById('closeoutForm');
  const closeoutSaveStatus=document.getElementById('closeoutSaveStatus');

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

  function closeout(project){
    const record=project?.handoffMetadata||{};
    const normalized={updatedAt:record.updatedAt||null,fieldStates:{}};
    CLOSEOUT_FIELDS.forEach(field=>{
      normalized[field.key]=record[field.key]||'';
      const requestedState=record.fieldStates?.[field.key];
      normalized.fieldStates[field.key]=field.requirement==='optional'&&requestedState==='na'?'na':'active';
    });
    return normalized;
  }

  function closeoutProgress(record){
    const applicable=CLOSEOUT_FIELDS.filter(field=>record.fieldStates[field.key]!=='na');
    const naFields=CLOSEOUT_FIELDS.filter(field=>record.fieldStates[field.key]==='na');
    const completed=applicable.filter(field=>String(record[field.key]||'').trim());
    const missing=applicable.filter(field=>!String(record[field.key]||'').trim());
    const missingRequired=missing.filter(field=>field.requirement==='required');
    const missingOptional=missing.filter(field=>field.requirement==='optional');
    const percent=applicable.length?Math.round((completed.length/applicable.length)*100):100;
    return {
      applicable:applicable.length,
      completed:completed.length,
      na:naFields.length,
      missing:missing.length,
      missingRequired:missingRequired.length,
      missingOptional:missingOptional.length,
      percent
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

  function saveState(){
    try{
      localStorage.setItem(storageKey,JSON.stringify(state));
      return true;
    }catch(error){
      console.error('Unable to save MGS project data',error);
      return false;
    }
  }

  function persistSelection(projectId){
    state.selectedProjectId=projectId;
    saveState();
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

  function renderCloseout(project){
    const record=closeout(project);
    CLOSEOUT_FIELDS.forEach(field=>{
      const input=closeoutForm.elements.namedItem(field.key);
      const naToggle=closeoutForm.elements.namedItem(`${field.key}__na`);
      const isNa=record.fieldStates[field.key]==='na';
      if(input){
        input.value=record[field.key];
        input.disabled=isNa;
        input.closest('.closeout-field')?.classList.toggle('is-na',isNa);
      }
      if(naToggle) naToggle.checked=isNa;
      const output=document.getElementById(field.displayId);
      if(output) output.textContent=isNa?'N/A':record[field.key]||'—';
      const stateOutput=document.getElementById(`${field.displayId}State`);
      if(stateOutput){
        const filled=Boolean(String(record[field.key]||'').trim());
        const stateLabel=isNa?'N/A · Optional':filled?`Complete · ${field.requirement==='required'?'Required':'Optional'}`:`Missing · ${field.requirement==='required'?'Required':'Optional'}`;
        stateOutput.textContent=stateLabel;
        stateOutput.className=`field-record-state ${isNa?'na':filled?'complete':'missing'} ${field.requirement}`;
      }
    });
    document.getElementById('closeoutUpdatedAt').textContent=record.updatedAt?`Last updated ${formatDateTime(record.updatedAt)}`:'Last updated —';
    return record;
  }

  function renderCloseoutProgress(record){
    const progress=closeoutProgress(record);
    const suffix=progress.na?` · ${progress.na} N/A`:'';
    document.getElementById('closeoutCount').textContent=`${progress.completed} of ${progress.applicable} applicable fields${suffix}`;
    document.getElementById('closeoutBar').style.width=`${progress.percent}%`;
    const note=document.getElementById('closeoutStatusNote');
    if(!progress.missing){
      note.textContent=`All applicable MGS closeout fields are complete.${progress.na?` ${progress.na} optional field${progress.na===1?' is':'s are'} marked N/A.`:''}`;
      note.className='closeout-status-note complete';
      return;
    }
    const pieces=[];
    if(progress.missingRequired) pieces.push(`${progress.missingRequired} required missing`);
    if(progress.missingOptional) pieces.push(`${progress.missingOptional} optional missing`);
    note.textContent=`${pieces.join(' · ')}${progress.na?` · ${progress.na} optional N/A`:''}.`;
    note.className=`closeout-status-note ${progress.missingRequired?'needs-required':'needs-optional'}`;
  }

  function render(){
    populateProjects();
    const project=selectedProject();
    if(!project){
      summary.hidden=true;
      empty.hidden=false;
      testingLink.href='testing.html';
      closeoutForm.reset();
      closeoutSaveStatus.textContent='';
      return;
    }

    empty.hidden=true;
    summary.hidden=false;
    projectSelect.value=project.id;
    testingLink.href=`testing.html?project=${encodeURIComponent(project.id)}#readyForVerifier`;

    const r=readiness(project);
    const closeoutRecord=renderCloseout(project);
    document.getElementById('projectName').textContent=project.name||'Untitled project';
    const meta=[closeoutRecord.projectNumber?`Project ${closeoutRecord.projectNumber}`:'',project.facility,project.location,project.createdAt?`Created ${project.createdAt}`:''].filter(Boolean).join(' · ');
    document.getElementById('projectMeta').textContent=meta||'No facility or location entered.';
    document.getElementById('projectNotes').textContent=project.notes||project.fieldNotes||'No project notes saved.';
    renderCloseoutProgress(closeoutRecord);

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
    closeoutSaveStatus.textContent='';
    persistSelection(id);
    render();
  });

  closeoutForm.addEventListener('change',event=>{
    const toggle=event.target.closest('input[name$="__na"]');
    if(!toggle) return;
    const key=toggle.name.replace(/__na$/,'');
    const input=closeoutForm.elements.namedItem(key);
    if(input){
      input.disabled=toggle.checked;
      input.closest('.closeout-field')?.classList.toggle('is-na',toggle.checked);
    }
    closeoutSaveStatus.textContent='Unsaved changes';
  });

  closeoutForm.addEventListener('input',event=>{
    if(event.target.matches('input:not([name$="__na"])')) closeoutSaveStatus.textContent='Unsaved changes';
  });

  closeoutForm.addEventListener('submit',event=>{
    event.preventDefault();
    const project=selectedProject();
    if(!project) return;
    const existing=closeout(project);
    const next={...existing,fieldStates:{...existing.fieldStates},updatedAt:new Date().toISOString()};
    CLOSEOUT_FIELDS.forEach(field=>{
      const input=closeoutForm.elements.namedItem(field.key);
      const naToggle=closeoutForm.elements.namedItem(`${field.key}__na`);
      const isNa=field.requirement==='optional'&&Boolean(naToggle?.checked);
      next.fieldStates[field.key]=isNa?'na':'active';
      next[field.key]=isNa?existing[field.key]:String(input?.value||'').trim();
    });
    project.handoffMetadata=next;
    if(saveState()){
      closeoutSaveStatus.textContent='Saved';
      render();
      closeoutSaveStatus.textContent='Saved';
    }else{
      closeoutSaveStatus.textContent='Unable to save';
    }
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
    closeoutSaveStatus.textContent='';
    render();
  });

  render();
})();
