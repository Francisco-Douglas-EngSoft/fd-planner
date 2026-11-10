CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_completed ON public.focus_sessions (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_course_completed ON public.focus_sessions (user_id, course_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_study_plan_courses_course_id ON public.study_plan_courses (course_id);