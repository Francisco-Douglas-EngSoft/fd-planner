
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS min_daily_hours numeric DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS max_daily_hours numeric DEFAULT 8.0;
