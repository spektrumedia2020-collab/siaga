-- Seed retribution_types with standard market retribution categories
INSERT INTO public.retribution_types (code, name, category, unit, notes, created_at, updated_at) VALUES
('2-005-79', 'Jaspro 2026', 'Retribusi Pedagang', 'Bulanan', 'Bergantung jenis tempat usaha', NOW(), NOW()),
('2-005-80', 'Harian', 'Retribusi Pedagang', 'Harian', 'Per lapak/pedagang per hari', NOW(), NOW()),
('2-005-84', 'Daging', 'Komoditas', 'Harian / per meja', 'Per meja daging atau fasilitas daging', NOW(), NOW()),
('2-005-85', 'Rempah / Tepung / Kelapa', 'Komoditas', 'Harian', 'Per lapak komoditas', NOW(), NOW()),
('2-005-86', 'Cabut Bulu Ayam', 'Fasilitas Pasar', 'Per penggunaan', 'Per penggunaan fasilitas cabut bulu ayam', NOW(), NOW()),
('2-005-87', 'Mobil Box', 'Jasa Kendaraan', 'Per kendaraan', 'Per kendaraan masuk', NOW(), NOW()),
('2-005-88', 'Parkir', 'Jasa Kendaraan', 'Per kendaraan', 'Motor, mobil, atau kendaraan lain', NOW(), NOW()),
('2-005-89', 'Bongkaran', 'Jasa Logistik', 'Per kegiatan', 'Bongkar muat barang', NOW(), NOW()),
('2-005-90', 'Rekomendasi', 'Administrasi', 'Per dokumen', 'Surat rekomendasi', NOW(), NOW()),
('2-005-91', 'Kartu Pedagang', 'Administrasi', 'Per kartu', 'Penerbitan/perpanjangan kartu', NOW(), NOW()),
('2-005-92', 'BBN', 'Pendapatan Lain', 'Sesuai ketentuan', 'Per transaksi', NOW(), NOW()),
('2-005-93', 'Izin Pemasangan Listrik & PDAM', 'Perizinan', 'Per izin', 'Permohonan pemasangan utilitas', NOW(), NOW()),
('2-005-94', 'Penerimaan Lain-lain', 'Lain-lain', 'Variatif', 'Sesuai jenis penerimaan', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Seed retribution_rates (sample prices for market_id=1)
-- Adjust amounts as needed per market/stall
INSERT INTO public.retribution_rates (types_id, market_id, stall_id, amount, created_at, updated_at)
SELECT t.id, 1, NULL, 50000, NOW(), NOW()
FROM public.retribution_types t
WHERE t.code = '2-005-79'
ON CONFLICT DO NOTHING;

INSERT INTO public.retribution_rates (types_id, market_id, stall_id, amount, created_at, updated_at)
SELECT t.id, 1, NULL, 5000, NOW(), NOW()
FROM public.retribution_types t
WHERE t.code = '2-005-80'
ON CONFLICT DO NOTHING;