-- ============ fcm_tokens ============
CREATE TABLE public.fcm_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  user_agent TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fcm_tokens TO authenticated;
GRANT ALL ON public.fcm_tokens TO service_role;

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own fcm tokens"
  ON public.fcm_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_fcm_tokens_updated_at
  BEFORE UPDATE ON public.fcm_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ notification_preferences ============
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  study_reminders BOOLEAN NOT NULL DEFAULT true,
  task_reminders BOOLEAN NOT NULL DEFAULT true,
  antivicio_alerts BOOLEAN NOT NULL DEFAULT true,
  admin_messages BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notification preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ scheduled_notifications ============
CREATE TABLE public.scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  send_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX idx_scheduled_notifications_pending
  ON public.scheduled_notifications (send_at)
  WHERE sent_at IS NULL;

GRANT SELECT ON public.scheduled_notifications TO authenticated;
GRANT ALL ON public.scheduled_notifications TO service_role;

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own scheduled notifications"
  ON public.scheduled_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_scheduled_notifications_updated_at
  BEFORE UPDATE ON public.scheduled_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();