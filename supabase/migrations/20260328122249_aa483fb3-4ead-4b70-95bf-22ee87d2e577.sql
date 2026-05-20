
-- ============================================
-- 1. PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. COURSES
-- ============================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  completed_hours NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own courses" ON public.courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON public.courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON public.courses FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_courses_user_id ON public.courses(user_id);

-- ============================================
-- 3. COURSE_MODULES
-- ============================================
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own course modules" ON public.course_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_modules.course_id AND courses.user_id = auth.uid()));
CREATE POLICY "Users can create course modules" ON public.course_modules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_modules.course_id AND courses.user_id = auth.uid()));
CREATE POLICY "Users can update course modules" ON public.course_modules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_modules.course_id AND courses.user_id = auth.uid()));
CREATE POLICY "Users can delete course modules" ON public.course_modules FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_modules.course_id AND courses.user_id = auth.uid()));

CREATE INDEX idx_course_modules_course_id ON public.course_modules(course_id);

-- ============================================
-- 4. TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- ============================================
-- 5. STUDY_NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS public.study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  mood TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notes" ON public.study_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notes" ON public.study_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.study_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.study_notes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_study_notes_user_id ON public.study_notes(user_id);

-- ============================================
-- 6. FOCUS_SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  duration_minutes NUMERIC NOT NULL DEFAULT 0,
  session_type TEXT NOT NULL DEFAULT 'work',
  mood TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own focus sessions" ON public.focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own focus sessions" ON public.focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own focus sessions" ON public.focus_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own focus sessions" ON public.focus_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_completed_at ON public.focus_sessions(completed_at);

-- ============================================
-- 7. STUDY_PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_hours NUMERIC NOT NULL DEFAULT 1.5,
  study_days TEXT[] NOT NULL DEFAULT '{}',
  total_hours NUMERIC NOT NULL DEFAULT 0,
  planning_type TEXT NOT NULL DEFAULT 'regular',
  planning_category TEXT DEFAULT 'regular',
  semester TEXT,
  academic_period_start DATE,
  academic_period_end DATE,
  hours_per_discipline NUMERIC,
  color TEXT,
  min_daily_hours NUMERIC DEFAULT 0.5,
  max_daily_hours NUMERIC DEFAULT 8.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own study plans" ON public.study_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own study plans" ON public.study_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study plans" ON public.study_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study plans" ON public.study_plans FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_study_plans_user_id ON public.study_plans(user_id);

-- ============================================
-- 8. STUDY_PLAN_COURSES
-- ============================================
CREATE TABLE IF NOT EXISTS public.study_plan_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  allocated_hours NUMERIC NOT NULL DEFAULT 0,
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  study_days TEXT[] DEFAULT '{}',
  sequence_order INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plan_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own study plan courses" ON public.study_plan_courses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.study_plans WHERE study_plans.id = study_plan_courses.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can create study plan courses" ON public.study_plan_courses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.study_plans WHERE study_plans.id = study_plan_courses.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can update study plan courses" ON public.study_plan_courses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.study_plans WHERE study_plans.id = study_plan_courses.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can delete study plan courses" ON public.study_plan_courses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.study_plans WHERE study_plans.id = study_plan_courses.study_plan_id AND study_plans.user_id = auth.uid()));

CREATE INDEX idx_study_plan_courses_plan_id ON public.study_plan_courses(study_plan_id);

-- ============================================
-- 9. STUDY_PLAN_MODULES
-- ============================================
CREATE TABLE IF NOT EXISTS public.study_plan_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  module_hours NUMERIC NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  day_id TEXT,
  daily_hours NUMERIC DEFAULT 0,
  time_slot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plan_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own study plan modules" ON public.study_plan_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.study_plans WHERE study_plans.id = study_plan_modules.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can create study plan modules" ON public.study_plan_modules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.study_plans WHERE study_plans.id = study_plan_modules.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can update study plan modules" ON public.study_plan_modules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.study_plans WHERE study_plans.id = study_plan_modules.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can delete study plan modules" ON public.study_plan_modules FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.study_plans WHERE study_plans.id = study_plan_modules.study_plan_id AND study_plans.user_id = auth.uid()));

CREATE INDEX idx_study_plan_modules_plan_id ON public.study_plan_modules(study_plan_id);

-- ============================================
-- 10. ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  category TEXT NOT NULL DEFAULT 'general',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  experience_reward INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view achievements" ON public.achievements FOR SELECT TO authenticated USING (true);

-- Seed default achievements
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, experience_reward) VALUES
  ('Primeiro Passo', 'Complete sua primeira sessão de foco', 'play', 'focus', 'focus_sessions', 1, 10),
  ('Focado', 'Complete 10 sessões de foco', 'target', 'focus', 'focus_sessions', 10, 50),
  ('Maratonista', 'Complete 50 sessões de foco', 'zap', 'focus', 'focus_sessions', 50, 200),
  ('Mestre do Foco', 'Complete 100 sessões de foco', 'crown', 'focus', 'focus_sessions', 100, 500),
  ('Estudante Dedicado', 'Estude 10 horas no total', 'book', 'study', 'total_hours', 10, 50),
  ('Estudioso', 'Estude 50 horas no total', 'book-open', 'study', 'total_hours', 50, 200),
  ('Acadêmico', 'Estude 100 horas no total', 'graduation-cap', 'study', 'total_hours', 100, 500),
  ('Concluinte', 'Complete 1 curso', 'check-circle', 'courses', 'courses_completed', 1, 100),
  ('Polivalente', 'Complete 5 cursos', 'layers', 'courses', 'courses_completed', 5, 300),
  ('Consistente', 'Mantenha uma sequência de 7 dias', 'flame', 'streak', 'streak_days', 7, 100),
  ('Inabalável', 'Mantenha uma sequência de 30 dias', 'shield', 'streak', 'streak_days', 30, 500),
  ('Lendário', 'Mantenha uma sequência de 100 dias', 'star', 'streak', 'streak_days', 100, 2000);

-- ============================================
-- 11. USER_ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);

-- ============================================
-- 12. WEEKLY_GOALS
-- ============================================
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'hours',
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own weekly goals" ON public.weekly_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own weekly goals" ON public.weekly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly goals" ON public.weekly_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly goals" ON public.weekly_goals FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_weekly_goals_user_id ON public.weekly_goals(user_id);

-- ============================================
-- 13. AUDIT_LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Anyone can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================
-- 14. USER_CONSENTS (LGPD)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('privacy_policy', 'terms_of_service', 'marketing', 'analytics')),
  consent_given BOOLEAN NOT NULL,
  consent_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  privacy_policy_version TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own consents" ON public.user_consents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own consents" ON public.user_consents FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);

-- ============================================
-- 15. ADDICTION_PROFILES (AntiVício)
-- ============================================
CREATE TABLE IF NOT EXISTS public.addiction_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  addiction_types TEXT[] NOT NULL DEFAULT '{}',
  critical_hours TEXT[] NOT NULL DEFAULT '{}',
  associated_emotions TEXT[] NOT NULL DEFAULT '{}',
  dependency_level INTEGER NOT NULL DEFAULT 5,
  study_impact_level INTEGER NOT NULL DEFAULT 5,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.addiction_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own addiction profile" ON public.addiction_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own addiction profile" ON public.addiction_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addiction profile" ON public.addiction_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_addiction_profiles_user_id ON public.addiction_profiles(user_id);

-- ============================================
-- 16. CLEAN_STREAKS (AntiVício)
-- ============================================
CREATE TABLE IF NOT EXISTS public.clean_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addiction_type TEXT NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_clean_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clean_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own clean streaks" ON public.clean_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own clean streaks" ON public.clean_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clean streaks" ON public.clean_streaks FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_clean_streaks_user_id ON public.clean_streaks(user_id);

-- ============================================
-- 17. ADDICTION_CHECKINS (AntiVício)
-- ============================================
CREATE TABLE IF NOT EXISTS public.addiction_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  impulses_count INTEGER NOT NULL DEFAULT 0,
  resistances_count INTEGER NOT NULL DEFAULT 0,
  relapses_count INTEGER NOT NULL DEFAULT 0,
  self_control_score INTEGER DEFAULT 5,
  mood TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, check_date)
);

ALTER TABLE public.addiction_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own addiction checkins" ON public.addiction_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own addiction checkins" ON public.addiction_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addiction checkins" ON public.addiction_checkins FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_addiction_checkins_user_id ON public.addiction_checkins(user_id);
CREATE INDEX idx_addiction_checkins_date ON public.addiction_checkins(check_date);

-- ============================================
-- 18. IMPULSE_LOGS (AntiVício)
-- ============================================
CREATE TABLE IF NOT EXISTS public.impulse_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT,
  trigger_context TEXT,
  intensity INTEGER DEFAULT 5,
  resisted BOOLEAN NOT NULL DEFAULT false,
  resistance_technique TEXT,
  occurred_during_study BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.impulse_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own impulse logs" ON public.impulse_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own impulse logs" ON public.impulse_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_impulse_logs_user_id ON public.impulse_logs(user_id);
CREATE INDEX idx_impulse_logs_created_at ON public.impulse_logs(created_at);

-- ============================================
-- 19. RELAPSES (AntiVício)
-- ============================================
CREATE TABLE IF NOT EXISTS public.relapses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addiction_type TEXT NOT NULL,
  trigger_identified TEXT,
  lessons_learned TEXT,
  returned_to_study BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.relapses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own relapses" ON public.relapses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own relapses" ON public.relapses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_relapses_user_id ON public.relapses(user_id);

-- ============================================
-- 20. RECOVERY_GOALS (AntiVício)
-- ============================================
CREATE TABLE IF NOT EXISTS public.recovery_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'days_clean',
  target_value INTEGER NOT NULL DEFAULT 7,
  current_value INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recovery goals" ON public.recovery_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own recovery goals" ON public.recovery_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recovery goals" ON public.recovery_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recovery goals" ON public.recovery_goals FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_recovery_goals_user_id ON public.recovery_goals(user_id);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_notes_updated_at BEFORE UPDATE ON public.study_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON public.study_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weekly_goals_updated_at BEFORE UPDATE ON public.weekly_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_addiction_profiles_updated_at BEFORE UPDATE ON public.addiction_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clean_streaks_updated_at BEFORE UPDATE ON public.clean_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recovery_goals_updated_at BEFORE UPDATE ON public.recovery_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
