-- Add missing columns to retribution_types table
ALTER TABLE public.retribution_types 
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS market_id BIGINT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records with category and unit based on code
UPDATE public.retribution_types SET
  category = CASE code
    WHEN '2-005-79' THEN 'Retribusi Pedagang'
    WHEN '2-005-80' THEN 'Retribusi Pedagang'
    WHEN '2-005-84' THEN 'Komoditas'
    WHEN '2-005-85' THEN 'Komoditas'
    WHEN '2-005-86' THEN 'Fasilitas Pasar'
    WHEN '2-005-87' THEN 'Jasa Kendaraan'
    WHEN '2-005-88' THEN 'Jasa Kendaraan'
    WHEN '2-005-89' THEN 'Jasa Logistik'
    WHEN '2-005-90' THEN 'Administrasi'
    WHEN '2-005-91' THEN 'Administrasi'
    WHEN '2-005-92' THEN 'Pendapatan Lain'
    WHEN '2-005-93' THEN 'Perizinan'
    WHEN '2-005-94' THEN 'Lain-lain'
    ELSE category
  END,
  unit = CASE code
    WHEN '2-005-79' THEN 'Bulanan'
    WHEN '2-005-80' THEN 'Harian'
    WHEN '2-005-84' THEN 'Harian / per meja'
    WHEN '2-005-85' THEN 'Harian'
    WHEN '2-005-86' THEN 'Per penggunaan'
    WHEN '2-005-87' THEN 'Per kendaraan'
    WHEN '2-005-88' THEN 'Per kendaraan'
    WHEN '2-005-89' THEN 'Per kegiatan'
    WHEN '2-005-90' THEN 'Per dokumen'
    WHEN '2-005-91' THEN 'Per kartu'
    WHEN '2-005-92' THEN 'Sesuai ketentuan'
    WHEN '2-005-93' THEN 'Per izin'
    WHEN '2-005-94' THEN 'Variatif'
    ELSE unit
  END,
  notes = CASE code
    WHEN '2-005-79' THEN 'Bergantung jenis tempat usaha'
    WHEN '2-005-80' THEN 'Per lapak/pedagang per hari'
    WHEN '2-005-84' THEN 'Per meja daging atau fasilitas daging'
    WHEN '2-005-85' THEN 'Per lapak komoditas'
    WHEN '2-005-86' THEN 'Per penggunaan fasilitas cabut bulu ayam'
    WHEN '2-005-87' THEN 'Per kendaraan masuk'
    WHEN '2-005-88' THEN 'Motor, mobil, atau kendaraan lain'
    WHEN '2-005-89' THEN 'Bongkar muat barang'
    WHEN '2-005-90' THEN 'Surat rekomendasi'
    WHEN '2-005-91' THEN 'Penerbitan/perpanjangan kartu'
    WHEN '2-005-92' THEN 'Per transaksi'
    WHEN '2-005-93' THEN 'Permohonan pemasangan utilitas'
    WHEN '2-005-94' THEN 'Sesuai jenis penerimaan'
    ELSE notes
  END
WHERE code IN (
  '2-005-79', '2-005-80', '2-005-84', '2-005-85', '2-005-86',
  '2-005-87', '2-005-88', '2-005-89', '2-005-90', '2-005-91',
  '2-005-92', '2-005-93', '2-005-94'
);