(()=>{
  const link=document.getElementById('handoffSummaryLink');
  const select=document.getElementById('projectSelect');
  if(!link||!select) return;

  function update(){
    const projectId=select.value;
    link.href=projectId?`handoff-summary.html?project=${encodeURIComponent(projectId)}`:'handoff-summary.html';
    link.setAttribute('aria-disabled',projectId?'false':'true');
  }

  select.addEventListener('change',()=>setTimeout(update,0));
  const observer=new MutationObserver(update);
  observer.observe(select,{childList:true,subtree:true,attributes:true});
  update();
})();
