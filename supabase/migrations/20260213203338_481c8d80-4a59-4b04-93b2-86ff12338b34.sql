
-- Create table for academic events (exams, assignments, review periods)
CREATE TABLE public.academic_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  study_plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'exam', -- 'exam', 'assignment', 'review', 'presentation'
  event_date DATE NOT NULL,
  end_date DATE, -- for review periods
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  grade NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own academic events" ON public.academic_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own academic events" ON public.academic_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own academic events" ON public.academic_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own academic events" ON public.academic_events FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_academic_events_updated_at
  BEFORE UPDATE ON public.academic_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
