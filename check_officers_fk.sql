-- Check officers table FK constraints
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
    AND tc.table_name = 'officers';

-- Check user_roles user_id constraint
-- Jika error "user_roles_user_id_fkey" muncul, berarti ada trigger atau check constraint
-- Cek constraint lain:
SELECT
    tc.constraint_name,
    tc.table_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'user_roles';

-- Solusi: Jika user_id FK ke officers, kita perlu drop dulu
-- ALTER TABLE user_roles DROP CONSTRAINT user_roles_user_id_fkey;
-- Kecuali jika tabel officers memang diperlukan