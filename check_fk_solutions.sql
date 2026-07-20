-- Solusi untuk FK constraint user_roles_user_id_fkey
-- Jalankan query ini di Supabase SQL Editor

-- 1. Check current FK constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'user_roles';

-- 2. Check if there's an officers table with user_id

-- 3. Solusi alternatif: Insert langsung via RPC
CREATE OR REPLACE FUNCTION public.create_user_with_role(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_role_id INTEGER,
    p_market_id INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Create user in auth
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
    VALUES (p_email, crypt(p_password, gen_salt('bf')), now(), jsonb_build_object('full_name', p_full_name))
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_user_id;
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'User already exists or failed to create');
    END IF;
    
    -- Insert user_roles
    INSERT INTO user_roles (user_id, role_id, market_id)
    VALUES (v_user_id, p_role_id, p_market_id);
    
    RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.create_user_with_role TO authenticated;