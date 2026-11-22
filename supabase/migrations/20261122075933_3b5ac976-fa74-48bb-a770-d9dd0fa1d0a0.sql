DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
REVOKE SELECT ON public.app_settings FROM anon;

CREATE POLICY "Developers can read app settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- A página de login só precisa saber se o cadastro público está aberto.
CREATE OR REPLACE FUNCTION public.is_public_signup_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT s.public_signup_enabled FROM public.app_settings s WHERE s.id), false)
$$;

REVOKE ALL ON FUNCTION public.is_public_signup_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_signup_enabled() TO anon, authenticated;