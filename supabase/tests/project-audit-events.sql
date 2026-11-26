-- Synthetic fixtures only. Run as database administrator in a disposable DB
-- after migrations 0001-0004; never against a customer or production project.
-- All test data and helpers are rolled back on success.
\set ON_ERROR_STOP on
begin;

create function public.mgs_test_assert(ok boolean, label text) returns void
language plpgsql security invoker as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end;
$$;
create function public.mgs_test_denied(stmt text, expected text, label text) returns void
language plpgsql security invoker as $$
declare actual text;
begin
  begin
    execute stmt;
  exception when others then
    get stacked diagnostics actual = returned_sqlstate;
  end;
  perform public.mgs_test_assert(actual = expected, label || ' (SQLSTATE ' || coalesce(actual, 'no error') || ')');
end;
$$;

insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'), -- owner
 ('00000000-0000-4000-8000-000000000002'), -- editor
 ('00000000-0000-4000-8000-000000000003'), -- viewer
 ('00000000-0000-4000-8000-000000000004'); -- outsider / second project owner
insert into public.projects(id,owner_user_id,name) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Synthetic audit QA'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004','Other synthetic project');
insert into public.project_members(project_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','editor'),
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','viewer');
insert into public.field_records(id,project_id,kind,payload,deleted_at) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','alarm','{"type":"Area alarm","location":"QA Level 4"}',null),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','alarm','{"type":"Area alarm"}',null),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','alarm','{"type":"Master alarm"}',null),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','alarm','{"type":"Area alarm"}',now());

-- Convenience wrapper still invokes the RPC as the current caller.
create function public.mgs_test_append(event_id uuid, alarm_id uuid, note text default 'QA correction',
 project_id uuid default '10000000-0000-4000-8000-000000000001')
returns public.project_audit_events language sql security invoker as $$
 select public.mgs_append_alarm_correction(project_id,event_id,alarm_id,'qa:oxygen',note,'awaiting-recheck','2026-11-25T12:00:00Z')
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.mgs_test_assert(
 (r).actor_user_id = auth.uid() and (r).alarm_location = 'QA Level 4'
 and (r).recorded_at >= transaction_timestamp() and (r).recorded_at <= clock_timestamp()
 and (r).client_observed_at = '2026-11-25T12:00:00Z'::timestamptz,
 'owner append and server-derived receipt')
from (select public.mgs_test_append('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001') r) q;
select public.mgs_test_assert(
 (r).recorded_at = (select recorded_at from public.project_audit_events where event_id='30000000-0000-4000-8000-000000000001'),
 'exact replay returns original timestamp')
from (select public.mgs_test_append('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001') r) q;
select public.mgs_test_assert(count(*)=1,'replay did not duplicate') from public.project_audit_events;
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Changed note')$q$,'23505','changed replay rejected');
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000002')$q$,'42501','cross-project alarm rejected');
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000003')$q$,'42501','master alarm rejected');
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000004')$q$,'42501','deleted alarm rejected');
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001','   ')$q$,'22023','blank note rejected');
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001',repeat('x',601))$q$,'22023','oversized note rejected');
select public.mgs_test_denied($q$insert into public.project_audit_events select * from public.project_audit_events$q$,'42501','direct insert denied');
select public.mgs_test_denied($q$update public.project_audit_events set note='changed'$q$,'42501','direct update denied');
select public.mgs_test_denied($q$delete from public.project_audit_events$q$,'42501','direct delete denied');
select public.mgs_test_denied($q$truncate public.project_audit_events$q$,'42501','direct truncate denied');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.mgs_test_assert((r).actor_user_id=auth.uid(),'editor append')
from (select public.mgs_test_append('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001') r) q;
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001')$q$,'23505','different actor cannot replay owner event');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.mgs_test_assert(count(*)=2,'viewer can read') from public.project_audit_events;
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001')$q$,'42501','viewer cannot append');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
select public.mgs_test_assert(count(*)=0,'outsider cannot read other project history') from public.project_audit_events;
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001')$q$,'42501','outsider cannot append');
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select public.mgs_test_denied($q$select * from public.project_audit_events$q$,'42501','anonymous cannot read');
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001')$q$,'42501','anonymous cannot append');
reset role;

-- Administrative writes check the second layer of mutation protection.
select public.mgs_test_denied($q$update public.project_audit_events set note='changed'$q$,'42501','append-only update trigger');
select public.mgs_test_denied($q$delete from public.project_audit_events$q$,'42501','append-only delete trigger');
select public.mgs_test_denied($q$truncate public.project_audit_events$q$,'42501','append-only truncate trigger');
delete from public.field_records where id='20000000-0000-4000-8000-000000000001';
select public.mgs_test_assert(count(*)=2,'history survives hard alarm deletion') from public.project_audit_events;
select public.mgs_test_denied($q$delete from public.projects where id='10000000-0000-4000-8000-000000000001'$q$,'23503','project hard deletion restricted');
update public.project_members set deleted_at=now()
where project_id='10000000-0000-4000-8000-000000000001' and user_id='00000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.mgs_test_assert(count(*)=0,'revoked editor cannot read') from public.project_audit_events;
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001')$q$,'42501','revoked editor cannot replay');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.mgs_test_assert((r).event_id='30000000-0000-4000-8000-000000000001','owner can replay after alarm deletion')
from (select public.mgs_test_append('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001') r) q;
select public.mgs_test_denied($q$select public.mgs_test_append('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001')$q$,'42501','new correction for removed alarm rejected');
reset role;
update public.projects set deleted_at=now() where id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select public.mgs_test_assert(count(*)=0,'soft-deleted project history hidden from owner') from public.project_audit_events;
reset role;
select public.mgs_test_assert(count(*)=2,'soft deletion retains database history') from public.project_audit_events;
rollback;
\echo PASS: project audit SQL regression (disposable database)
