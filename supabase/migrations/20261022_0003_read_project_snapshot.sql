-- MGS read-only cloud snapshot RPC. REVIEW/STAGING ONLY: no cloud writer enabled.
-- Caller RLS applies; output includes tombstones for revision accounting.
-- Photo binary content must reside only in private Supabase Storage.
create or replace function public.mgs_read_project_snapshot(p_project_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $mgs$
declare
  v_response jsonb;
begin
  if auth.uid() is null then
    raise exception 'Project unavailable' using errcode = '42501';
  end if;

  with visible_project as materialized (
    select p.* from public.projects p
    where p.id = p_project_id
      and p.deleted_at is null
      and public.mgs_can_read_project(p.id)
  ),
  member_rows as materialized (
    select m.* from public.project_members m
    join visible_project p on p.id = m.project_id
  ),
  system_rows as materialized (
    select s.* from public.project_systems s
    join visible_project p on p.id = s.project_id
  ),
  record_rows as materialized (
    select r.* from public.field_records r
    join visible_project p on p.id = r.project_id
  ),
  record_system_rows as materialized (
    select rs.* from public.record_systems rs
    join record_rows r on r.id = rs.record_id
  ),
  closeout_rows as materialized (
    select c.* from public.project_closeout_items c
    join visible_project p on p.id = c.project_id
  ),
  checklist_rows as materialized (
    select c.* from public.project_checklist_items c
    join visible_project p on p.id = c.project_id
  ),
  attachment_rows as materialized (
    select a.* from public.attachments a
    join visible_project p on p.id = a.project_id
  )
  select jsonb_build_object(
    'contractVersion', 1,
    'projectId', p.id::text,
    'revision', greatest(
      p.revision,
      coalesce((select max(revision) from member_rows), 0),
      coalesce((select max(revision) from system_rows), 0),
      coalesce((select max(revision) from record_rows), 0),
      coalesce((select max(revision) from record_system_rows), 0),
      coalesce((select max(revision) from closeout_rows), 0),
      coalesce((select max(revision) from checklist_rows), 0),
      coalesce((select max(revision) from attachment_rows), 0)
    ),
    'snapshot', jsonb_build_object(
      'project', to_jsonb(p),
      'projectMembers', coalesce(
        (select jsonb_agg(to_jsonb(m) order by m.user_id) from member_rows m),
        '[]'::jsonb
      ),
      'projectSystems', coalesce(
        (select jsonb_agg(to_jsonb(s) order by s.system_id) from system_rows s),
        '[]'::jsonb
      ),
      'fieldRecords', coalesce(
        (select jsonb_agg(to_jsonb(r) order by r.id) from record_rows r),
        '[]'::jsonb
      ),
      'recordSystems', coalesce(
        (select jsonb_agg(to_jsonb(rs) order by rs.record_id, rs.system_id)
         from record_system_rows rs),
        '[]'::jsonb
      ),
      'closeoutItems', coalesce(
        (select jsonb_agg(to_jsonb(c) order by c.item_key) from closeout_rows c),
        '[]'::jsonb
      ),
      'checklistItems', coalesce(
        (select jsonb_agg(to_jsonb(c) order by c.checklist_key) from checklist_rows c),
        '[]'::jsonb
      ),
      'attachments', coalesce(
        (select jsonb_agg(to_jsonb(a) order by a.id) from attachment_rows a),
        '[]'::jsonb
      )
    )
  ) into v_response from visible_project p;

  -- Identical error for nonexistent, deleted or unauthorized project.
  if v_response is null then
    raise exception 'Project unavailable' using errcode = '42501';
  end if;
  return v_response;
end;
$mgs$;

revoke execute on function public.mgs_read_project_snapshot(uuid) from public;
revoke execute on function public.mgs_read_project_snapshot(uuid) from anon;
grant execute on function public.mgs_read_project_snapshot(uuid) to authenticated;

comment on function public.mgs_read_project_snapshot(uuid) is
  'RLS-protected read-only cloud snapshot for MGS preview. No writes or cursor updates.';
