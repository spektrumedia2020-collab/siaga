-- FINAL FK FIX untuk SIAGA Project
-- Jalankan di Supabase SQL Editor

-- 1. Check semua constraints di tabel officers
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'officers';

-- 2. Solusi: Jika officers.user_id FK ke user_roles.user_id, drop constraint
-- ALTER TABLE officers DROP CONSTRAINT IF EXISTS officers_user_id_fkey;

-- 3. Atau ubah FK ke auth.users
-- ALTER TABLE officers DROP CONSTRAINT IF EXISTS officers_user_id_fkey;
-- ALTER TABLE officers ADD CONSTRAINT officers_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- 4. Alternatif: Buat user di officers juga setelah create di auth
-- Ini sudah dihandle di routes/users.ts dengan update officers