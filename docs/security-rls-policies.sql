-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- CRÍTICO: Executar ANTES de ir para produção
-- ============================================

-- ============================================
-- 1. TABELA: profiles
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Usuários podem inserir apenas seu próprio perfil
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. TABELA: courses
-- ============================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios cursos
CREATE POLICY "Users can view own courses"
ON courses FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem criar cursos para si mesmos
CREATE POLICY "Users can create own courses"
ON courses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar apenas seus próprios cursos
CREATE POLICY "Users can update own courses"
ON courses FOR UPDATE
USING (auth.uid() = user_id);

-- Usuários podem deletar apenas seus próprios cursos
CREATE POLICY "Users can delete own courses"
ON courses FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 3. TABELA: tasks
-- ============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
ON tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
ON tasks FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 4. TABELA: study_notes
-- ============================================
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
ON study_notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
ON study_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
ON study_notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
ON study_notes FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 5. TABELA: focus_sessions
-- ============================================
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own focus sessions"
ON focus_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own focus sessions"
ON focus_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus sessions"
ON focus_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus sessions"
ON focus_sessions FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 6. TABELA: study_plans
-- ============================================
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study plans"
ON study_plans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study plans"
ON study_plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans"
ON study_plans FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans"
ON study_plans FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 7. TABELA: study_plan_courses
-- ============================================
ALTER TABLE study_plan_courses ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver cursos de seus próprios planos
CREATE POLICY "Users can view own study plan courses"
ON study_plan_courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_plans
    WHERE study_plans.id = study_plan_courses.study_plan_id
    AND study_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create study plan courses"
ON study_plan_courses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM study_plans
    WHERE study_plans.id = study_plan_courses.study_plan_id
    AND study_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update study plan courses"
ON study_plan_courses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM study_plans
    WHERE study_plans.id = study_plan_courses.study_plan_id
    AND study_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete study plan courses"
ON study_plan_courses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM study_plans
    WHERE study_plans.id = study_plan_courses.study_plan_id
    AND study_plans.user_id = auth.uid()
  )
);

-- ============================================
-- 8. TABELA: study_plan_modules
-- ============================================
ALTER TABLE study_plan_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study plan modules"
ON study_plan_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_plans
    WHERE study_plans.id = study_plan_modules.study_plan_id
    AND study_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create study plan modules"
ON study_plan_modules FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM study_plans
    WHERE study_plans.id = study_plan_modules.study_plan_id
    AND study_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update study plan modules"
ON study_plan_modules FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM study_plans
    WHERE study_plans.id = study_plan_modules.study_plan_id
    AND study_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete study plan modules"
ON study_plan_modules FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM study_plans
    WHERE study_plans.id = study_plan_modules.study_plan_id
    AND study_plans.user_id = auth.uid()
  )
);

-- ============================================
-- 9. TABELA: course_modules
-- ============================================
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own course modules"
ON course_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_modules.course_id
    AND courses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create course modules"
ON course_modules FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_modules.course_id
    AND courses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update course modules"
ON course_modules FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_modules.course_id
    AND courses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete course modules"
ON course_modules FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_modules.course_id
    AND courses.user_id = auth.uid()
  )
);

-- ============================================
-- 10. TABELA: user_achievements
-- ============================================
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
ON user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own achievements"
ON user_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Achievements não podem ser atualizados ou deletados manualmente
-- (apenas pelo sistema)

-- ============================================
-- 11. TABELA: achievements (público - todos podem ver)
-- ============================================
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Todos usuários autenticados podem ver conquistas disponíveis
CREATE POLICY "Authenticated users can view achievements"
ON achievements FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 12. TABELA: audit_logs
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios logs
CREATE POLICY "Users can view own audit logs"
ON audit_logs FOR SELECT
USING (auth.uid() = user_id);

-- Apenas sistema pode inserir logs (via service_role)
CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);

-- Logs não podem ser atualizados ou deletados

-- ============================================
-- 13. TABELA: weekly_goals
-- ============================================
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly goals"
ON weekly_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own weekly goals"
ON weekly_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly goals"
ON weekly_goals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly goals"
ON weekly_goals FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 14. CRIAR TABELA: user_consents (LGPD)
-- ============================================
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('privacy_policy', 'terms_of_service', 'marketing', 'analytics')),
  consent_given BOOLEAN NOT NULL,
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  privacy_policy_version TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
ON user_consents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own consents"
ON user_consents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);

-- ============================================
-- 15. VERIFICAR POLÍTICAS CRIADAS
-- ============================================
-- Execute para verificar se todas as políticas foram criadas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================
-- 16. TESTAR RLS
-- ============================================
-- Teste com dois usuários diferentes:
-- 1. Crie dados com usuário A
-- 2. Tente acessar com usuário B
-- 3. Deve retornar vazio ou erro de permissão

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. RLS é aplicado APENAS para conexões usando anon/authenticated keys
-- 2. service_role key BYPASSA RLS (usar apenas no backend)
-- 3. Testar TODAS as políticas antes de produção
-- 4. Monitorar logs do Supabase para tentativas de acesso negado
-- ============================================
