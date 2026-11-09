create or replace function public.get_my_storage_objects()
returns table(bucket_id text, name text, size bigint, created_at timestamptz)
language sql
stable
security definer
set search_path = public, storage
as $$
  select o.bucket_id, o.name, coalesce((o.metadata->>'size')::bigint, 0) as size, o.created_at
  from storage.objects o
  where auth.uid() is not null
    and (
      o.owner = auth.uid()
      or o.owner_id = auth.uid()::text
      or split_part(o.name, '/', 1) = auth.uid()::text
    )
$$;

revoke all on function public.get_my_storage_objects() from public, anon;
grant execute on function public.get_my_storage_objects() to authenticated;

create or replace function public.get_project_storage_total()
returns bigint
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when public.has_role(auth.uid(), 'admin')
      then (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects)
    else null
  end
$$;

revoke all on function public.get_project_storage_total() from public, anon;
grant execute on function public.get_project_storage_total() to authenticated;