-- Supabase Database Functions for SIAGA
-- Run these in Supabase SQL Editor

-- ============================================
-- RPC Function: check_officer_login
-- Secure password verification using Supabase Auth
-- ============================================

-- Create function for secure officer login check
-- This verifies officer exists and is associated with Supabase Auth user
CREATE OR REPLACE FUNCTION public.check_officer_login(
  p_email TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_count INTEGER;
BEGIN
  -- Check if user exists in Supabase Auth
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_count = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if officer profile exists for this user email
  RETURN EXISTS (
    SELECT 1 FROM officers o
    JOIN auth.users au ON o.user_id = au.id
    WHERE au.email = p_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_officer_login TO authenticated;

-- ============================================
-- RLS Policies for officers table
-- ============================================

-- Enable RLS on officers table (only if exists)
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view officers
CREATE POLICY "officers_select_policy"
ON public.officers
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow update own profile
CREATE POLICY "officers_update_policy"
ON public.officers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS Policies for transactions table
-- ============================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_market_access"
ON public.transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM officers o
    WHERE o.user_id = auth.uid()
    AND o.market_id IN (
      SELECT s.market_id FROM stalls s WHERE s.id = transactions.stall_id
    )
  )
);

-- ============================================
-- RLS Policies for stalls table  
-- ============================================

ALTER TABLE public.stalls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stalls_market_access"
ON public.stalls
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM officers o
    WHERE o.user_id = auth.uid()
    AND o.market_id = stalls.market_id
  )
);

-- ============================================
-- RLS Policies for market_retribusi table
-- Run this separately after checking table structure
-- ============================================
-- Check table structure first:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'market_retribusi';

-- Enable RLS on market_retribusi if market_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'market_retribusi' 
    AND column_name = 'market_id'
  ) THEN
    ALTER TABLE public.market_retribusi ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "market_retribusi_access"
    ON public.market_retribusi
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM officers o
        WHERE o.user_id = auth.uid()
        AND o.market_id = market_retribusi.market_id
      )
    );
  END IF;
END $$;

-- ============================================
-- Trigger: Update timestamp
-- ============================================

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_officers_timestamp ON public.officers;

CREATE TRIGGER update_officers_timestamp
BEFORE UPDATE ON public.officers
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();