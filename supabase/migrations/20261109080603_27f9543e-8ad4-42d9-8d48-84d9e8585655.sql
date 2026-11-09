drop function if exists public.get_project_storage_total();

create or replace function public.get_my_storage_objects()
returns table(bucket_id text, name text, size bigint, created_at timestamptz)
language sql
stable
security invoker
set search_path = public, storage
as $$
  select o.bucket_id, o.name, coalesce((o.metadata->>'size')::bigint, 0) as size, o.created_at
  from storage.objects o
  where auth.uid() is not null
    and split_part(o.name, '/', 1) = auth.uid()::text
$$;

revoke all on function public.get_my_storage_objects() from public, anon;
grant execute on function public.get_my_storage_objects() to authenticated;