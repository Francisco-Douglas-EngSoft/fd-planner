CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  public_signup_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.app_settings (id, public_signup_enabled) VALUES (true, false)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Developers can update app settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bloqueio do cadastro público no servidor: com o cadastro fechado, só entram
-- contas criadas por um Desenvolvedor (app_metadata.created_by = 'developer',
-- que só o servidor consegue definir).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT COALESCE((SELECT s.public_signup_enabled FROM public.app_settings s WHERE s.id), false)
     AND COALESCE(NEW.raw_app_meta_data ->> 'created_by', '') <> 'developer' THEN
    RAISE EXCEPTION 'Cadastro público desativado' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$function$;