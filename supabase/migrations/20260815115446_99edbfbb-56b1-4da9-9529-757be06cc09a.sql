ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS no_deadline boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.planning_global_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  hours_per_day numeric NOT NULL DEFAULT 4,
  study_days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6],
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_global_goals TO authenticated;
GRANT ALL ON public.planning_global_goals TO service_role;

ALTER TABLE public.planning_global_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own global goal"
ON public.planning_global_goals FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_planning_global_goals_updated_at
BEFORE UPDATE ON public.planning_global_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();