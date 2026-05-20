CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_course_hours(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_course_hours() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  course_owner_id uuid;
BEGIN
  -- Get the course owner
  SELECT user_id INTO course_owner_id 
  FROM courses 
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  
  -- Verify the trigger was initiated by the course owner
  IF course_owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify course hours for courses you do not own';
  END IF;
  
  -- Update course hours
  UPDATE courses
  SET 
    total_hours = (SELECT COALESCE(SUM(hours), 0) FROM course_modules WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)),
    completed_hours = (SELECT COALESCE(SUM(hours), 0) FROM course_modules WHERE course_id = COALESCE(NEW.course_id, OLD.course_id) AND is_completed = true)
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text NOT NULL,
    category text NOT NULL,
    requirement_type text NOT NULL,
    requirement_value integer NOT NULL,
    experience_reward integer DEFAULT 50,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: addiction_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addiction_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    check_date date DEFAULT CURRENT_DATE NOT NULL,
    impulses_count integer DEFAULT 0,
    resistances_count integer DEFAULT 0,
    relapses_count integer DEFAULT 0,
    self_control_score integer DEFAULT 5,
    mood text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT addiction_checkins_self_control_score_check CHECK (((self_control_score >= 1) AND (self_control_score <= 10)))
);


--
-- Name: addiction_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addiction_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    addiction_types text[] DEFAULT '{}'::text[],
    critical_hours text[] DEFAULT '{}'::text[],
    associated_emotions text[] DEFAULT '{}'::text[],
    dependency_level integer DEFAULT 5,
    study_impact_level integer DEFAULT 5,
    onboarding_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT addiction_profiles_dependency_level_check CHECK (((dependency_level >= 1) AND (dependency_level <= 10))),
    CONSTRAINT addiction_profiles_study_impact_level_check CHECK (((study_impact_level >= 1) AND (study_impact_level <= 10)))
);


--
-- Name: clean_streaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clean_streaks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    addiction_type text NOT NULL,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    last_clean_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    name text NOT NULL,
    hours numeric DEFAULT 1 NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    cover_image_url text,
    total_hours numeric DEFAULT 0,
    completed_hours numeric DEFAULT 0,
    status text DEFAULT 'pending'::text,
    is_favorite boolean DEFAULT false,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT courses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: daily_study_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_study_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    study_plan_id uuid NOT NULL,
    study_date date DEFAULT CURRENT_DATE NOT NULL,
    hours_studied numeric DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: focus_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.focus_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid,
    duration_minutes integer NOT NULL,
    session_type text DEFAULT 'work'::text,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT focus_sessions_session_type_check CHECK ((session_type = ANY (ARRAY['work'::text, 'break'::text, 'long_break'::text])))
);


--
-- Name: impulse_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impulse_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    trigger_type text NOT NULL,
    trigger_context text,
    intensity integer DEFAULT 5,
    resisted boolean DEFAULT false,
    resistance_technique text,
    occurred_during_study boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT impulse_logs_intensity_check CHECK (((intensity >= 1) AND (intensity <= 10)))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    avatar_url text,
    study_hours_goal numeric DEFAULT 3,
    total_study_hours numeric DEFAULT 0,
    streak_days integer DEFAULT 0,
    last_study_date date,
    level integer DEFAULT 1,
    experience_points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recovery_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recovery_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    goal_type text DEFAULT 'days_clean'::text NOT NULL,
    target_value integer DEFAULT 7 NOT NULL,
    current_value integer DEFAULT 0,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: relapses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relapses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    addiction_type text NOT NULL,
    trigger_identified text,
    duration_minutes integer,
    recovery_action text,
    lessons_learned text,
    returned_to_study boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid,
    title text NOT NULL,
    content text,
    mood text,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT study_notes_mood_check CHECK ((mood = ANY (ARRAY['great'::text, 'good'::text, 'neutral'::text, 'tired'::text, 'frustrated'::text])))
);


--
-- Name: study_plan_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_plan_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    study_plan_id uuid NOT NULL,
    course_id uuid NOT NULL,
    allocated_hours numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_fixed boolean DEFAULT false,
    study_days text[],
    sequence_order integer DEFAULT 1,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    weekly_goal_hours numeric DEFAULT 0,
    custom_daily_hours numeric
);


--
-- Name: study_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    daily_hours numeric DEFAULT 1.5,
    study_days text[] DEFAULT ARRAY['monday'::text, 'tuesday'::text, 'wednesday'::text, 'thursday'::text, 'friday'::text],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_hours numeric DEFAULT 0
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid,
    title text NOT NULL,
    description text,
    priority text DEFAULT 'normal'::text,
    status text DEFAULT 'pending'::text,
    due_date date,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['urgent'::text, 'normal'::text, 'low'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    goal_type text DEFAULT 'hours'::text NOT NULL,
    target_value numeric DEFAULT 10 NOT NULL,
    current_value numeric DEFAULT 0 NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    is_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: addiction_checkins addiction_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addiction_checkins
    ADD CONSTRAINT addiction_checkins_pkey PRIMARY KEY (id);


--
-- Name: addiction_checkins addiction_checkins_user_id_check_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addiction_checkins
    ADD CONSTRAINT addiction_checkins_user_id_check_date_key UNIQUE (user_id, check_date);


--
-- Name: addiction_profiles addiction_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addiction_profiles
    ADD CONSTRAINT addiction_profiles_pkey PRIMARY KEY (id);


--
-- Name: addiction_profiles addiction_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addiction_profiles
    ADD CONSTRAINT addiction_profiles_user_id_key UNIQUE (user_id);


--
-- Name: clean_streaks clean_streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clean_streaks
    ADD CONSTRAINT clean_streaks_pkey PRIMARY KEY (id);


--
-- Name: clean_streaks clean_streaks_user_id_addiction_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clean_streaks
    ADD CONSTRAINT clean_streaks_user_id_addiction_type_key UNIQUE (user_id, addiction_type);


--
-- Name: course_modules course_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: daily_study_progress daily_study_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_study_progress
    ADD CONSTRAINT daily_study_progress_pkey PRIMARY KEY (id);


--
-- Name: focus_sessions focus_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.focus_sessions
    ADD CONSTRAINT focus_sessions_pkey PRIMARY KEY (id);


--
-- Name: impulse_logs impulse_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impulse_logs
    ADD CONSTRAINT impulse_logs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: recovery_goals recovery_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recovery_goals
    ADD CONSTRAINT recovery_goals_pkey PRIMARY KEY (id);


--
-- Name: relapses relapses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relapses
    ADD CONSTRAINT relapses_pkey PRIMARY KEY (id);


--
-- Name: study_notes study_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_notes
    ADD CONSTRAINT study_notes_pkey PRIMARY KEY (id);


--
-- Name: study_plan_courses study_plan_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plan_courses
    ADD CONSTRAINT study_plan_courses_pkey PRIMARY KEY (id);


--
-- Name: study_plan_courses study_plan_courses_study_plan_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plan_courses
    ADD CONSTRAINT study_plan_courses_study_plan_id_course_id_key UNIQUE (study_plan_id, course_id);


--
-- Name: study_plans study_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plans
    ADD CONSTRAINT study_plans_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: daily_study_progress unique_daily_progress; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_study_progress
    ADD CONSTRAINT unique_daily_progress UNIQUE (user_id, course_id, study_plan_id, study_date);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);


--
-- Name: weekly_goals weekly_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_goals
    ADD CONSTRAINT weekly_goals_pkey PRIMARY KEY (id);


--
-- Name: course_modules on_module_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_module_change AFTER INSERT OR DELETE OR UPDATE ON public.course_modules FOR EACH ROW EXECUTE FUNCTION public.update_course_hours();


--
-- Name: addiction_checkins update_addiction_checkins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addiction_checkins_updated_at BEFORE UPDATE ON public.addiction_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: addiction_profiles update_addiction_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addiction_profiles_updated_at BEFORE UPDATE ON public.addiction_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clean_streaks update_clean_streaks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clean_streaks_updated_at BEFORE UPDATE ON public.clean_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_study_progress update_daily_study_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_study_progress_updated_at BEFORE UPDATE ON public.daily_study_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recovery_goals update_recovery_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recovery_goals_updated_at BEFORE UPDATE ON public.recovery_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: addiction_checkins addiction_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addiction_checkins
    ADD CONSTRAINT addiction_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: addiction_profiles addiction_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addiction_profiles
    ADD CONSTRAINT addiction_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: clean_streaks clean_streaks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clean_streaks
    ADD CONSTRAINT clean_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: course_modules course_modules_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: courses courses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: daily_study_progress daily_study_progress_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_study_progress
    ADD CONSTRAINT daily_study_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: daily_study_progress daily_study_progress_study_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_study_progress
    ADD CONSTRAINT daily_study_progress_study_plan_id_fkey FOREIGN KEY (study_plan_id) REFERENCES public.study_plans(id) ON DELETE CASCADE;


--
-- Name: focus_sessions focus_sessions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.focus_sessions
    ADD CONSTRAINT focus_sessions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: focus_sessions focus_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.focus_sessions
    ADD CONSTRAINT focus_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: impulse_logs impulse_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impulse_logs
    ADD CONSTRAINT impulse_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recovery_goals recovery_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recovery_goals
    ADD CONSTRAINT recovery_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: relapses relapses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relapses
    ADD CONSTRAINT relapses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: study_notes study_notes_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_notes
    ADD CONSTRAINT study_notes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: study_notes study_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_notes
    ADD CONSTRAINT study_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: study_plan_courses study_plan_courses_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plan_courses
    ADD CONSTRAINT study_plan_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: study_plan_courses study_plan_courses_study_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plan_courses
    ADD CONSTRAINT study_plan_courses_study_plan_id_fkey FOREIGN KEY (study_plan_id) REFERENCES public.study_plans(id) ON DELETE CASCADE;


--
-- Name: study_plans study_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plans
    ADD CONSTRAINT study_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: achievements Authenticated users can view achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view achievements" ON public.achievements FOR SELECT TO authenticated USING (true);


--
-- Name: achievements No delete for regular users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No delete for regular users" ON public.achievements FOR DELETE TO authenticated USING (false);


--
-- Name: achievements No insert for regular users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No insert for regular users" ON public.achievements FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: achievements No update for regular users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No update for regular users" ON public.achievements FOR UPDATE TO authenticated USING (false);


--
-- Name: course_modules Users can delete modules of their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete modules of their courses" ON public.course_modules FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = course_modules.course_id) AND (courses.user_id = auth.uid())))));


--
-- Name: addiction_profiles Users can delete their own addiction profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own addiction profile" ON public.addiction_profiles FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: addiction_checkins Users can delete their own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own checkins" ON public.addiction_checkins FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: clean_streaks Users can delete their own clean streaks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own clean streaks" ON public.clean_streaks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: courses Users can delete their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own courses" ON public.courses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: daily_study_progress Users can delete their own daily progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own daily progress" ON public.daily_study_progress FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: focus_sessions Users can delete their own focus sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own focus sessions" ON public.focus_sessions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: impulse_logs Users can delete their own impulse logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own impulse logs" ON public.impulse_logs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: study_notes Users can delete their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notes" ON public.study_notes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: study_plan_courses Users can delete their own plan courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own plan courses" ON public.study_plan_courses FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.study_plans
  WHERE ((study_plans.id = study_plan_courses.study_plan_id) AND (study_plans.user_id = auth.uid())))));


--
-- Name: study_plans Users can delete their own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own plans" ON public.study_plans FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can delete their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING ((auth.uid() = id));


--
-- Name: recovery_goals Users can delete their own recovery goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own recovery goals" ON public.recovery_goals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: relapses Users can delete their own relapses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own relapses" ON public.relapses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tasks Users can delete their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_achievements Users can delete their own user achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own user achievements" ON public.user_achievements FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: weekly_goals Users can delete their own weekly goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own weekly goals" ON public.weekly_goals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: course_modules Users can insert modules to their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert modules to their courses" ON public.course_modules FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = course_modules.course_id) AND (courses.user_id = auth.uid())))));


--
-- Name: user_achievements Users can insert their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own achievements" ON public.user_achievements FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: addiction_profiles Users can insert their own addiction profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own addiction profile" ON public.addiction_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: addiction_checkins Users can insert their own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own checkins" ON public.addiction_checkins FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: clean_streaks Users can insert their own clean streaks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own clean streaks" ON public.clean_streaks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: courses Users can insert their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own courses" ON public.courses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_study_progress Users can insert their own daily progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own daily progress" ON public.daily_study_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: focus_sessions Users can insert their own focus sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own focus sessions" ON public.focus_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: impulse_logs Users can insert their own impulse logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own impulse logs" ON public.impulse_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: study_notes Users can insert their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notes" ON public.study_notes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: study_plan_courses Users can insert their own plan courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own plan courses" ON public.study_plan_courses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.study_plans
  WHERE ((study_plans.id = study_plan_courses.study_plan_id) AND (study_plans.user_id = auth.uid())))));


--
-- Name: study_plans Users can insert their own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own plans" ON public.study_plans FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: recovery_goals Users can insert their own recovery goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own recovery goals" ON public.recovery_goals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: relapses Users can insert their own relapses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own relapses" ON public.relapses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tasks Users can insert their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own tasks" ON public.tasks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: weekly_goals Users can insert their own weekly goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own weekly goals" ON public.weekly_goals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: course_modules Users can update modules of their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update modules of their courses" ON public.course_modules FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = course_modules.course_id) AND (courses.user_id = auth.uid())))));


--
-- Name: addiction_profiles Users can update their own addiction profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own addiction profile" ON public.addiction_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: addiction_checkins Users can update their own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own checkins" ON public.addiction_checkins FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: clean_streaks Users can update their own clean streaks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own clean streaks" ON public.clean_streaks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: courses Users can update their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own courses" ON public.courses FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: daily_study_progress Users can update their own daily progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own daily progress" ON public.daily_study_progress FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: focus_sessions Users can update their own focus sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own focus sessions" ON public.focus_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: impulse_logs Users can update their own impulse logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own impulse logs" ON public.impulse_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: study_notes Users can update their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notes" ON public.study_notes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: study_plan_courses Users can update their own plan courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own plan courses" ON public.study_plan_courses FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.study_plans
  WHERE ((study_plans.id = study_plan_courses.study_plan_id) AND (study_plans.user_id = auth.uid())))));


--
-- Name: study_plans Users can update their own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own plans" ON public.study_plans FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: recovery_goals Users can update their own recovery goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own recovery goals" ON public.recovery_goals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: relapses Users can update their own relapses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own relapses" ON public.relapses FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tasks Users can update their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_achievements Users can update their own user achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own user achievements" ON public.user_achievements FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: weekly_goals Users can update their own weekly goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own weekly goals" ON public.weekly_goals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: course_modules Users can view modules of their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view modules of their courses" ON public.course_modules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = course_modules.course_id) AND (courses.user_id = auth.uid())))));


--
-- Name: user_achievements Users can view their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: addiction_profiles Users can view their own addiction profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own addiction profile" ON public.addiction_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: addiction_checkins Users can view their own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own checkins" ON public.addiction_checkins FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: clean_streaks Users can view their own clean streaks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own clean streaks" ON public.clean_streaks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: courses Users can view their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own courses" ON public.courses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_study_progress Users can view their own daily progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own daily progress" ON public.daily_study_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: focus_sessions Users can view their own focus sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own focus sessions" ON public.focus_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: impulse_logs Users can view their own impulse logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own impulse logs" ON public.impulse_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: study_notes Users can view their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notes" ON public.study_notes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: study_plan_courses Users can view their own plan courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own plan courses" ON public.study_plan_courses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.study_plans
  WHERE ((study_plans.id = study_plan_courses.study_plan_id) AND (study_plans.user_id = auth.uid())))));


--
-- Name: study_plans Users can view their own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own plans" ON public.study_plans FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: recovery_goals Users can view their own recovery goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recovery goals" ON public.recovery_goals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: relapses Users can view their own relapses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own relapses" ON public.relapses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tasks Users can view their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: weekly_goals Users can view their own weekly goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own weekly goals" ON public.weekly_goals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: addiction_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addiction_checkins ENABLE ROW LEVEL SECURITY;

--
-- Name: addiction_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addiction_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: clean_streaks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clean_streaks ENABLE ROW LEVEL SECURITY;

--
-- Name: course_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_study_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_study_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: focus_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: impulse_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.impulse_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: recovery_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recovery_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: relapses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.relapses ENABLE ROW LEVEL SECURITY;

--
-- Name: study_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: study_plan_courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_plan_courses ENABLE ROW LEVEL SECURITY;

--
-- Name: study_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: weekly_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;