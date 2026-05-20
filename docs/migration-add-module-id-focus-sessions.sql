-- Adiciona coluna module_id em focus_sessions para rastreamento
-- de horas estudadas por módulo (granularidade fina).
-- Execute no SQL Editor do Supabase.

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS module_id uuid NULL
  REFERENCES public.course_modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_focus_sessions_module_id
  ON public.focus_sessions(module_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_module_completed
  ON public.focus_sessions(user_id, module_id, completed_at DESC);
