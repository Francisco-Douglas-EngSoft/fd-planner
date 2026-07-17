
-- ============================================================
-- StudyHub Pro integration — Phase 1
-- Adds Digital Library, Academic Study, Flashcards, MindMaps
-- to the existing FD-Planner database (non-destructive)
-- ============================================================

-- =========================
-- DIGITAL LIBRARY
-- =========================
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  file_path TEXT NOT NULL,
  cover_path TEXT,
  total_pages INTEGER DEFAULT 0,
  last_read_page INTEGER DEFAULT 0,
  status TEXT DEFAULT 'to-read' CHECK (status IN ('to-read','reading','completed','abandoned')),
  category TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_owner_select" ON public.books FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "books_owner_insert" ON public.books FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "books_owner_update" ON public.books FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "books_owner_delete" ON public.books FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  text TEXT,
  highlight TEXT,
  color TEXT DEFAULT 'yellow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annotations TO authenticated;
GRANT ALL ON public.annotations TO service_role;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "annotations_owner_all" ON public.annotations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  chapter TEXT,
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_owner_all" ON public.bookmarks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_owner_all" ON public.collections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.book_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(book_id, collection_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_collections TO authenticated;
GRANT ALL ON public.book_collections TO service_role;
ALTER TABLE public.book_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_collections_owner_all" ON public.book_collections FOR ALL TO authenticated
  USING (book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid()))
  WITH CHECK (book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pages_read INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_sessions TO authenticated;
GRANT ALL ON public.reading_sessions TO service_role;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_sessions_owner_all" ON public.reading_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_read_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_streaks_owner_all" ON public.user_streaks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.reading_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_pages_goal INTEGER DEFAULT 20,
  daily_minutes_goal INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_goals TO authenticated;
GRANT ALL ON public.reading_goals TO service_role;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_goals_owner_all" ON public.reading_goals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================
-- PDF STUDY (CNH-style)
-- =========================
CREATE TABLE IF NOT EXISTS public.study_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT,
  storage_path TEXT,
  total_pages INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  questions_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_pdfs TO authenticated;
GRANT ALL ON public.study_pdfs TO service_role;
ALTER TABLE public.study_pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_pdfs_owner_all" ON public.study_pdfs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.pdf_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.study_pdfs(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  key_concepts TEXT[],
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_pages TO authenticated;
GRANT ALL ON public.pdf_pages TO service_role;
ALTER TABLE public.pdf_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_pages_owner_all" ON public.pdf_pages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.study_pdfs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  category TEXT,
  revision_number INTEGER DEFAULT 0,
  times_answered INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  last_answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_owner_all" ON public.questions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID REFERENCES public.study_pdfs(id) ON DELETE SET NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  wrong_answers INTEGER NOT NULL,
  percentage NUMERIC(5,2),
  is_final_simulado BOOLEAN DEFAULT false,
  weak_categories TEXT[],
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_results_owner_all" ON public.quiz_results FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_result_id UUID NOT NULL REFERENCES public.quiz_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_answers TO authenticated;
GRANT ALL ON public.quiz_answers TO service_role;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_answers_owner_all" ON public.quiz_answers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.revision_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.study_pdfs(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revision_schedule TO authenticated;
GRANT ALL ON public.revision_schedule TO service_role;
ALTER TABLE public.revision_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revision_schedule_owner_all" ON public.revision_schedule FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_study_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_pdfs_planned INTEGER DEFAULT 1,
  revision_frequency TEXT DEFAULT 'normal',
  setup_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_study_config TO authenticated;
GRANT ALL ON public.user_study_config TO service_role;
ALTER TABLE public.user_study_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_study_config_owner_all" ON public.user_study_config FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================
-- ACADEMIC STUDY (MindMaps, Notes, Flashcards)
-- =========================
CREATE TABLE IF NOT EXISTS public.mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'from-primary to-primary/70',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mind_maps TO authenticated;
GRANT ALL ON public.mind_maps TO service_role;
ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mind_maps_owner_all" ON public.mind_maps FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.mind_map_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mind_map_id UUID NOT NULL REFERENCES public.mind_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.mind_map_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  color TEXT,
  x NUMERIC DEFAULT 0,
  y NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mind_map_nodes TO authenticated;
GRANT ALL ON public.mind_map_nodes TO service_role;
ALTER TABLE public.mind_map_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mind_map_nodes_owner_all" ON public.mind_map_nodes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.book_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mind_map_id UUID REFERENCES public.mind_maps(id) ON DELETE SET NULL,
  node_id UUID REFERENCES public.mind_map_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[],
  folder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_notes TO authenticated;
GRANT ALL ON public.book_notes TO service_role;
ALTER TABLE public.book_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_notes_owner_all" ON public.book_notes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  topic TEXT,
  ease_factor NUMERIC DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  next_review DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcards_owner_all" ON public.flashcards FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
  ease_factor_before NUMERIC,
  ease_factor_after NUMERIC,
  interval_before INTEGER,
  interval_after INTEGER,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_history TO authenticated;
GRANT ALL ON public.review_history TO service_role;
ALTER TABLE public.review_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_history_owner_all" ON public.review_history FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================
-- updated_at triggers (reuse existing public.update_updated_at_column)
-- =========================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'books','user_streaks','reading_goals','study_pdfs','user_study_config',
    'mind_maps','mind_map_nodes','book_notes','flashcards'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- =========================
-- Indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_books_user ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_book ON public.annotations(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book ON public.bookmarks(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_date ON public.reading_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_study_pdfs_user ON public.study_pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_pages_pdf ON public.pdf_pages(pdf_id);
CREATE INDEX IF NOT EXISTS idx_questions_pdf ON public.questions(pdf_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON public.flashcards(next_review);
CREATE INDEX IF NOT EXISTS idx_mind_maps_user ON public.mind_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_map ON public.mind_map_nodes(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_book_notes_user ON public.book_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_history_card ON public.review_history(flashcard_id);

-- =========================
-- Storage RLS on bucket "books"
-- (folder pattern: <user_id>/...)
-- =========================
DROP POLICY IF EXISTS "books_bucket_read_own" ON storage.objects;
DROP POLICY IF EXISTS "books_bucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "books_bucket_update_own" ON storage.objects;
DROP POLICY IF EXISTS "books_bucket_delete_own" ON storage.objects;

CREATE POLICY "books_bucket_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "books_bucket_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "books_bucket_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "books_bucket_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);
