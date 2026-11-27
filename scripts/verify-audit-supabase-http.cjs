/* Disposable local Supabase integration test only. Never accepts hosted URLs. */
'use strict';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { makeAuditOutbox } = require('../audit-outbox.js');

const cwd = process.env.MGS_QA_WORKDIR;
if (!cwd || process.env.MGS_DISPOSABLE_QA !== '1') throw Error('Disposable QA stack required.');
const status = execFileSync('supabase', ['status', '-o', 'env'], {cwd, encoding:'utf8'});
function setting(name) {
  const line = status.split(/\r?\n/).find(s=>s.startsWith(name+'='));
  if (!line) throw Error('Missing local stack setting: '+name);
  const value = line.slice(name.length+1);
  return value.startsWith('"') ? JSON.parse(value) : value;
}
const api = new URL(setting('API_URL'));
const db = new URL(setting('DB_URL'));
for (const url of [api,db]) assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname),'Only loopback targets permitted');
assert.equal(api.protocol,'http:');
assert.equal(db.protocol,'postgresql:');
const anon = setting('ANON_KEY'), admin = setting('SERVICE_ROLE_KEY');
function sql(statement) {
  execFileSync('psql',[db.href,'-X','-v','ON_ERROR_STOP=1','-c',statement],{stdio:['ignore','ignore','pipe']});
}
async function request(path, {token=anon,key=anon,method='GET',body}={}) {
  const res=await fetch(new URL(path,api),{
    method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)
  });
  const raw=await res.text();
  return {ok:res.ok,status:res.status,data:raw?JSON.parse(raw):null};
}
function ok(response,label) {
  assert.ok(response.ok,label+' HTTP '+response.status+' code '+(response.data?.code||''));
  return response.data;
}
function denied(response,label) {
  assert.ok([401,403].includes(response.status),label+' HTTP '+response.status);
}
function receipt(response) {
  const body=ok(response,'append receipt');
  if(Array.isArray(body)){assert.equal(body.length,1);return body[0];}
  assert.ok(body && typeof body==='object');
  return body;
}
async function account(role) {
  const email=role+'-'+randomUUID()+'@example.com',password=randomUUID()+'Aa9!';
  const user=ok(await request('/auth/v1/admin/users',{token:admin,key:admin,method:'POST',body:{email,password,email_confirm:true}}),'create synthetic '+role);
  const session=ok(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}),'sign in '+role);
  assert.equal(session.user.id,user.id);
  assert.match(user.id,/^[0-9a-f-]{36}$/i);
  assert.ok(session.access_token);
  return {id:user.id,token:session.access_token};
}
class MemoryStorage {
  constructor(){this.items=new Map();}
  get length(){return this.items.size;}
  key(i){return [...this.items.keys()][i]??null;}
  getItem(k){return this.items.get(k)??null;}
  setItem(k,v){this.items.set(k,String(v));}
}
async function main(){
  const owner=await account('owner'),editor=await account('editor'),viewer=await account('viewer'),outsider=await account('outsider');
  const project=randomUUID(),other=randomUUID(),alarm=randomUUID(),otherAlarm=randomUUID();
  sql("insert into public.projects(id,owner_user_id,name) values ('"+project+"','"+owner.id+"','Synthetic HTTP QA'),('"+other+"','"+outsider.id+"','Other QA');"+
    "insert into public.project_members(project_id,user_id,role) values ('"+project+"','"+editor.id+"','editor'),('"+project+"','"+viewer.id+"','viewer');"+
    "insert into public.field_records(id,project_id,kind,payload) values ('"+alarm+"','"+project+"','alarm','{\"type\":\"Area alarm\",\"location\":\"QA Level 4\"}'),('"+otherAlarm+"','"+other+"','alarm','{\"type\":\"Area alarm\"}');");
  const rpc=(user,body)=>request('/rest/v1/rpc/mgs_append_alarm_correction',{method:'POST',token:user?.token||anon,body});
  const params={p_project_id:project,p_event_id:randomUUID(),p_alarm_id:alarm,p_issue_key:'qa:oxygen',p_note:'Synthetic QA correction',p_recheck_status:'awaiting-recheck',p_client_observed_at:'2026-11-25T12:00:00.000Z'};
  const first=receipt(await rpc(owner,params));
  assert.equal(first.actor_user_id,owner.id);assert.equal(first.event_id,params.p_event_id);
  assert.equal(first.alarm_location,'QA Level 4');assert.ok(Number.isFinite(Date.parse(first.recorded_at)));
  assert.equal(new Date(first.client_observed_at).toISOString(),params.p_client_observed_at);
  assert.deepEqual(receipt(await rpc(owner,params)),first);
  const changed=await rpc(owner,{...params,p_note:'changed'});
  assert.equal(changed.data?.code,'23505');assert.equal(changed.ok,false);
  console.log('PASS: actual Auth token, PostgREST receipt and identical retry');
  for(const user of [viewer,outsider,null]) denied(await rpc(user,{...params,p_event_id:randomUUID()}),'unauthorized append');
  denied(await rpc(owner,{...params,p_event_id:randomUUID(),p_alarm_id:otherAlarm}),'cross-project alarm');
  const read=user=>request('/rest/v1/project_audit_events?project_id=eq.'+project,{token:user?.token||anon});
  assert.equal(ok(await read(viewer),'viewer read').length,1);
  assert.equal(ok(await read(outsider),'outsider filtered read').length,0);
  denied(await read(null),'anonymous read');
  denied(await request('/rest/v1/project_audit_events?event_id=eq.'+params.p_event_id,{token:owner.token,method:'PATCH',body:{note:'tamper'}}),'direct mutation');
  console.log('PASS: authenticated role isolation and direct mutation denial');

  const storage=new MemoryStorage();
  let loseResponse=true;
  const outbox=makeAuditOutbox({storage,getUserId:async()=>editor.id,newId:randomUUID,rpc:async(name,body)=>{
    assert.equal(name,'mgs_append_alarm_correction');
    const response=await rpc(editor,body);
    if(loseResponse){receipt(response);loseResponse=false;throw Error('Simulated response lost after server commit');}
    return response.ok?{data:response.data}:{error:response.data};
  }});
  const event=outbox.stage({ownerUserId:editor.id,projectId:project,alarmId:alarm,issueKey:'qa:oxygen',note:'Offline replay QA',recheckStatus:'rechecked'});
  outbox.queue(editor.id,project,event);
  await assert.rejects(outbox.syncOne(editor.id,project,event),/Simulated response lost/);
  assert.equal(outbox.inspect(editor.id,project,event).status,'awaiting-synchronization');
  const synced=await outbox.syncOne(editor.id,project,event);
  assert.equal(synced.status,'server-confirmed');assert.equal(synced.receipt.actor_user_id,editor.id);
  assert.equal(ok(await read(owner),'owner history').length,2);
  console.log('PASS: real RPC through outbox, lost response and exactly one saved event');

  const concurrent={...params,p_event_id:randomUUID()};
  const [a,b]=await Promise.all([rpc(owner,concurrent),rpc(owner,concurrent)]);
  assert.deepEqual(receipt(a),receipt(b));
  assert.equal(ok(await read(owner),'concurrent history').length,3);
  sql("update public.project_members set deleted_at=now() where project_id='"+project+"' and user_id='"+editor.id+"';");
  denied(await rpc(editor,{...params,p_event_id:randomUUID()}),'revoked editor append');
  assert.equal(ok(await read(editor),'revoked editor read').length,0);
  sql("delete from public.field_records where id='"+alarm+"';");
  assert.equal(ok(await read(owner),'retained history').length,3);
  assert.deepEqual(receipt(await rpc(owner,params)),first);
  denied(await rpc(owner,{...params,p_event_id:randomUUID()}),'new note on removed alarm');
  console.log('PASS: concurrent retry, revoked access and alarm deletion retention');
  console.log('PASS: disposable Supabase HTTP audit integration');
}
main().catch(err=>{console.error(err.message);process.exitCode=1;});
