-- Migration: Add min_daily_hours, max_daily_hours and color to study_plans
-- Description: Adiciona campos para definir horas mínimas e máximas de estudo por dia e cor personalizada em cada planejamento

-- Adicionar colunas à tabela study_plans
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS min_daily_hours numeric DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS max_daily_hours numeric DEFAULT 8.0,
ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.study_plans.min_daily_hours IS 'Quantidade mínima de horas de estudo por dia (padrão: 0.5h = 30min)';
COMMENT ON COLUMN public.study_plans.max_daily_hours IS 'Quantidade máxima de horas de estudo por dia (padrão: 8h)';
COMMENT ON COLUMN public.study_plans.color IS 'Cor personalizada para identificação visual do planejamento (formato hex ou nome)';

-- Atualizar registros existentes para ter valores padrão baseados em daily_hours
UPDATE public.study_plans
SET 
  min_daily_hours = CASE 
    WHEN daily_hours IS NOT NULL AND daily_hours > 0 THEN GREATEST(0.5, daily_hours * 0.5)
    ELSE 0.5
  END,
  max_daily_hours = CASE 
    WHEN daily_hours IS NOT NULL AND daily_hours > 0 THEN LEAST(12, daily_hours * 1.5)
    ELSE 8.0
  END
WHERE min_daily_hours IS NULL OR max_daily_hours IS NULL;

-- Adicionar constraint para garantir que min < daily < max
ALTER TABLE public.study_plans
ADD CONSTRAINT check_daily_hours_range 
CHECK (
  min_daily_hours >= 0 AND
  max_daily_hours > min_daily_hours AND
  (daily_hours IS NULL OR (daily_hours >= min_daily_hours AND daily_hours <= max_daily_hours))
);

-- Adicionar índice para melhorar performance em queries
CREATE INDEX IF NOT EXISTS idx_study_plans_daily_hours_range 
ON public.study_plans(min_daily_hours, daily_hours, max_daily_hours);
