-- ═══════════════════════════════════════════════════════════════
-- TABELAS PARA REDES/PORTFÓLIO
-- ═══════════════════════════════════════════════════════════════

-- Tabela para links de redes sociais
CREATE TABLE public.user_social_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin TEXT,
  github TEXT,
  twitter TEXT,
  instagram TEXT,
  website TEXT,
  portfolio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para currículo digital
CREATE TABLE public.user_resume (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  summary TEXT,
  skills TEXT,
  experience TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para projetos do portfólio
CREATE TABLE public.user_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  technologies TEXT[],
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para certificados
CREATE TABLE public.user_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  expiry_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  image_url TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- TABELA PARA METAS PERSONALIZÁVEIS (EXPANDINDO weekly_goals)
-- ═══════════════════════════════════════════════════════════════

-- Tabela para metas mensais
CREATE TABLE public.monthly_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'hours', -- hours, courses, tasks, focus_sessions
  target_value NUMERIC NOT NULL DEFAULT 40,
  current_value NUMERIC NOT NULL DEFAULT 0,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- TABELA PARA NOTIFICAÇÕES/LEMBRETES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.study_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  reminder_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, custom
  reminder_time TIME NOT NULL DEFAULT '09:00:00',
  days_of_week TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para histórico de notificações
CREATE TABLE public.notification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  notification_type TEXT NOT NULL, -- reminder, achievement, goal, tip
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- HABILITAR RLS EM TODAS AS TABELAS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.user_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resume ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- POLÍTICAS RLS - user_social_links
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can view their own social links" ON public.user_social_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social links" ON public.user_social_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social links" ON public.user_social_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social links" ON public.user_social_links
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- POLÍTICAS RLS - user_resume
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can view their own resume" ON public.user_resume
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resume" ON public.user_resume
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resume" ON public.user_resume
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume" ON public.user_resume
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- POLÍTICAS RLS - user_projects
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can view their own projects" ON public.user_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON public.user_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.user_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.user_projects
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- POLÍTICAS RLS - user_certificates
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can view their own certificates" ON public.user_certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own certificates" ON public.user_certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certificates" ON public.user_certificates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own certificates" ON public.user_certificates
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- POLÍTICAS RLS - monthly_goals
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can view their own monthly goals" ON public.monthly_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly goals" ON public.monthly_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly goals" ON public.monthly_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly goals" ON public.monthly_goals
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- POLÍTICAS RLS - study_reminders
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can view their own reminders" ON public.study_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders" ON public.study_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" ON public.study_reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" ON public.study_reminders
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- POLÍTICAS RLS - notification_history
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can view their own notifications" ON public.notification_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON public.notification_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notification_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notification_history
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS PARA UPDATED_AT
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER update_user_social_links_updated_at
  BEFORE UPDATE ON public.user_social_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_resume_updated_at
  BEFORE UPDATE ON public.user_resume
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_projects_updated_at
  BEFORE UPDATE ON public.user_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_goals_updated_at
  BEFORE UPDATE ON public.monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_reminders_updated_at
  BEFORE UPDATE ON public.study_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();