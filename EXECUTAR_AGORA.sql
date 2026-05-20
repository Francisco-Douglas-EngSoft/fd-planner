-- ============================================================================
-- COPIE E COLE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE
-- ============================================================================
-- URL: https://supabase.com/dashboard/project/ksasfeinrzfwvmkaizuh/sql
-- ============================================================================

-- 1. ADICIONAR COLUNA COLOR (CORRIGE O ERRO PRINCIPAL)
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS color text;

-- 2. ADICIONAR OUTRAS COLUNAS NECESSÁRIAS
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS planning_category text DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS semester text,
ADD COLUMN IF NOT EXISTS academic_period_start date,
ADD COLUMN IF NOT EXISTS academic_period_end date,
ADD COLUMN IF NOT EXISTS hours_per_discipline numeric,
ADD COLUMN IF NOT EXISTS min_daily_hours numeric DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS max_daily_hours numeric DEFAULT 8.0;

-- 3. ATUALIZAR REGISTROS EXISTENTES
UPDATE public.study_plans
SET planning_category = 'regular'
WHERE planning_category IS NULL;

UPDATE public.study_plans
SET 
  min_daily_hours = GREATEST(0.5, COALESCE(daily_hours, 1.5) * 0.7),
  max_daily_hours = LEAST(12, COALESCE(daily_hours, 1.5) * 1.3)
WHERE min_daily_hours IS NULL OR max_daily_hours IS NULL;

-- 4. ADICIONAR VALIDAÇÃO
ALTER TABLE public.study_plans
DROP CONSTRAINT IF EXISTS check_daily_hours_range;

ALTER TABLE public.study_plans
ADD CONSTRAINT check_daily_hours_range 
CHECK (
  min_daily_hours >= 0 AND
  max_daily_hours > min_daily_hours AND
  (daily_hours IS NULL OR (daily_hours >= min_daily_hours AND daily_hours <= max_daily_hours))
);

-- 5. RECARREGAR CACHE DO SUPABASE
NOTIFY pgrst, 'reload schema';

-- 6. VERIFICAR SE DEU CERTO
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'study_plans'
AND column_name IN ('color', 'min_daily_hours', 'max_daily_hours', 'planning_category')
ORDER BY column_name;

-- Se você ver 4 linhas acima, está tudo certo! ✅
