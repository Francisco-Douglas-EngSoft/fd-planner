-- Add order_index column to user_projects table for drag and drop ordering
ALTER TABLE public.user_projects 
ADD COLUMN order_index integer DEFAULT 0;