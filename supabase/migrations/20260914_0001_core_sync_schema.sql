-- MGS Supabase core schema and offline-sync contract, v1.
-- This migration intentionally keeps field-record details in JSONB while
-- normalizing project/system membership, system tags, closeout state,
-- checklist state, and attachment metadata.

create extension if not exists pgcrypto;

create sequence if not exists public.mgs_sync_revision_seq;

create or replace function public.mgs_touch_sync_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.revision = nextval('public.mgs_sync_revision_seq');
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  project_number text,
  facility text,
  location text,
  notes text,
  field_notes text,
  system_other text,
  schema_version integer not null default 1 check (schema_version > 0),
  workflow_state jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz,
  revision bigint not null default nextval('public.mgs_sync_revision_seq'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  client_updated_at timestamptz,
  revision bigint not null default nextval('public.mgs_sync_revision_seq'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_systems (
  project_id uuid not null references public.projects(id) on delete cascade,
  system_id text not null check (system_id in (
    'oxygen', 'medicalAir', 'medicalVacuum', 'wagd',
    'nitrousOxide', 'nitrogen', 'instrumentAir', 'carbonDioxide'
  )),
  client_updated_at timestamptz,
  revision bigint not null default nextval('public.mgs_sync_revision_seq'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, system_id)
);

create table if not exists public.field_records (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('alarm', 'outlet', 'test', 'photo', 'valve', 'note')),
  payload jsonb not null default '{}'::jsonb,
  system_other text,
  schema_version integer not null default 1 check (schema_version > 0),
  client_updated_at timestamptz,
  revision bigint not null default nextval('public.mgs_sync_revision_seq'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.record_systems (
  record_id uuid not null references public.field_records(id) on delete cascade,
  system_id text not null check (system_id in (
    'oxygen', 'medicalAir', 'medicalVacuum', 'wagd',
    'nitrousOxide', 'nitrogen', 'instrumentAir', 'carbonDioxide'
  )),
  client_updated_at timestamptz,
  revision bigint not null default nextval('public.mgs_sync_revision_seq'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (record_id, system_id)
);

create table if not exists public.project_closeout_items (
  project_id uuid not null references public.projects(id) on delete cascade,
  item_key text not null,
  requirement_level text not null check (requirement_level in ('required', 'optional')),
  status text not null default 'missing' check (status in ('missing', 'complete', 'na')),
  value_text text,
  client_updated_at timestamptz,
  revision bigint not null default nextval('public.mgs_sync_revision_seq'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, item_key),
  constraint project_closeout_na_optional_only check (status <> 'na' or requirement_level = 'optional')
);

create table if not exists public.project_checklist_items (
  project_id uuid not null references public.projects(id) on delete cascade,
  checklist_key text not null,
  checklist_type text not null check (checklist_type in ('manual', 'generated')),
  status text not null default 'open' check (status in ('open', 'done', 'na')),
  title text,
  completed_at timestamptz,
  client_updated_at timestamptz,
  revision bigint not null default nextval('public.mgs_sync_revision_seq'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, checklist_key)
);

create table if not exists public.attachments (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  record_id uuid references public.field_records(id) on delete set null,
  bucket_id text not null default 'mgs-project-files',
  storage_path text not null,
  file_name text,
  media_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  sha256 text,
  caption text,
  metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz,
  client_updated_at timestamptz,
  revision bigint not null default nextval('public.mgs_sync_revision_seq'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

create index if not exists projects_revision_idx on public.projects (revision);
create index if not exists project_members_revision_idx on public.project_members (revision);
create index if not exists project_systems_revision_idx on public.project_systems (revision);
create index if not exists field_records_project_kind_idx on public.field_records (project_id, kind) where deleted_at is null;
create index if not exists field_records_revision_idx on public.field_records (revision);
create index if not exists record_systems_revision_idx on public.record_systems (revision);
create index if not exists project_closeout_revision_idx on public.project_closeout_items (revision);
create index if not exists project_checklist_revision_idx on public.project_checklist_items (revision);
create index if not exists attachments_project_idx on public.attachments (project_id) where deleted_at is null;
create index if not exists attachments_revision_idx on public.attachments (revision);

create or replace function public.mgs_add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner', deleted_at = null;
  return new;
end;
$$;

drop trigger if exists mgs_projects_add_owner on public.projects;
create trigger mgs_projects_add_owner
after insert on public.projects
for each row execute function public.mgs_add_owner_membership();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects', 'project_members', 'project_systems', 'field_records',
    'record_systems', 'project_closeout_items', 'project_checklist_items', 'attachments'
  ]
  loop
    execute format('drop trigger if exists mgs_touch_sync_row on public.%I', table_name);
    execute format(
      'create trigger mgs_touch_sync_row before insert or update on public.%I for each row execute function public.mgs_touch_sync_row()',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.mgs_can_read_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    left join public.project_members m
      on m.project_id = p.id
     and m.user_id = auth.uid()
     and m.deleted_at is null
    where p.id = target_project_id
      and p.deleted_at is null
      and (p.owner_user_id = auth.uid() or m.user_id is not null)
  );
$$;

create or replace function public.mgs_can_edit_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    left join public.project_members m
      on m.project_id = p.id
     and m.user_id = auth.uid()
     and m.deleted_at is null
    where p.id = target_project_id
      and p.deleted_at is null
      and (
        p.owner_user_id = auth.uid()
        or m.role in ('owner', 'editor')
      )
  );
$$;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_systems enable row level security;
alter table public.field_records enable row level security;
alter table public.record_systems enable row level security;
alter table public.project_closeout_items enable row level security;
alter table public.project_checklist_items enable row level security;
alter table public.attachments enable row level security;

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select
using (public.mgs_can_read_project(id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert
with check (owner_user_id = auth.uid());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update
using (public.mgs_can_edit_project(id))
with check (public.mgs_can_edit_project(id));

drop policy if exists members_select on public.project_members;
create policy members_select on public.project_members for select
using (public.mgs_can_read_project(project_id));

drop policy if exists members_write on public.project_members;
create policy members_write on public.project_members for all
using (exists (
  select 1 from public.projects p
  where p.id = project_id and p.owner_user_id = auth.uid() and p.deleted_at is null
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id and p.owner_user_id = auth.uid() and p.deleted_at is null
));

drop policy if exists project_systems_select on public.project_systems;
create policy project_systems_select on public.project_systems for select
using (public.mgs_can_read_project(project_id));

drop policy if exists project_systems_write on public.project_systems;
create policy project_systems_write on public.project_systems for all
using (public.mgs_can_edit_project(project_id))
with check (public.mgs_can_edit_project(project_id));

drop policy if exists field_records_select on public.field_records;
create policy field_records_select on public.field_records for select
using (public.mgs_can_read_project(project_id));

drop policy if exists field_records_write on public.field_records;
create policy field_records_write on public.field_records for all
using (public.mgs_can_edit_project(project_id))
with check (public.mgs_can_edit_project(project_id));

drop policy if exists record_systems_select on public.record_systems;
create policy record_systems_select on public.record_systems for select
using (exists (
  select 1 from public.field_records r
  where r.id = record_id and public.mgs_can_read_project(r.project_id)
));

drop policy if exists record_systems_write on public.record_systems;
create policy record_systems_write on public.record_systems for all
using (exists (
  select 1 from public.field_records r
  where r.id = record_id and public.mgs_can_edit_project(r.project_id)
))
with check (exists (
  select 1 from public.field_records r
  where r.id = record_id and public.mgs_can_edit_project(r.project_id)
));

drop policy if exists closeout_select on public.project_closeout_items;
create policy closeout_select on public.project_closeout_items for select
using (public.mgs_can_read_project(project_id));

drop policy if exists closeout_write on public.project_closeout_items;
create policy closeout_write on public.project_closeout_items for all
using (public.mgs_can_edit_project(project_id))
with check (public.mgs_can_edit_project(project_id));

drop policy if exists checklist_select on public.project_checklist_items;
create policy checklist_select on public.project_checklist_items for select
using (public.mgs_can_read_project(project_id));

drop policy if exists checklist_write on public.project_checklist_items;
create policy checklist_write on public.project_checklist_items for all
using (public.mgs_can_edit_project(project_id))
with check (public.mgs_can_edit_project(project_id));

drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments for select
using (public.mgs_can_read_project(project_id));

drop policy if exists attachments_write on public.attachments;
create policy attachments_write on public.attachments for all
using (public.mgs_can_edit_project(project_id))
with check (public.mgs_can_edit_project(project_id));

comment on column public.projects.workflow_state is
  'Transition-safe JSON for UI workflow state not yet fully normalized: manual tasks, generated field checklist, verifier readiness, and verifier evidence.';
comment on column public.field_records.payload is
  'Kind-specific field data. Photo bytes/data URLs must not be stored here; move files to Supabase Storage and keep only attachment metadata.';
comment on column public.projects.revision is
  'Server-assigned monotonic sync cursor. Clients pull rows with revision greater than their last acknowledged cursor.';
