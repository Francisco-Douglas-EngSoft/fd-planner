
-- Add planning_category to distinguish regular plans from faculdade plans
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS planning_category text NOT NULL DEFAULT 'regular';

-- Add semester and academic calendar fields for faculdade plans
ALTER TABLE public.study_plans
ADD COLUMN IF NOT EXISTS semester text,
ADD COLUMN IF NOT EXISTS academic_period_start date,
ADD COLUMN IF NOT EXISTS academic_period_end date,
ADD COLUMN IF NOT EXISTS hours_per_discipline numeric;

-- Add comment for clarity
COMMENT ON COLUMN public.study_plans.planning_category IS 'Either regular or faculdade';
COMMENT ON COLUMN public.study_plans.semester IS 'Semester label e.g. 2025.1, 2025.2';
