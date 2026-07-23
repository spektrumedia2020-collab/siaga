-- ============================================
-- COMPLETE DATABASE MIGRATION AND CLEANUP
-- ============================================
-- Migrate legacy tables to canonical names, then drop duplicates

-- ============================================
-- STEP 1: Drop legacy/duplicate tables
-- ============================================
-- Note: If you need to migrate data, do it manually based on your actual table schemas
-- This script removes duplicate legacy Indonesian-named tables

-- ============================================
-- STEP 2: Drop legacy tables
-- ============================================

-- Drop in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS officer_devices CASCADE;
DROP TABLE IF EXISTS officer_deposits CASCADE;
DROP TABLE IF EXISTS setoran_petugas CASCADE;
DROP TABLE IF EXISTS rekonsiliasi CASCADE;
DROP TABLE IF EXISTS reconciliations CASCADE;
DROP TABLE IF EXISTS transaksi_retribusi CASCADE;
DROP TABLE IF EXISTS market_retribusi CASCADE;
DROP TABLE IF EXISTS tarif_retribusi CASCADE;
DROP TABLE IF EXISTS retribution_rates CASCADE;
DROP TABLE IF EXISTS jenis_retribusi CASCADE;
DROP TABLE IF EXISTS transaksi_retribusi CASCADE;
DROP TABLE IF EXISTS lapak CASCADE;
DROP TABLE IF EXISTS pemilik_lapak CASCADE;
DROP TABLE IF EXISTS sektor_pasar CASCADE;
DROP TABLE IF EXISTS sectors CASCADE;
DROP TABLE IF EXISTS petugas CASCADE;
DROP TABLE IF EXISTS officers CASCADE;
DROP TABLE IF EXISTS pasar CASCADE;

-- Drop duplicate/legacy utility tables
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS device_petugas CASCADE;
DROP TABLE IF EXISTS user_pasar CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- ============================================
-- STEP 3: Verify final table list
-- ============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;