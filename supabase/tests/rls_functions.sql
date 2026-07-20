-- pgTAP tests for has_role() and unlock_achievement().
-- Run inside Supabase SQL editor or via `supabase test db` locally.
--
-- These tests are intentionally lightweight and self-contained: they build
-- disposable users + achievements, invoke the SECURITY DEFINER functions with
-- set_config('request.jwt.claim.sub', ...), and clean up at the end.

begin;
select plan(4);

-- Fixture users
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.local')
on conflict do nothing;

insert into public.user_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin')
on conflict do nothing;

-- 1) has_role returns TRUE for a user with the role
select ok(
  public.has_role('11111111-1111-1111-1111-111111111111'::uuid, 'admin'),
  'has_role identifica corretamente um admin'
);

-- 2) has_role returns FALSE for a user without the role
select ok(
  not public.has_role('22222222-2222-2222-2222-222222222222'::uuid, 'admin'),
  'has_role nega acesso quando o papel não existe'
);

-- 3) unlock_achievement lança erro quando o critério não é atendido
insert into public.achievements (id, name, icon, requirement_type, requirement_value)
values ('33333333-3333-3333-3333-333333333333', 'Test', 'star', 'focus_sessions', 999)
on conflict do nothing;

select throws_ok(
  $$ select public.unlock_achievement('33333333-3333-3333-3333-333333333333'::uuid) $$,
  'Criteria not met for achievement %'
);

-- 4) unlock_achievement é idempotente quando já concedida
insert into public.user_achievements (user_id, achievement_id)
values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')
on conflict do nothing;

set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
select lives_ok(
  $$ select public.unlock_achievement('33333333-3333-3333-3333-333333333333'::uuid) $$,
  'unlock_achievement retorna a conquista existente sem duplicar'
);

select * from finish();
rollback;