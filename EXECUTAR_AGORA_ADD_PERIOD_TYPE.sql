-- ============================================
-- ADICIONAR COLUNA period_type ÀS METAS
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Adicionar coluna period_type à tabela monthly_goals
ALTER TABLE public.monthly_goals 
ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'monthly';

-- Adicionar coluna period_type à tabela weekly_goals
ALTER TABLE public.weekly_goals 
ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'weekly';

-- Comentários para documentação
COMMENT ON COLUMN public.monthly_goals.period_type IS 'Tipo de período: weekly, monthly, bimonthly, semiannual, annual, custom';
COMMENT ON COLUMN public.weekly_goals.period_type IS 'Tipo de período: weekly, monthly, bimonthly, semiannual, annual, custom';
