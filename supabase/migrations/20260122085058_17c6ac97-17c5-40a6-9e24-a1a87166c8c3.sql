-- Add time blocks for weekly schedule (study + breaks)
create table if not exists public.study_plan_time_blocks (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid not null,
  course_id uuid null,
  day_of_week text not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  block_type text not null default 'study',
  title text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Helpful indexes
create index if not exists idx_sptb_plan_day on public.study_plan_time_blocks (study_plan_id, day_of_week);
create index if not exists idx_sptb_course on public.study_plan_time_blocks (course_id);

-- Enable RLS
alter table public.study_plan_time_blocks enable row level security;

-- Ensure updated_at auto-updates
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists update_study_plan_time_blocks_updated_at on public.study_plan_time_blocks;
create trigger update_study_plan_time_blocks_updated_at
before update on public.study_plan_time_blocks
for each row
execute function public.update_updated_at_column();

-- Validate times (use trigger, not check constraint)
create or replace function public.validate_study_plan_time_block()
returns trigger as $$
begin
  if new.end_time <= new.start_time then
    raise exception 'end_time must be after start_time';
  end if;

  if new.block_type not in ('study','break') then
    raise exception 'invalid block_type';
  end if;

  if new.day_of_week not in ('sunday','monday','tuesday','wednesday','thursday','friday','saturday') then
    raise exception 'invalid day_of_week';
  end if;

  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists validate_study_plan_time_blocks on public.study_plan_time_blocks;
create trigger validate_study_plan_time_blocks
before insert or update on public.study_plan_time_blocks
for each row
execute function public.validate_study_plan_time_block();

-- RLS policies: user must own the referenced plan
create policy "Users can view their own plan time blocks"
on public.study_plan_time_blocks
for select
using (
  exists (
    select 1 from public.study_plans
    where study_plans.id = study_plan_time_blocks.study_plan_id
      and study_plans.user_id = auth.uid()
  )
);

create policy "Users can insert their own plan time blocks"
on public.study_plan_time_blocks
for insert
with check (
  exists (
    select 1 from public.study_plans
    where study_plans.id = study_plan_time_blocks.study_plan_id
      and study_plans.user_id = auth.uid()
  )
);

create policy "Users can update their own plan time blocks"
on public.study_plan_time_blocks
for update
using (
  exists (
    select 1 from public.study_plans
    where study_plans.id = study_plan_time_blocks.study_plan_id
      and study_plans.user_id = auth.uid()
  )
);

create policy "Users can delete their own plan time blocks"
on public.study_plan_time_blocks
for delete
using (
  exists (
    select 1 from public.study_plans
    where study_plans.id = study_plan_time_blocks.study_plan_id
      and study_plans.user_id = auth.uid()
  )
);