-- Add missing columns to courses table that the frontend expects
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cover_image_url text;