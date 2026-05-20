-- Create submodules table
CREATE TABLE public.course_submodules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0.5,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_submodules ENABLE ROW LEVEL SECURITY;

-- Create policies for submodules (through parent module -> course -> user)
CREATE POLICY "Users can view submodules of their modules"
ON public.course_submodules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = course_submodules.module_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert submodules to their modules"
ON public.course_submodules
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = course_submodules.module_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update submodules of their modules"
ON public.course_submodules
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = course_submodules.module_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete submodules of their modules"
ON public.course_submodules
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = course_submodules.module_id
    AND c.user_id = auth.uid()
  )
);

-- Add parent_module_id to course_modules for hierarchy tracking (optional)
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false;