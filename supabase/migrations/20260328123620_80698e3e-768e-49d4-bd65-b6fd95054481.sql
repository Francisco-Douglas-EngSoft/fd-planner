
-- Fix contact_messages: allow anon inserts (public contact form) but scope properly
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Public can insert contact messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
