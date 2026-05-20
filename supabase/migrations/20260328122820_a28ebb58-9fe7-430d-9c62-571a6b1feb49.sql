
-- Missing tables

-- 1. COURSE_SUBMODULES
CREATE TABLE IF NOT EXISTS public.course_submodules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hours NUMERIC DEFAULT 0.5,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.course_submodules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own course submodules" ON public.course_submodules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE cm.id = course_submodules.module_id AND c.user_id = auth.uid()
  ));
CREATE INDEX idx_course_submodules_module_id ON public.course_submodules(module_id);

-- 2. DAILY_STUDY_PROGRESS
CREATE TABLE IF NOT EXISTS public.daily_study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  study_date DATE NOT NULL,
  hours_studied NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, study_plan_id, course_id, study_date)
);
ALTER TABLE public.daily_study_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own daily progress" ON public.daily_study_progress FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_daily_study_progress_user ON public.daily_study_progress(user_id, study_plan_id, study_date);

-- 3. STUDY_PLAN_TIME_BLOCKS
CREATE TABLE IF NOT EXISTS public.study_plan_time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'study',
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_plan_time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own time blocks" ON public.study_plan_time_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.study_plans WHERE study_plans.id = study_plan_time_blocks.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE INDEX idx_time_blocks_plan_id ON public.study_plan_time_blocks(study_plan_id);

-- 4. MONTHLY_GOALS
CREATE TABLE IF NOT EXISTS public.monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'hours',
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own monthly goals" ON public.monthly_goals FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_monthly_goals_user_id ON public.monthly_goals(user_id);

-- 5. ACADEMIC_EVENTS
CREATE TABLE IF NOT EXISTS public.academic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'exam',
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own academic events" ON public.academic_events FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_academic_events_user_id ON public.academic_events(user_id);

-- 6. CONTACT_MESSAGES
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages FOR INSERT TO authenticated WITH CHECK (true);

-- 7. STUDY_REMINDERS
CREATE TABLE IF NOT EXISTS public.study_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reminder_time TIME NOT NULL,
  days_of_week TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reminders" ON public.study_reminders FOR ALL USING (auth.uid() = user_id);

-- 8. USER_CERTIFICATES
CREATE TABLE IF NOT EXISTS public.user_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own certificates" ON public.user_certificates FOR ALL USING (auth.uid() = user_id);

-- 9. USER_PROJECTS
CREATE TABLE IF NOT EXISTS public.user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON public.user_projects FOR ALL USING (auth.uid() = user_id);

-- 10. USER_RESUME
CREATE TABLE IF NOT EXISTS public.user_resume (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  headline TEXT,
  summary TEXT,
  skills TEXT[],
  experience JSONB,
  education JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_resume ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own resume" ON public.user_resume FOR ALL USING (auth.uid() = user_id);

-- 11. USER_SOCIAL_LINKS
CREATE TABLE IF NOT EXISTS public.user_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own social links" ON public.user_social_links FOR ALL USING (auth.uid() = user_id);

-- Add missing columns to course_modules
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false;
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;

-- Add missing columns to study_plan_courses  
ALTER TABLE public.study_plan_courses ADD COLUMN IF NOT EXISTS weekly_goal_hours NUMERIC;
ALTER TABLE public.study_plan_courses ADD COLUMN IF NOT EXISTS custom_daily_hours NUMERIC;

-- Add missing columns to study_plans
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS effective_start_date DATE;

-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_daily_study_progress_updated_at BEFORE UPDATE ON public.daily_study_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_goals_updated_at BEFORE UPDATE ON public.monthly_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_resume_updated_at BEFORE UPDATE ON public.user_resume FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
