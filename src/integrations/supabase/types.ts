export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      academic_events: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string | null
          grade: number | null
          id: string
          is_completed: boolean
          priority: string | null
          study_plan_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string | null
          grade?: number | null
          id?: string
          is_completed?: boolean
          priority?: string | null
          study_plan_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string | null
          grade?: number | null
          id?: string
          is_completed?: boolean
          priority?: string | null
          study_plan_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          experience_reward: number
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          experience_reward?: number
          icon?: string
          id?: string
          name: string
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          experience_reward?: number
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      addiction_checkins: {
        Row: {
          check_date: string
          created_at: string
          id: string
          impulses_count: number
          mood: string | null
          notes: string | null
          relapses_count: number
          resistances_count: number
          self_control_score: number | null
          user_id: string
        }
        Insert: {
          check_date?: string
          created_at?: string
          id?: string
          impulses_count?: number
          mood?: string | null
          notes?: string | null
          relapses_count?: number
          resistances_count?: number
          self_control_score?: number | null
          user_id: string
        }
        Update: {
          check_date?: string
          created_at?: string
          id?: string
          impulses_count?: number
          mood?: string | null
          notes?: string | null
          relapses_count?: number
          resistances_count?: number
          self_control_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      addiction_profiles: {
        Row: {
          addiction_types: string[]
          associated_emotions: string[]
          created_at: string
          critical_hours: string[]
          dependency_level: number
          id: string
          onboarding_completed: boolean
          study_impact_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          addiction_types?: string[]
          associated_emotions?: string[]
          created_at?: string
          critical_hours?: string[]
          dependency_level?: number
          id?: string
          onboarding_completed?: boolean
          study_impact_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          addiction_types?: string[]
          associated_emotions?: string[]
          created_at?: string
          critical_hours?: string[]
          dependency_level?: number
          id?: string
          onboarding_completed?: boolean
          study_impact_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clean_streaks: {
        Row: {
          addiction_type: string
          created_at: string
          current_streak: number
          id: string
          last_clean_date: string
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          addiction_type: string
          created_at?: string
          current_streak?: number
          id?: string
          last_clean_date?: string
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          addiction_type?: string
          created_at?: string
          current_streak?: number
          id?: string
          last_clean_date?: string
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          estimated_minutes: number | null
          hours: number
          id: string
          is_completed: boolean
          is_parent: boolean | null
          last_reviewed_at: string | null
          name: string
          needs_review: boolean | null
          notes: string | null
          order_index: number | null
          review_date: string | null
          review_notes: string | null
          sequence_order: number
          weight_color: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          estimated_minutes?: number | null
          hours?: number
          id?: string
          is_completed?: boolean
          is_parent?: boolean | null
          last_reviewed_at?: string | null
          name: string
          needs_review?: boolean | null
          notes?: string | null
          order_index?: number | null
          review_date?: string | null
          review_notes?: string | null
          sequence_order?: number
          weight_color?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          estimated_minutes?: number | null
          hours?: number
          id?: string
          is_completed?: boolean
          is_parent?: boolean | null
          last_reviewed_at?: string | null
          name?: string
          needs_review?: boolean | null
          notes?: string | null
          order_index?: number | null
          review_date?: string | null
          review_notes?: string | null
          sequence_order?: number
          weight_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_submodules: {
        Row: {
          completed_at: string | null
          created_at: string
          hours: number | null
          id: string
          is_completed: boolean
          module_id: string
          name: string
          order_index: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          hours?: number | null
          id?: string
          is_completed?: boolean
          module_id: string
          name: string
          order_index?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          hours?: number | null
          id?: string
          is_completed?: boolean
          module_id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_submodules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          completed_hours: number
          cover_image_url: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_favorite: boolean
          name: string
          start_date: string | null
          status: string | null
          total_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_hours?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          start_date?: string | null
          status?: string | null
          total_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_hours?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          start_date?: string | null
          status?: string | null
          total_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_study_progress: {
        Row: {
          course_id: string | null
          created_at: string
          hours_studied: number
          id: string
          notes: string | null
          study_date: string
          study_plan_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          hours_studied?: number
          id?: string
          notes?: string | null
          study_date: string
          study_plan_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          hours_studied?: number
          id?: string
          notes?: string | null
          study_date?: string
          study_plan_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_study_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_study_progress_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          completed_at: string
          course_id: string | null
          duration_minutes: number
          id: string
          module_id: string | null
          mood: string | null
          notes: string | null
          session_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id?: string | null
          duration_minutes?: number
          id?: string
          module_id?: string | null
          mood?: string | null
          notes?: string | null
          session_type?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string | null
          duration_minutes?: number
          id?: string
          module_id?: string | null
          mood?: string | null
          notes?: string | null
          session_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      impulse_logs: {
        Row: {
          created_at: string
          id: string
          intensity: number | null
          occurred_during_study: boolean | null
          resistance_technique: string | null
          resisted: boolean
          trigger_context: string | null
          trigger_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intensity?: number | null
          occurred_during_study?: boolean | null
          resistance_technique?: string | null
          resisted?: boolean
          trigger_context?: string | null
          trigger_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intensity?: number | null
          occurred_during_study?: boolean | null
          resistance_technique?: string | null
          resisted?: boolean
          trigger_context?: string | null
          trigger_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_goals: {
        Row: {
          created_at: string
          current_value: number
          goal_type: string
          id: string
          is_completed: boolean
          month_end: string
          month_start: string
          period_type: string
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          goal_type?: string
          id?: string
          is_completed?: boolean
          month_end: string
          month_start: string
          period_type?: string
          target_value?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          goal_type?: string
          id?: string
          is_completed?: boolean
          month_end?: string
          month_start?: string
          period_type?: string
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          experience_points: number
          full_name: string | null
          id: string
          last_study_date: string | null
          level: number | null
          streak_days: number | null
          study_hours_goal: number
          total_study_hours: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_points?: number
          full_name?: string | null
          id: string
          last_study_date?: string | null
          level?: number | null
          streak_days?: number | null
          study_hours_goal?: number
          total_study_hours?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_points?: number
          full_name?: string | null
          id?: string
          last_study_date?: string | null
          level?: number | null
          streak_days?: number | null
          study_hours_goal?: number
          total_study_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      recovery_goals: {
        Row: {
          created_at: string
          current_value: number
          goal_type: string
          id: string
          is_completed: boolean
          start_date: string
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          goal_type?: string
          id?: string
          is_completed?: boolean
          start_date?: string
          target_value?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          goal_type?: string
          id?: string
          is_completed?: boolean
          start_date?: string
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      relapses: {
        Row: {
          addiction_type: string
          created_at: string
          id: string
          lessons_learned: string | null
          returned_to_study: boolean | null
          trigger_identified: string | null
          user_id: string
        }
        Insert: {
          addiction_type: string
          created_at?: string
          id?: string
          lessons_learned?: string | null
          returned_to_study?: boolean | null
          trigger_identified?: string | null
          user_id: string
        }
        Update: {
          addiction_type?: string
          created_at?: string
          id?: string
          lessons_learned?: string | null
          returned_to_study?: boolean | null
          trigger_identified?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_notes: {
        Row: {
          content: string | null
          course_id: string | null
          created_at: string
          id: string
          mood: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          mood?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          mood?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_courses: {
        Row: {
          allocated_hours: number
          completed_at: string | null
          course_id: string
          created_at: string
          custom_daily_hours: number | null
          id: string
          is_completed: boolean
          is_fixed: boolean
          sequence_order: number
          study_days: string[] | null
          study_plan_id: string
          weekly_goal_hours: number | null
        }
        Insert: {
          allocated_hours?: number
          completed_at?: string | null
          course_id: string
          created_at?: string
          custom_daily_hours?: number | null
          id?: string
          is_completed?: boolean
          is_fixed?: boolean
          sequence_order?: number
          study_days?: string[] | null
          study_plan_id: string
          weekly_goal_hours?: number | null
        }
        Update: {
          allocated_hours?: number
          completed_at?: string | null
          course_id?: string
          created_at?: string
          custom_daily_hours?: number | null
          id?: string
          is_completed?: boolean
          is_fixed?: boolean
          sequence_order?: number
          study_days?: string[] | null
          study_plan_id?: string
          weekly_goal_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_courses_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_modules: {
        Row: {
          allocated_hours: number | null
          course_id: string | null
          created_at: string
          custom_daily_hours: number | null
          daily_hours: number | null
          day_id: string | null
          id: string
          is_completed: boolean
          module_hours: number
          module_id: string | null
          module_name: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          sequence_order: number
          study_plan_id: string
          time_slot: string | null
          weekly_goal_hours: number | null
        }
        Insert: {
          allocated_hours?: number | null
          course_id?: string | null
          created_at?: string
          custom_daily_hours?: number | null
          daily_hours?: number | null
          day_id?: string | null
          id?: string
          is_completed?: boolean
          module_hours?: number
          module_id?: string | null
          module_name?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          sequence_order?: number
          study_plan_id: string
          time_slot?: string | null
          weekly_goal_hours?: number | null
        }
        Update: {
          allocated_hours?: number | null
          course_id?: string | null
          created_at?: string
          custom_daily_hours?: number | null
          daily_hours?: number | null
          day_id?: string | null
          id?: string
          is_completed?: boolean
          module_hours?: number
          module_id?: string | null
          module_name?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          sequence_order?: number
          study_plan_id?: string
          time_slot?: string | null
          weekly_goal_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_modules_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_time_blocks: {
        Row: {
          block_type: string
          course_id: string | null
          created_at: string
          day_of_week: string
          end_time: string
          id: string
          notes: string | null
          start_time: string
          study_plan_id: string
          title: string | null
        }
        Insert: {
          block_type?: string
          course_id?: string | null
          created_at?: string
          day_of_week: string
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          study_plan_id: string
          title?: string | null
        }
        Update: {
          block_type?: string
          course_id?: string | null
          created_at?: string
          day_of_week?: string
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          study_plan_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_time_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_time_blocks_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          academic_period_end: string | null
          academic_period_start: string | null
          color: string | null
          created_at: string
          daily_hours: number
          description: string | null
          effective_start_date: string | null
          end_date: string
          hours_per_discipline: number | null
          id: string
          max_daily_hours: number | null
          min_daily_hours: number | null
          name: string
          planning_category: string | null
          planning_type: string
          semester: string | null
          start_date: string
          study_days: string[]
          total_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_period_end?: string | null
          academic_period_start?: string | null
          color?: string | null
          created_at?: string
          daily_hours?: number
          description?: string | null
          effective_start_date?: string | null
          end_date: string
          hours_per_discipline?: number | null
          id?: string
          max_daily_hours?: number | null
          min_daily_hours?: number | null
          name: string
          planning_category?: string | null
          planning_type?: string
          semester?: string | null
          start_date: string
          study_days?: string[]
          total_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_period_end?: string | null
          academic_period_start?: string | null
          color?: string | null
          created_at?: string
          daily_hours?: number
          description?: string | null
          effective_start_date?: string | null
          end_date?: string
          hours_per_discipline?: number | null
          id?: string
          max_daily_hours?: number | null
          min_daily_hours?: number | null
          name?: string
          planning_category?: string | null
          planning_type?: string
          semester?: string | null
          start_date?: string
          study_days?: string[]
          total_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_reminders: {
        Row: {
          created_at: string
          days_of_week: string[] | null
          id: string
          is_active: boolean
          message: string | null
          reminder_time: string
          reminder_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: string[] | null
          id?: string
          is_active?: boolean
          message?: string | null
          reminder_time: string
          reminder_type?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: string[] | null
          id?: string
          is_active?: boolean
          message?: string | null
          reminder_time?: string
          reminder_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          course_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_certificates: {
        Row: {
          certificate_url: string | null
          course_id: string | null
          created_at: string
          credential_url: string | null
          id: string
          issue_date: string | null
          issued_at: string
          issuer: string | null
          title: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          course_id?: string | null
          created_at?: string
          credential_url?: string | null
          id?: string
          issue_date?: string | null
          issued_at?: string
          issuer?: string | null
          title: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          course_id?: string | null
          created_at?: string
          credential_url?: string | null
          id?: string
          issue_date?: string | null
          issued_at?: string
          issuer?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_date: string
          consent_given: boolean
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          privacy_policy_version: string
          user_id: string
        }
        Insert: {
          consent_date?: string
          consent_given: boolean
          consent_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          privacy_policy_version: string
          user_id: string
        }
        Update: {
          consent_date?: string
          consent_given?: boolean
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          privacy_policy_version?: string
          user_id?: string
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          order_index: number
          project_url: string | null
          technologies: string[]
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          order_index?: number
          project_url?: string | null
          technologies?: string[]
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          order_index?: number
          project_url?: string | null
          technologies?: string[]
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_resume: {
        Row: {
          created_at: string
          education: Json | null
          experience: string | null
          headline: string | null
          id: string
          skills: string | null
          summary: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          education?: Json | null
          experience?: string | null
          headline?: string | null
          id?: string
          skills?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          education?: Json | null
          experience?: string | null
          headline?: string | null
          id?: string
          skills?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_social_links: {
        Row: {
          created_at: string
          github: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          platform: string | null
          portfolio: string | null
          twitter: string | null
          url: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          github?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          platform?: string | null
          portfolio?: string | null
          twitter?: string | null
          url?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          github?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          platform?: string | null
          portfolio?: string | null
          twitter?: string | null
          url?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          created_at: string
          current_value: number
          goal_type: string
          id: string
          is_completed: boolean
          target_value: number
          title: string
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          goal_type?: string
          id?: string
          is_completed?: boolean
          target_value?: number
          title: string
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          current_value?: number
          goal_type?: string
          id?: string
          is_completed?: boolean
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
