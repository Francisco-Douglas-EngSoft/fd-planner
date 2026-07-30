-- Índices de performance para relatórios, planejamentos e revisões.
-- Execute no SQL Editor do Supabase. Seguro para rodar mais de uma vez.

-- Sessões de foco: filtros por usuário + intervalo de datas (Dashboard/Relatórios)
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_completed_at
  ON public.focus_sessions (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_type_completed_at
  ON public.focus_sessions (user_id, session_type, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_course
  ON public.focus_sessions (course_id);

-- Leitura (Biblioteca / Relatórios de leitura)
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_date
  ON public.reading_sessions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book
  ON public.reading_sessions (book_id);
CREATE INDEX IF NOT EXISTS idx_books_user_updated_at
  ON public.books (user_id, updated_at DESC);

-- Flashcards: fila de revisão (SM-2)
CREATE INDEX IF NOT EXISTS idx_flashcards_user_next_review
  ON public.flashcards (user_id, next_review);

-- Módulos/submódulos: cálculo unificado de horas concluídas
CREATE INDEX IF NOT EXISTS idx_course_modules_course
  ON public.course_modules (course_id);
CREATE INDEX IF NOT EXISTS idx_course_submodules_module
  ON public.course_submodules (module_id);
CREATE INDEX IF NOT EXISTS idx_courses_user_status
  ON public.courses (user_id, status);

-- Notas e tarefas
CREATE INDEX IF NOT EXISTS idx_study_notes_user_updated_at
  ON public.study_notes (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_completed_at
  ON public.tasks (user_id, status, completed_at DESC);

-- Progresso diário e planejamentos
CREATE INDEX IF NOT EXISTS idx_daily_study_progress_user_date
  ON public.daily_study_progress (user_id, study_date DESC);
CREATE INDEX IF NOT EXISTS idx_study_plan_courses_plan
  ON public.study_plan_courses (study_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_modules_plan
  ON public.study_plan_modules (study_plan_id);

ANALYZE;
