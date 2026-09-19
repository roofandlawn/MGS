-- MGS project-photo storage bucket and project-scoped access policies.
-- Object paths are deterministic and start with the owning project UUID:
--   <project_id>/photos/<photo_record_id>/original

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mgs-project-files',
  'mgs-project-files',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.mgs_storage_project_id(object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  first_segment text;
begin
  first_segment := split_part(coalesce(object_name, ''), '/', 1);
  if first_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return first_segment::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

comment on function public.mgs_storage_project_id(text) is
  'Returns the project UUID encoded as the first storage-object path segment, or null for an invalid MGS object path.';

drop policy if exists mgs_project_files_select on storage.objects;
create policy mgs_project_files_select on storage.objects
for select to authenticated
using (
  bucket_id = 'mgs-project-files'
  and public.mgs_can_read_project(public.mgs_storage_project_id(name))
);

drop policy if exists mgs_project_files_insert on storage.objects;
create policy mgs_project_files_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'mgs-project-files'
  and public.mgs_can_edit_project(public.mgs_storage_project_id(name))
);

drop policy if exists mgs_project_files_update on storage.objects;
create policy mgs_project_files_update on storage.objects
for update to authenticated
using (
  bucket_id = 'mgs-project-files'
  and public.mgs_can_edit_project(public.mgs_storage_project_id(name))
)
with check (
  bucket_id = 'mgs-project-files'
  and public.mgs_can_edit_project(public.mgs_storage_project_id(name))
);

drop policy if exists mgs_project_files_delete on storage.objects;
create policy mgs_project_files_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'mgs-project-files'
  and public.mgs_can_edit_project(public.mgs_storage_project_id(name))
);
