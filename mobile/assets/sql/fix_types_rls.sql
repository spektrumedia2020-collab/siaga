-- Fix RLS for retribution_types so Flutter app can read it

-- Enable RLS if not already enabled
ALTER TABLE public.retribution_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "retribution_types_select" ON public.retribution_types;
DROP POLICY IF EXISTS "retribution_types_insert" ON public.retribution_types;

-- Allow all authenticated users to read retribution_types
CREATE POLICY "retribution_types_select"
ON public.retribution_types
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert retribution_types
CREATE POLICY "retribution_types_insert"
ON public.retribution_types
FOR INSERT
TO authenticated
WITH CHECK (true);