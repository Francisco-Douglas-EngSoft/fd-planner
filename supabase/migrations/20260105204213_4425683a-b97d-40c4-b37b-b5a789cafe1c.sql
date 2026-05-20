-- Add review fields to course_modules
ALTER TABLE public.course_modules 
ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS review_date date,
ADD COLUMN IF NOT EXISTS review_notes text,
ADD COLUMN IF NOT EXISTS last_reviewed_at timestamp with time zone;

-- Create index for efficient querying of modules needing review
CREATE INDEX IF NOT EXISTS idx_course_modules_needs_review 
ON public.course_modules (needs_review) WHERE needs_review = true;