(()=>{
  const evidenceLabels={
    installerTesting:'Installer testing',
    inspectionWitness:'Inspection / witness',
    concealedInspection:'Concealed-work inspection',
    labelsComplete:'Labels and valve tags',
    systemsReady:'Source, alarms, outlets/inlets',
    documentationReady:'Verifier documentation'
  };

  const timers=new Map();

  function selected(){
    return typeof selectedProject==='function'?selectedProject():null;
  }

  function blankEvidence(){
    return {note:'',completionDate:'',attachmentRef:'',updatedAt:null};
  }

  function normalizeEvidence(project,key){
    const stored=project?.verifierEvidence?.[key]||{};
    return {
      note:stored.note||'',
      completionDate:stored.completionDate||'',
      attachmentRef:stored.attachmentRef||'',
      updatedAt:stored.updatedAt||null
    };
  }

  function hasEvidence(record){
    return Boolean(record.note||record.completionDate||record.attachmentRef);
  }

  function evidenceSummary(record){
    if(!hasEvidence(record)) return 'Add evidence';
    const pieces=[];
    if(record.completionDate) pieces.push(record.completionDate);
    if(record.note) pieces.push('note');
    if(record.attachmentRef) pieces.push('reference');
    return `Evidence saved · ${pieces.join(' · ')}`;
  }

  function ensureUi(){
    document.querySelectorAll('#readyChecks > label').forEach(label=>{
      const input=label.querySelector('[data-ready-key]');
      if(!input) return;
      const key=input.dataset.readyKey;
      const wrapper=document.createElement('div');
      wrapper.className='ready-item';
      wrapper.dataset.evidenceKey=key;
      label.parentNode.insertBefore(wrapper,label);
      wrapper.appendChild(label);

      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='evidence-toggle';
      toggle.setAttribute('aria-expanded','false');
      toggle.innerHTML='<span>Add evidence</span><span aria-hidden="true">＋</span>';
      wrapper.appendChild(toggle);

      const panel=document.createElement('div');
      panel.className='evidence-panel';
      panel.hidden=true;
      panel.innerHTML=`
        <div class="evidence-grid">
          <label class="evidence-field evidence-note">
            <span>Field note</span>
            <textarea rows="3" data-evidence-field="note" placeholder="What was completed, witnessed, corrected, or handed off?"></textarea>
          </label>
          <label class="evidence-field">
            <span>Completion date</span>
            <input type="date" data-evidence-field="completionDate" />
          </label>
          <label class="evidence-field">
            <span>Photo / document reference</span>
            <input type="text" data-evidence-field="attachmentRef" placeholder="Photo 12, pressure-test.pdf, drawing M2.1, or link" />
          </label>
        </div>
        <div class="evidence-foot"><span class="evidence-save-state" aria-live="polite">Not saved yet</span><button type="button" class="evidence-clear secondary">Clear evidence</button></div>`;
      wrapper.appendChild(panel);

      toggle.addEventListener('click',()=>{
        const next=panel.hidden;
        panel.hidden=!next;
        toggle.setAttribute('aria-expanded',String(next));
        toggle.querySelector('[aria-hidden="true"]').textContent=next?'−':'＋';
      });

      panel.addEventListener('input',event=>{
        const field=event.target.closest('[data-evidence-field]');
        if(!field) return;
        scheduleSave(key,field.dataset.evidenceField,field.value,wrapper);
      });

      panel.addEventListener('change',event=>{
        const field=event.target.closest('[data-evidence-field]');
        if(!field) return;
        saveEvidence(key,field.dataset.evidenceField,field.value,wrapper);
      });

      panel.querySelector('.evidence-clear').addEventListener('click',()=>{
        const project=selected();
        if(!project) return;
        if(!confirm(`Clear saved evidence for ${evidenceLabels[key]||'this handoff item'}?`)) return;
        project.verifierEvidence=project.verifierEvidence||{};
        project.verifierEvidence[key]=blankEvidence();
        project.verifierEvidence[key].updatedAt=new Date().toISOString();
        if(typeof saveProjectState==='function') saveProjectState('Evidence cleared');
        renderEvidence();
      });
    });
  }

  function scheduleSave(key,field,value,wrapper){
    const timerKey=`${key}:${field}`;
    clearTimeout(timers.get(timerKey));
    wrapper.querySelector('.evidence-save-state').textContent='Saving…';
    timers.set(timerKey,setTimeout(()=>saveEvidence(key,field,value,wrapper),350));
  }

  function saveEvidence(key,field,value,wrapper){
    const project=selected();
    if(!project) return;
    project.verifierEvidence=project.verifierEvidence||{};
    const record=normalizeEvidence(project,key);
    record[field]=value;
    record.updatedAt=new Date().toISOString();
    project.verifierEvidence[key]=record;
    if(typeof saveProjectState==='function') saveProjectState('Evidence saved');
    updateItemUi(wrapper,record);
  }

  function updateItemUi(wrapper,record){
    const toggle=wrapper.querySelector('.evidence-toggle');
    toggle.querySelector('span').textContent=evidenceSummary(record);
    toggle.classList.toggle('has-evidence',hasEvidence(record));
    const saveState=wrapper.querySelector('.evidence-save-state');
    saveState.textContent=record.updatedAt?`Last saved ${new Date(record.updatedAt).toLocaleString()}`:'Not saved yet';
  }

  function renderEvidence(){
    const project=selected();
    document.querySelectorAll('.ready-item').forEach(wrapper=>{
      const key=wrapper.dataset.evidenceKey;
      const record=project?normalizeEvidence(project,key):blankEvidence();
      wrapper.querySelectorAll('[data-evidence-field]').forEach(field=>{
        field.disabled=!project;
        field.value=record[field.dataset.evidenceField]||'';
      });
      wrapper.querySelector('.evidence-toggle').disabled=!project;
      wrapper.querySelector('.evidence-clear').disabled=!project||!hasEvidence(record);
      updateItemUi(wrapper,record);
    });
  }

  function todayLocal(){
    const now=new Date();
    const year=now.getFullYear();
    const month=String(now.getMonth()+1).padStart(2,'0');
    const day=String(now.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }

  ensureUi();
  renderEvidence();

  if(typeof projectSelect!=='undefined'&&projectSelect){
    projectSelect.addEventListener('change',()=>setTimeout(renderEvidence,0));
  }

  if(typeof readyChecks!=='undefined'&&readyChecks){
    readyChecks.addEventListener('change',event=>{
      const input=event.target.closest('[data-ready-key]');
      if(!input||!input.checked) return;
      const project=selected();
      if(!project) return;
      const key=input.dataset.readyKey;
      const record=normalizeEvidence(project,key);
      if(record.completionDate) return;
      record.completionDate=todayLocal();
      record.updatedAt=new Date().toISOString();
      project.verifierEvidence=project.verifierEvidence||{};
      project.verifierEvidence[key]=record;
      if(typeof saveProjectState==='function') saveProjectState('Checklist and date saved');
      renderEvidence();
    });
  }
})();
