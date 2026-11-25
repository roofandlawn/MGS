'use strict';
const {makeAuditOutbox}=require('../audit-outbox.js');
async function verify(makeAuditOutbox) {
  const map=new Map(), storage={get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const owner='11111111-1111-4111-8111-111111111111', project='22222222-2222-4222-8222-222222222222', alarm='33333333-3333-4333-8333-333333333333', event='44444444-4444-4444-8444-444444444444', other='55555555-5555-4555-8555-555555555555';
  let user=owner, mode='offline', calls=0;
  const at='2026-11-25T16:20:00.000Z';
  const deps={storage,getUserId:async()=>user,newId:()=>event,now:()=>at,rpc:async(name,p)=>{
    calls++; if(name!=='mgs_append_alarm_correction')throw Error('wrong RPC');
    if(mode==='offline')throw Error('network');
    return {data:{project_id:p.p_project_id,event_id:p.p_event_id,alarm_id:p.p_alarm_id,actor_user_id:mode==='wrong-receipt'?other:owner,kind:'area-alarm-correction',alarm_type:'Area alarm',issue_key:p.p_issue_key,note:p.p_note,recheck_status:p.p_recheck_status,client_observed_at:p.p_client_observed_at,recorded_at:'2026-11-25T17:00:00Z'}};
  }};
  const assert=(condition,msg)=>{if(!condition)throw Error(msg)};
  const rejects=async(fn)=>{let failed=false;try{await fn()}catch{failed=true}assert(failed,'expected rejection')};
  let q=makeAuditOutbox(deps);
  const input={ownerUserId:owner,projectId:project,alarmId:alarm,issueKey:'gas-mismatch:1',note:'Corrected link; recheck pending',recheckStatus:'awaiting-recheck'};
  assert(q.stage(input)===event,'stable event');
  assert(q.inspect(owner,project,event).status==='saved-locally','local state');
  await q.syncOne(owner,project,event);assert(calls===0,'unqueued no send');
  await rejects(()=>q.stage({...input,note:'different'}));
  q.queue(owner,project,event);q=makeAuditOutbox(deps);
  assert(q.list(owner,project).length===1 && q.list(other,project).length===0,'reload and account scope');
  await rejects(()=>q.syncOne(owner,project,event));
  assert(q.inspect(owner,project,event).status==='awaiting-synchronization','network failure retains');
  user=other;await rejects(()=>q.syncOne(owner,project,event));assert(calls===1,'wrong account no send');
  user=owner;mode='wrong-receipt';await rejects(()=>q.syncOne(owner,project,event));
  assert(q.inspect(owner,project,event).receipt===null,'wrong receipt rejected');
  mode='ok';let confirmed=await q.syncOne(owner,project,event);
  assert(confirmed.status==='server-confirmed' && confirmed.receipt.recorded_at==='2026-11-25T17:00:00Z','matched server receipt');
  q=makeAuditOutbox(deps);await q.syncOne(owner,project,event);assert(calls===3,'confirmed not resubmitted');
  await rejects(()=>q.stage({...input,eventId:other,note:'x'.repeat(601)}));
  assert(q.list(owner,project).length===1,'invalid event not saved');
  return '12 scenario assertions passed (mock storage and RPC)';
}
verify(makeAuditOutbox).then(console.log).catch(e=>{console.error(e);process.exitCode=1;});
