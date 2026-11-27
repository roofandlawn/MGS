-- MGS audit persistence foundation. DEVELOPMENT/STAGING ONLY.
-- No mobile cloud writing or snapshot v1 changes. Scope: new correction notes.
-- Future alarm deletion must append a server event atomically with tombstone.
begin;

create table public.project_audit_events (
  project_id uuid not null references public.projects(id) on delete restrict,
  event_id uuid not null,
  -- No FK to field_records: history must survive alarm removal.
  alarm_id uuid not null,
  kind text not null default 'area-alarm-correction'
    check (kind = 'area-alarm-correction'),
  actor_user_id uuid not null,
  recorded_at timestamptz not null default clock_timestamp(),
  client_observed_at timestamptz,
  issue_key text not null check (char_length(btrim(issue_key)) between 1 and 240),
  note text not null check (char_length(btrim(note)) between 1 and 600),
  recheck_status text not null check (recheck_status in ('awaiting-recheck', 'rechecked')),
  alarm_location text not null check (char_length(alarm_location) <= 200),
  alarm_type text not null check (alarm_type = 'Area alarm'),
  primary key (project_id, event_id)
);
create index project_audit_events_history_idx
  on public.project_audit_events (project_id, recorded_at, event_id);

alter table public.project_audit_events enable row level security;
revoke all on public.project_audit_events from public, anon, authenticated, service_role;
grant select on public.project_audit_events to authenticated;
create policy project_audit_events_read on public.project_audit_events
  for select to authenticated using (public.mgs_can_read_project(project_id));

-- Defense in depth: ordinary SQL mutation is rejected even if privileges
-- are granted accidentally. Administrators can disable protections; not WORM.
create function public.mgs_reject_audit_mutation()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'Project audit events are append-only' using errcode = '42501';
end;
$$;
revoke execute on function public.mgs_reject_audit_mutation() from public, anon, authenticated, service_role;
create trigger project_audit_events_no_mutation
before update or delete or truncate on public.project_audit_events
for each statement execute function public.mgs_reject_audit_mutation();

-- Only this RPC appends under ordinary application roles. Actor and receipt
-- time are server-derived. Event UUID stays stable across network retries.
create function public.mgs_append_alarm_correction(
  p_project_id uuid,
  p_event_id uuid,
  p_alarm_id uuid,
  p_issue_key text,
  p_note text,
  p_recheck_status text,
  p_client_observed_at timestamptz default null
)
returns public.project_audit_events
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_event public.project_audit_events;
  v_alarm public.field_records;
  v_key text := btrim(p_issue_key);
  v_note text := btrim(p_note);
begin
  if v_actor is null or not public.mgs_can_edit_project(p_project_id) then
    raise exception 'Project unavailable' using errcode = '42501';
  end if;
  if p_event_id is null or p_alarm_id is null
     or v_key is null or char_length(v_key) not between 1 and 240
     or v_note is null or char_length(v_note) not between 1 and 600
     or p_recheck_status is null
     or p_recheck_status not in ('awaiting-recheck', 'rechecked') then
    raise exception 'Invalid correction event' using errcode = '22023';
  end if;

  -- Existing receipts can be retried even after alarm deletion.
  select * into v_event from public.project_audit_events
    where project_id = p_project_id and event_id = p_event_id;
  if not found then
    -- Use the exact type string in area-alarm-review.js and the payload
    -- mapping in supabase-sync-contract.js. Serialize against record updates.
    select * into v_alarm from public.field_records
      where id = p_alarm_id and project_id = p_project_id
        and kind = 'alarm' and deleted_at is null
        and payload->>'type' = 'Area alarm'
      for share;
    if not found then
      raise exception 'Area alarm unavailable' using errcode = '42501';
    end if;
    insert into public.project_audit_events (
      project_id, event_id, alarm_id, actor_user_id, client_observed_at,
      issue_key, note, recheck_status, alarm_location, alarm_type
    ) values (
      p_project_id, p_event_id, p_alarm_id, v_actor, p_client_observed_at,
      v_key, v_note, p_recheck_status,
      left(coalesce(v_alarm.payload->>'location', ''), 200),
      v_alarm.payload->>'type'
    )
    on conflict (project_id, event_id) do nothing returning * into v_event;
    if not found then
      select * into v_event from public.project_audit_events
        where project_id = p_project_id and event_id = p_event_id;
    end if;
  end if;
  if v_event.event_id is null
     or v_event.actor_user_id is distinct from v_actor
     or v_event.alarm_id is distinct from p_alarm_id
     or v_event.issue_key is distinct from v_key
     or v_event.note is distinct from v_note
     or v_event.recheck_status is distinct from p_recheck_status
     or v_event.client_observed_at is distinct from p_client_observed_at then
    raise exception 'Event ID already used for a different correction' using errcode = '23505';
  end if;
  return v_event;
end;
$$;
revoke execute on function public.mgs_append_alarm_correction(uuid, uuid, uuid, text, text, text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.mgs_append_alarm_correction(uuid, uuid, uuid, text, text, text, timestamptz)
  to authenticated;

comment on table public.project_audit_events is
  'Staging append-only field documentation receipts; not accepted testing, compliance, or ASSE 6030 verification. Project hard deletion is restricted; retention and authorized export policy required.';
comment on column public.project_audit_events.actor_user_id is
  'Authenticated submitting account, not proof of who performed work; retained UUID without auth.users cascading foreign key.';
comment on column public.project_audit_events.recorded_at is
  'Database receipt time, not the time field work occurred.';
commit;

-- STAGING RELEASE GATE: execute after migrations 0001-0003 on disposable DB.
-- Owner/editor append; viewer reads only; outsiders, revoked and anon fail.
-- Cross-project IDs, non-area/deleted alarms and invalid inputs fail.
-- Replay same event/actor/content returns original receipt; changed values
-- fail, including concurrent retries. Verify no direct client mutations.
-- Remove disposable alarm and verify note survives; hard project deletion
-- must fail. Test soft-delete access, retention, backups and export policy.
-- Audit reads remain separate from existing snapshot revision cursor.
-- Issue key/status/note are user assertions, not server-verified findings.
-- Do not import local notes as new authenticated history. Legacy attribution
-- needs an explicit unverified-import format. No production integration
-- until staging passes, atomic deletion/write bypass safeguards, offline
-- queue/receipt UX, and project permission policies are reviewed.
