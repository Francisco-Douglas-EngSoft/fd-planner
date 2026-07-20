
GRANT DELETE ON public.user_achievements TO authenticated;
DROP POLICY IF EXISTS "Users can delete their own achievements" ON public.user_achievements;
CREATE POLICY "Users can delete their own achievements"
ON public.user_achievements
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
