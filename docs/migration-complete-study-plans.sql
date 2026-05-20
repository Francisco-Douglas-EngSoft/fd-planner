-- ============================================================================
-- MIGRATION COMPLETA: study_plans - Adicionar Colunas Faltantes
-- ============================================================================
-- Data: 27 de Março de 2026
-- Descrição: Adiciona todas as colunas que estão no código mas faltam no banco
-- ============================================================================

-- 1. Adicionar coluna planning_category (se não existir)
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS planning_category text DEFAULT 'regular';

COMMENT ON COLUMN public.study_plans.planning_category IS 'Categoria do planejamento: regular ou faculdade';

-- 2. Adicionar coluna semester (se não existir)
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS semester text DEFAULT NULL;

COMMENT ON COLUMN public.study_plans.semester IS 'Semestre acadêmico (para planejamentos de faculdade)';

-- 3. Adicionar coluna academic_period_start (se não existir)
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS academic_period_start date DEFAULT NULL;

COMMENT ON COLUMN public.study_plans.academic_period_start IS 'Data de início do período acadêmico';

-- 4. Adicionar coluna academic_period_end (se não existir)
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS academic_period_end date DEFAULT NULL;

COMMENT ON COLUMN public.study_plans.academic_period_end IS 'Data de término do período acadêmico';

-- 5. Adicionar coluna hours_per_discipline (se não existir)
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS hours_per_discipline numeric DEFAULT NULL;

COMMENT ON COLUMN public.study_plans.hours_per_discipline IS 'Horas por disciplina (para planejamentos de faculdade)';

-- 6. Adicionar coluna color (se não existir)
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;

COMMENT ON COLUMN public.study_plans.color IS 'Cor personalizada para identificação visual do planejamento (formato hex: #RRGGBB)';

-- 7. Adicionar coluna min_daily_hours (se não existir)
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS min_daily_hours numeric DEFAULT 0.5;

COMMENT ON COLUMN public.study_plans.min_daily_hours IS 'Quantidade mínima de horas de estudo por dia (padrão: 0.5h = 30min)';

-- 8. Adicionar coluna max_daily_hours (se não existir)
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS max_daily_hours numeric DEFAULT 8.0;

COMMENT ON COLUMN public.study_plans.max_daily_hours IS 'Quantidade máxima de horas de estudo por dia (padrão: 8h)';

-- ============================================================================
-- ATUALIZAR REGISTROS EXISTENTES
-- ============================================================================

-- Atualizar planning_category para registros existentes (se NULL)
UPDATE public.study_plans
SET planning_category = 'regular'
WHERE planning_category IS NULL;

-- Atualizar min_daily_hours e max_daily_hours baseado em daily_hours existente
UPDATE public.study_plans
SET 
  min_daily_hours = CASE 
    WHEN daily_hours IS NOT NULL AND daily_hours > 0 THEN GREATEST(0.5, daily_hours * 0.7)
    ELSE 0.5
  END,
  max_daily_hours = CASE 
    WHEN daily_hours IS NOT NULL AND daily_hours > 0 THEN LEAST(12, daily_hours * 1.3)
    ELSE 8.0
  END
WHERE min_daily_hours IS NULL OR max_daily_hours IS NULL;

-- ============================================================================
-- CONSTRAINTS E VALIDAÇÕES
-- ============================================================================

-- Remover constraint antiga se existir
ALTER TABLE public.study_plans
DROP CONSTRAINT IF EXISTS check_daily_hours_range;

-- Adicionar constraint para garantir que min < daily < max
ALTER TABLE public.study_plans
ADD CONSTRAINT check_daily_hours_range 
CHECK (
  min_daily_hours >= 0 AND
  max_daily_hours > min_daily_hours AND
  (daily_hours IS NULL OR (daily_hours >= min_daily_hours AND daily_hours <= max_daily_hours))
);

-- Adicionar constraint para planning_category
ALTER TABLE public.study_plans
DROP CONSTRAINT IF EXISTS check_planning_category;

ALTER TABLE public.study_plans
ADD CONSTRAINT check_planning_category 
CHECK (planning_category IN ('regular', 'faculdade'));

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice para queries por categoria
CREATE INDEX IF NOT EXISTS idx_study_plans_category 
ON public.study_plans(planning_category);

-- Índice para queries por range de horas
CREATE INDEX IF NOT EXISTS idx_study_plans_daily_hours_range 
ON public.study_plans(min_daily_hours, daily_hours, max_daily_hours);

-- Índice para queries por período acadêmico
CREATE INDEX IF NOT EXISTS idx_study_plans_academic_period 
ON public.study_plans(academic_period_start, academic_period_end)
WHERE academic_period_start IS NOT NULL;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar todas as colunas
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'study_plans'
ORDER BY ordinal_position;

-- Verificar constraints
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.study_plans'::regclass
AND contype = 'c';

-- Contar registros
SELECT 
  COUNT(*) as total_plans,
  COUNT(color) as plans_with_color,
  COUNT(min_daily_hours) as plans_with_min,
  COUNT(max_daily_hours) as plans_with_max
FROM public.study_plans;

-- ============================================================================
-- SUCESSO!
-- ============================================================================

SELECT 'Migration completa! Todas as colunas foram adicionadas com sucesso.' as status;
