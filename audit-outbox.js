/* Staging-only audit outbox prototype. Not wired to UI or live Supabase. */
(function(root){
'use strict';
function makeAuditOutbox({storage, getUserId, rpc, newId, now = () => new Date().toISOString()}) {
  const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const id = value => { if (!uuid(value)) throw new Error('A valid UUID is required.'); return value.toLowerCase(); };
  const field = (value, max) => { if (typeof value !== 'string') throw new Error('Invalid text.'); const s = value.trim(); if (!s || [...s].length > max) throw new Error('Invalid text length.'); return s; };
  const iso = value => { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('Invalid timestamp.'); return new Date(value).toISOString(); };
  const prefix = 'mgs.audit-outbox.v1:';
  const key = (owner, project, event) => prefix + id(owner) + ':' + id(project) + ':' + id(event);
  const read = k => { const raw = storage.getItem(k); return raw === null ? null : JSON.parse(raw); };
  const write = (k, value) => storage.setItem(k, JSON.stringify(value));
  const busy = new Set();
  function stage({ownerUserId, projectId, alarmId, issueKey, note, recheckStatus, observedAt, eventId}) {
    const owner = id(ownerUserId);
    if (!['awaiting-recheck','rechecked'].includes(recheckStatus)) throw new Error('Invalid recheck status.');
    const params = {
      p_project_id: id(projectId), p_event_id: id(eventId ?? newId()), p_alarm_id: id(alarmId),
      p_issue_key: field(issueKey,240), p_note: field(note,600),
      p_recheck_status: recheckStatus, p_client_observed_at: iso(observedAt ?? now())
    };
    const k = key(owner, params.p_project_id, params.p_event_id);
    const old = read(k);
    const entry = {ownerUserId:owner,params};
    if (old && JSON.stringify(old) !== JSON.stringify(entry)) throw new Error('Event ID already staged with different content.');
    if (!old) write(k,entry);
    return params.p_event_id;
  }
  function inspect(owner, project, event) {
    const k = key(owner,project,event), entry = read(k);
    if (!entry) return null;
    const receipt = read(k + ':receipt');
    return {...entry, status: receipt ? 'server-confirmed' : read(k + ':pending') ? 'awaiting-synchronization' : 'saved-locally', receipt};
  }
  function queue(owner,project,event) {
    const item = inspect(owner,project,event);
    if (!item) throw new Error('Local event not found.');
    if (!item.receipt) write(key(owner,project,event) + ':pending', true);
    return inspect(owner,project,event);
  }
  function list(owner,project) {
    const start = prefix + id(owner) + ':' + id(project) + ':';
    const keys = [];
    for (let i=0;i<storage.length;i++) { const k=storage.key(i); if (k?.startsWith(start) && uuid(k.slice(start.length))) keys.push(k); }
    return keys.sort().map(k=>inspect(owner,project,k.slice(start.length))).filter(Boolean);
  }
  function validReceipt(row, item) {
    const p = item.params;
    return row && row.kind === 'area-alarm-correction' && row.alarm_type === 'Area alarm' &&
      row.project_id === p.p_project_id && row.event_id === p.p_event_id && row.alarm_id === p.p_alarm_id &&
      row.actor_user_id === item.ownerUserId && row.issue_key === p.p_issue_key && row.note === p.p_note &&
      row.recheck_status === p.p_recheck_status && iso(row.client_observed_at) === p.p_client_observed_at &&
      typeof row.recorded_at === 'string' && Number.isFinite(Date.parse(row.recorded_at));
  }
  async function syncOne(owner,project,event) {
    const k=key(owner,project,event), item=inspect(owner,project,event);
    if (!item || item.status !== 'awaiting-synchronization') return item;
    if (busy.has(k)) return item;
    busy.add(k);
    try {
      if (await getUserId() !== item.ownerUserId) throw new Error('Sign in as the original submitting account.');
      const response = await rpc('mgs_append_alarm_correction', {...item.params});
      if (response?.error) throw new Error(response.error.message || 'Server rejected correction.');
      const row = Array.isArray(response?.data) && response.data.length === 1 ? response.data[0] : response?.data;
      if (!validReceipt(row,item)) throw new Error('Server receipt did not match the queued correction.');
      if (await getUserId() !== item.ownerUserId) throw new Error('Account changed during synchronization.');
      write(k + ':receipt',row);
      return inspect(owner,project,event);
    } finally { busy.delete(k); }
  }
  return Object.freeze({stage,inspect,queue,list,syncOne});
}
const api=Object.freeze({makeAuditOutbox});
root.MGSAuditOutbox=api;
if(typeof module !== 'undefined' && module.exports) module.exports=api;
})(typeof window !== 'undefined' ? window : globalThis);
