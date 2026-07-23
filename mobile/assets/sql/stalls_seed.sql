-- Seed stalls for market_id = 1 with 20 stalls per sector
-- Using ON CONFLICT to avoid duplicate code errors

-- Sektor 1: 20 stalls (SEC001-LP1 to SEC001-LP20)
INSERT INTO public.stalls (market_id, sector_id, owner_id, code, number, qr_code, status, created_at, updated_at) VALUES
(1, 1, 2, 'SEC001-LP1', '001', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 3, 'SEC001-LP2', '002', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 4, 'SEC001-LP3', '003', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 5, 'SEC001-LP4', '004', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 6, 'SEC001-LP5', '005', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 7, 'SEC001-LP6', '006', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 8, 'SEC001-LP7', '007', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 9, 'SEC001-LP8', '008', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 10, 'SEC001-LP9', '009', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 11, 'SEC001-LP10', '010', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 12, 'SEC001-LP11', '011', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 13, 'SEC001-LP12', '012', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 14, 'SEC001-LP13', '013', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 15, 'SEC001-LP14', '014', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 16, 'SEC001-LP15', '015', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 17, 'SEC001-LP16', '016', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 18, 'SEC001-LP17', '017', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 19, 'SEC001-LP18', '018', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 20, 'SEC001-LP19', '019', NULL, 'AKTIF', NOW(), NOW()),
(1, 1, 21, 'SEC001-LP20', '020', NULL, 'AKTIF', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Sektor 2: 20 stalls (SEC002-LP1 to SEC002-LP20)
INSERT INTO public.stalls (market_id, sector_id, owner_id, code, number, qr_code, status, created_at, updated_at) VALUES
(1, 2, 22, 'SEC002-LP1', '001', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 23, 'SEC002-LP2', '002', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 24, 'SEC002-LP3', '003', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 25, 'SEC002-LP4', '004', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 26, 'SEC002-LP5', '005', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 27, 'SEC002-LP6', '006', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 28, 'SEC002-LP7', '007', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 29, 'SEC002-LP8', '008', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 30, 'SEC002-LP9', '009', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 31, 'SEC002-LP10', '010', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 32, 'SEC002-LP11', '011', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 33, 'SEC002-LP12', '012', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 34, 'SEC002-LP13', '013', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 35, 'SEC002-LP14', '014', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 36, 'SEC002-LP15', '015', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 37, 'SEC002-LP16', '016', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 38, 'SEC002-LP17', '017', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 39, 'SEC002-LP18', '018', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 40, 'SEC002-LP19', '019', NULL, 'AKTIF', NOW(), NOW()),
(1, 2, 41, 'SEC002-LP20', '020', NULL, 'AKTIF', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Sektor 3: 20 stalls (SEC003-LP1 to SEC003-LP20)
INSERT INTO public.stalls (market_id, sector_id, owner_id, code, number, qr_code, status, created_at, updated_at) VALUES
(1, 3, 42, 'SEC003-LP1', '001', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 43, 'SEC003-LP2', '002', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 44, 'SEC003-LP3', '003', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 45, 'SEC003-LP4', '004', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 46, 'SEC003-LP5', '005', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 47, 'SEC003-LP6', '006', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 48, 'SEC003-LP7', '007', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 49, 'SEC003-LP8', '008', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 50, 'SEC003-LP9', '009', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 51, 'SEC003-LP10', '010', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 52, 'SEC003-LP11', '011', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 53, 'SEC003-LP12', '012', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 54, 'SEC003-LP13', '013', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 55, 'SEC003-LP14', '014', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 56, 'SEC003-LP15', '015', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 57, 'SEC003-LP16', '016', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 58, 'SEC003-LP17', '017', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 59, 'SEC003-LP18', '018', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 60, 'SEC003-LP19', '019', NULL, 'AKTIF', NOW(), NOW()),
(1, 3, 61, 'SEC003-LP20', '020', NULL, 'AKTIF', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;