-- Fix RLS Policy for transactions table
-- Run this in Supabase SQL Editor

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;

-- Create policy to allow authenticated users to insert transactions
CREATE POLICY "transactions_insert_own"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow users to select their own transactions
CREATE POLICY "transactions_select_own"
ON public.transactions
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow users to update their own transactions
CREATE POLICY "transactions_update_own"
ON public.transactions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO anon;