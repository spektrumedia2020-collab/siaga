-- ============================================
-- DATABASE CLEANUP: Remove duplicate/legacy tables
-- ============================================
-- Canonical tables to KEEP:
--   users, markets, stalls, market_sectors, 
--   stall_owners, retribution_types, transactions, attendance
--
-- Legacy tables to DROP:
--   lapak (use stalls)
--   pemilik_lapak (use stall_owners)
--   officers (use users)
--   market_retribusi (use retribution_types)
--   sectors (use market_sectors)
-- ============================================

-- Step 1: Migrate any remaining data from legacy tables 
-- if needed (uncomment if data exists)

-- Migrate from pemilik_lapak to stall_owners
-- INSERT INTO stall_owners (id, nik, name, address, phone)
-- SELECT id_pemilik, nik, nama_pemilik, alamat_pemilik, no_telp
-- FROM pemilik_lapak
-- ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop legacy tables

-- Drop sectors table (use market_sectors instead)
DROP TABLE IF EXISTS public.sectors CASCADE;

-- Drop pemilik_lapak table (use stall_owners instead)
DROP TABLE IF EXISTS public.pemilik_lapak CASCADE;

-- Drop lapak table (use stalls instead)
DROP TABLE IF EXISTS public.lapak CASCADE;

-- Drop market_retribusi table (use retribution_types instead)
DROP TABLE IF EXISTS public.market_retribusi CASCADE;

-- Drop officers table (use users instead)
DROP TABLE IF EXISTS public.officers CASCADE;

-- Step 3: Verify cleanup
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;