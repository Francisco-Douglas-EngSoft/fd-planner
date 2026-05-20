-- Add effective_start_date to study_plans for recalculation after course completion
ALTER TABLE public.study_plans 
ADD COLUMN IF NOT EXISTS effective_start_date date DEFAULT NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN public.study_plans.effective_start_date IS 'Date from which remaining courses should be calculated after a course completion. If null, uses start_date.';