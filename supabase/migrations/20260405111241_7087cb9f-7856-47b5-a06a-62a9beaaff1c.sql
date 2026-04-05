
-- Add category column
ALTER TABLE public.apartments ADD COLUMN category text DEFAULT 'micro';

-- Remove size_sqm column
ALTER TABLE public.apartments DROP COLUMN IF EXISTS size_sqm;
