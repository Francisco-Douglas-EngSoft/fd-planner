-- Create table for study plan modules (module-based planning)
CREATE TABLE public.study_plan_modules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    study_plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    allocated_hours NUMERIC DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    sequence_order INTEGER DEFAULT 1,
    custom_daily_hours NUMERIC DEFAULT NULL,
    weekly_goal_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(study_plan_id, module_id)
);

-- Add planning_type column to study_plans table
ALTER TABLE public.study_plans 
ADD COLUMN planning_type TEXT NOT NULL DEFAULT 'course';

-- Enable RLS
ALTER TABLE public.study_plan_modules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for study_plan_modules
CREATE POLICY "Users can view their own plan modules"
ON public.study_plan_modules
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.study_plans
    WHERE study_plans.id = study_plan_modules.study_plan_id
    AND study_plans.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own plan modules"
ON public.study_plan_modules
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.study_plans
    WHERE study_plans.id = study_plan_modules.study_plan_id
    AND study_plans.user_id = auth.uid()
));

CREATE POLICY "Users can update their own plan modules"
ON public.study_plan_modules
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.study_plans
    WHERE study_plans.id = study_plan_modules.study_plan_id
    AND study_plans.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own plan modules"
ON public.study_plan_modules
FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.study_plans
    WHERE study_plans.id = study_plan_modules.study_plan_id
    AND study_plans.user_id = auth.uid()
));