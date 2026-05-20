ALTER TABLE public.monthly_goals 
ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'monthly';

CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_period 
ON public.monthly_goals(user_id, period_type, month_start);