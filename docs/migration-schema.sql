-- ============================================
-- FD PLANNER - SCRIPT DE MIGRAÇÃO COMPLETO
-- Para executar no SQL Editor do Supabase
-- ============================================

-- IMPORTANTE: Execute este script em um projeto Supabase VAZIO
-- Ordem de execução: Este script já está ordenado corretamente

-- ============================================
-- PARTE 1: FUNÇÕES UTILITÁRIAS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$function$;

-- Função para validar blocos de tempo
CREATE OR REPLACE FUNCTION public.validate_study_plan_time_block()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'end_time must be after start_time';
  END IF;

  IF NEW.block_type NOT IN ('study','break') THEN
    RAISE EXCEPTION 'invalid block_type';
  END IF;

  IF NEW.day_of_week NOT IN ('sunday','monday','tuesday','wednesday','thursday','friday','saturday') THEN
    RAISE EXCEPTION 'invalid day_of_week';
  END IF;

  RETURN NEW;
END;
$function$;

-- Função para atualizar horas do curso
CREATE OR REPLACE FUNCTION public.update_course_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_owner_id uuid;
BEGIN
  SELECT user_id INTO course_owner_id 
  FROM courses 
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  
  IF course_owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify course hours for courses you do not own';
  END IF;
  
  UPDATE courses
  SET 
    total_hours = (SELECT COALESCE(SUM(hours), 0) FROM course_modules WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)),
    completed_hours = (SELECT COALESCE(SUM(hours), 0) FROM course_modules WHERE course_id = COALESCE(NEW.course_id, OLD.course_id) AND is_completed = true)
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================
-- PARTE 2: TABELAS INDEPENDENTES
-- ============================================

-- Tabela: profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  full_name text,
  avatar_url text,
  study_hours_goal numeric DEFAULT 3,
  total_study_hours numeric DEFAULT 0,
  streak_days integer DEFAULT 0,
  last_study_date date,
  level integer DEFAULT 1,
  experience_points integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Tabela: achievements
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text NOT NULL,
  category text NOT NULL,
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  experience_reward integer DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "No insert for regular users" ON public.achievements FOR INSERT WITH CHECK (false);
CREATE POLICY "No update for regular users" ON public.achievements FOR UPDATE USING (false);
CREATE POLICY "No delete for regular users" ON public.achievements FOR DELETE USING (false);

-- ============================================
-- PARTE 3: TABELAS DE USUÁRIO
-- ============================================

-- Tabela: user_resume
CREATE TABLE public.user_resume (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text,
  summary text,
  experience text,
  skills text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_resume ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own resume" ON public.user_resume FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own resume" ON public.user_resume FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own resume" ON public.user_resume FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own resume" ON public.user_resume FOR DELETE USING (auth.uid() = user_id);

-- Tabela: user_social_links
CREATE TABLE public.user_social_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  linkedin text,
  github text,
  twitter text,
  instagram text,
  website text,
  portfolio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social links" ON public.user_social_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own social links" ON public.user_social_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own social links" ON public.user_social_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own social links" ON public.user_social_links FOR DELETE USING (auth.uid() = user_id);

-- Tabela: user_projects
CREATE TABLE public.user_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  project_url text,
  technologies text[],
  is_featured boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects" ON public.user_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own projects" ON public.user_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.user_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.user_projects FOR DELETE USING (auth.uid() = user_id);

-- Tabela: user_achievements
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id),
  unlocked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own user achievements" ON public.user_achievements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own user achievements" ON public.user_achievements FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PARTE 4: CURSOS E MÓDULOS
-- ============================================

-- Tabela: courses
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  cover_image_url text,
  total_hours numeric DEFAULT 0,
  completed_hours numeric DEFAULT 0,
  is_favorite boolean DEFAULT false,
  status text DEFAULT 'pending',
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own courses" ON public.courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own courses" ON public.courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own courses" ON public.courses FOR DELETE USING (auth.uid() = user_id);

-- Tabela: course_modules
CREATE TABLE public.course_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  hours numeric NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  is_parent boolean DEFAULT false,
  needs_review boolean DEFAULT false,
  review_date date,
  review_notes text,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view modules of their courses" ON public.course_modules FOR SELECT 
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_modules.course_id AND courses.user_id = auth.uid()));
CREATE POLICY "Users can insert modules to their courses" ON public.course_modules FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_modules.course_id AND courses.user_id = auth.uid()));
CREATE POLICY "Users can update modules of their courses" ON public.course_modules FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_modules.course_id AND courses.user_id = auth.uid()));
CREATE POLICY "Users can delete modules of their courses" ON public.course_modules FOR DELETE 
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_modules.course_id AND courses.user_id = auth.uid()));

-- Tabela: course_submodules
CREATE TABLE public.course_submodules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  hours numeric NOT NULL DEFAULT 0.5,
  order_index integer NOT NULL DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_submodules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submodules of their modules" ON public.course_submodules FOR SELECT 
  USING (EXISTS (SELECT 1 FROM course_modules cm JOIN courses c ON c.id = cm.course_id WHERE cm.id = course_submodules.module_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert submodules to their modules" ON public.course_submodules FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM course_modules cm JOIN courses c ON c.id = cm.course_id WHERE cm.id = course_submodules.module_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update submodules of their modules" ON public.course_submodules FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM course_modules cm JOIN courses c ON c.id = cm.course_id WHERE cm.id = course_submodules.module_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete submodules of their modules" ON public.course_submodules FOR DELETE 
  USING (EXISTS (SELECT 1 FROM course_modules cm JOIN courses c ON c.id = cm.course_id WHERE cm.id = course_submodules.module_id AND c.user_id = auth.uid()));

-- Tabela: user_certificates
CREATE TABLE public.user_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  issuer text,
  credential_id text,
  credential_url text,
  image_url text,
  issue_date date,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates" ON public.user_certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own certificates" ON public.user_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own certificates" ON public.user_certificates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own certificates" ON public.user_certificates FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PARTE 5: PLANEJAMENTO DE ESTUDOS
-- ============================================

-- Tabela: study_plans
CREATE TABLE public.study_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  planning_type text NOT NULL DEFAULT 'course',
  start_date date NOT NULL,
  end_date date NOT NULL,
  effective_start_date date,
  daily_hours numeric DEFAULT 1.5,
  total_hours numeric DEFAULT 0,
  study_days text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans" ON public.study_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plans" ON public.study_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON public.study_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plans" ON public.study_plans FOR DELETE USING (auth.uid() = user_id);

-- Tabela: study_plan_courses
CREATE TABLE public.study_plan_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_plan_id uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  allocated_hours numeric DEFAULT 0,
  is_fixed boolean DEFAULT false,
  sequence_order integer DEFAULT 1,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  weekly_goal_hours numeric DEFAULT 0,
  custom_daily_hours numeric,
  study_days text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plan_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan courses" ON public.study_plan_courses FOR SELECT 
  USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_courses.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can insert their own plan courses" ON public.study_plan_courses FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_courses.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can update their own plan courses" ON public.study_plan_courses FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_courses.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can delete their own plan courses" ON public.study_plan_courses FOR DELETE 
  USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_courses.study_plan_id AND study_plans.user_id = auth.uid()));

-- Tabela: study_plan_modules
CREATE TABLE public.study_plan_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_plan_id uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  allocated_hours numeric DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  sequence_order integer DEFAULT 1,
  custom_daily_hours numeric,
  weekly_goal_hours numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plan_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan modules" ON public.study_plan_modules FOR SELECT 
  USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_modules.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can insert their own plan modules" ON public.study_plan_modules FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_modules.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can update their own plan modules" ON public.study_plan_modules FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_modules.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can delete their own plan modules" ON public.study_plan_modules FOR DELETE 
  USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_modules.study_plan_id AND study_plans.user_id = auth.uid()));

-- Tabela: study_plan_time_blocks
CREATE TABLE public.study_plan_time_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_plan_id uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  course_id uuid,
  day_of_week text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  block_type text NOT NULL DEFAULT 'study',
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plan_time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan time blocks" ON public.study_plan_time_blocks FOR SELECT 
  USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_time_blocks.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can insert their own plan time blocks" ON public.study_plan_time_blocks FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_time_blocks.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can update their own plan time blocks" ON public.study_plan_time_blocks FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_time_blocks.study_plan_id AND study_plans.user_id = auth.uid()));
CREATE POLICY "Users can delete their own plan time blocks" ON public.study_plan_time_blocks FOR DELETE 
  USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_time_blocks.study_plan_id AND study_plans.user_id = auth.uid()));

-- Tabela: daily_study_progress
CREATE TABLE public.daily_study_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  study_plan_id uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  study_date date NOT NULL DEFAULT CURRENT_DATE,
  hours_studied numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_study_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily progress" ON public.daily_study_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily progress" ON public.daily_study_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily progress" ON public.daily_study_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own daily progress" ON public.daily_study_progress FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PARTE 6: METAS
-- ============================================

-- Tabela: weekly_goals
CREATE TABLE public.weekly_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  goal_type text NOT NULL DEFAULT 'hours',
  target_value numeric NOT NULL DEFAULT 10,
  current_value numeric NOT NULL DEFAULT 0,
  week_start date NOT NULL,
  week_end date NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly goals" ON public.weekly_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own weekly goals" ON public.weekly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own weekly goals" ON public.weekly_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own weekly goals" ON public.weekly_goals FOR DELETE USING (auth.uid() = user_id);

-- Tabela: monthly_goals
CREATE TABLE public.monthly_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  goal_type text NOT NULL DEFAULT 'hours',
  target_value numeric NOT NULL DEFAULT 40,
  current_value numeric NOT NULL DEFAULT 0,
  month_start date NOT NULL,
  month_end date NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly goals" ON public.monthly_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own monthly goals" ON public.monthly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own monthly goals" ON public.monthly_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own monthly goals" ON public.monthly_goals FOR DELETE USING (auth.uid() = user_id);

-- Tabela: recovery_goals
CREATE TABLE public.recovery_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  goal_type text NOT NULL DEFAULT 'days_clean',
  target_value integer NOT NULL DEFAULT 7,
  current_value integer DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recovery goals" ON public.recovery_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recovery goals" ON public.recovery_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recovery goals" ON public.recovery_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recovery goals" ON public.recovery_goals FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PARTE 7: FOCO E PRODUTIVIDADE
-- ============================================

-- Tabela: focus_sessions
CREATE TABLE public.focus_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  duration_minutes integer NOT NULL,
  session_type text DEFAULT 'work',
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own focus sessions" ON public.focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own focus sessions" ON public.focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own focus sessions" ON public.focus_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own focus sessions" ON public.focus_sessions FOR DELETE USING (auth.uid() = user_id);

-- Tabela: tasks
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'normal',
  status text DEFAULT 'pending',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Tabela: study_notes
CREATE TABLE public.study_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text,
  mood text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes" ON public.study_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notes" ON public.study_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.study_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.study_notes FOR DELETE USING (auth.uid() = user_id);

-- Tabela: study_reminders
CREATE TABLE public.study_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  reminder_type text NOT NULL DEFAULT 'daily',
  reminder_time time NOT NULL DEFAULT '09:00:00',
  days_of_week text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders" ON public.study_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reminders" ON public.study_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reminders" ON public.study_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reminders" ON public.study_reminders FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PARTE 8: ANTI-VÍCIO
-- ============================================

-- Tabela: addiction_profiles
CREATE TABLE public.addiction_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  addiction_types text[] DEFAULT '{}',
  critical_hours text[] DEFAULT '{}',
  associated_emotions text[] DEFAULT '{}',
  dependency_level integer DEFAULT 5,
  study_impact_level integer DEFAULT 5,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addiction_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own addiction profile" ON public.addiction_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own addiction profile" ON public.addiction_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own addiction profile" ON public.addiction_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own addiction profile" ON public.addiction_profiles FOR DELETE USING (auth.uid() = user_id);

-- Tabela: addiction_checkins
CREATE TABLE public.addiction_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  mood text,
  impulses_count integer DEFAULT 0,
  resistances_count integer DEFAULT 0,
  relapses_count integer DEFAULT 0,
  self_control_score integer DEFAULT 5,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addiction_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checkins" ON public.addiction_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own checkins" ON public.addiction_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own checkins" ON public.addiction_checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own checkins" ON public.addiction_checkins FOR DELETE USING (auth.uid() = user_id);

-- Tabela: clean_streaks
CREATE TABLE public.clean_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  addiction_type text NOT NULL,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_clean_date date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clean_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clean streaks" ON public.clean_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clean streaks" ON public.clean_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clean streaks" ON public.clean_streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clean streaks" ON public.clean_streaks FOR DELETE USING (auth.uid() = user_id);

-- Tabela: impulse_logs
CREATE TABLE public.impulse_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  trigger_type text NOT NULL,
  trigger_context text,
  intensity integer DEFAULT 5,
  resisted boolean DEFAULT false,
  resistance_technique text,
  occurred_during_study boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impulse_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own impulse logs" ON public.impulse_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own impulse logs" ON public.impulse_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own impulse logs" ON public.impulse_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own impulse logs" ON public.impulse_logs FOR DELETE USING (auth.uid() = user_id);

-- Tabela: relapses
CREATE TABLE public.relapses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  addiction_type text NOT NULL,
  trigger_identified text,
  duration_minutes integer,
  recovery_action text,
  lessons_learned text,
  returned_to_study boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.relapses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own relapses" ON public.relapses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own relapses" ON public.relapses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own relapses" ON public.relapses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own relapses" ON public.relapses FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PARTE 9: SISTEMA E NOTIFICAÇÕES
-- ============================================

-- Tabela: notification_history
CREATE TABLE public.notification_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  notification_type text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notification_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notifications" ON public.notification_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notification_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notification_history FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PARTE 10: TRIGGERS
-- ============================================

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para validar blocos de tempo
CREATE TRIGGER validate_time_block
  BEFORE INSERT OR UPDATE ON public.study_plan_time_blocks
  FOR EACH ROW EXECUTE FUNCTION public.validate_study_plan_time_block();

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_resume_updated_at BEFORE UPDATE ON public.user_resume FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_social_links_updated_at BEFORE UPDATE ON public.user_social_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_projects_updated_at BEFORE UPDATE ON public.user_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON public.study_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_plan_time_blocks_updated_at BEFORE UPDATE ON public.study_plan_time_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_study_progress_updated_at BEFORE UPDATE ON public.daily_study_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weekly_goals_updated_at BEFORE UPDATE ON public.weekly_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_goals_updated_at BEFORE UPDATE ON public.monthly_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recovery_goals_updated_at BEFORE UPDATE ON public.recovery_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_notes_updated_at BEFORE UPDATE ON public.study_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_reminders_updated_at BEFORE UPDATE ON public.study_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_addiction_profiles_updated_at BEFORE UPDATE ON public.addiction_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_addiction_checkins_updated_at BEFORE UPDATE ON public.addiction_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clean_streaks_updated_at BEFORE UPDATE ON public.clean_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar horas do curso
CREATE TRIGGER update_course_hours_on_module_change
  AFTER INSERT OR UPDATE OR DELETE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_course_hours();

-- ============================================
-- PARTE 11: STORAGE BUCKET
-- ============================================

-- Criar bucket para capas de cursos
INSERT INTO storage.buckets (id, name, public) VALUES ('course-covers', 'course-covers', true);

-- Políticas de storage
CREATE POLICY "Course covers are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'course-covers');
CREATE POLICY "Authenticated users can upload course covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'course-covers' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own course covers" ON storage.objects FOR UPDATE USING (bucket_id = 'course-covers' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own course covers" ON storage.objects FOR DELETE USING (bucket_id = 'course-covers' AND auth.role() = 'authenticated');

-- ============================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- ============================================
