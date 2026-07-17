export interface RetributionTypeOption {
  id: string
  code: string
  name: string
  category: string
  unit: string
  base_tariff_note?: string
  description?: string
  is_active?: boolean
}

export const DEFAULT_RETRIBUTION_TYPES: RetributionTypeOption[] = [
  { id: '2-005-77', code: '2-005-77', name: 'Jaspro 2019–2024', category: 'Retribusi Pedagang', unit: 'Bulanan', base_tariff_note: 'Bergantung jenis tempat usaha (kios/los/pelataran)', description: 'Retribusi pedagang', is_active: true },
  { id: '2-005-78', code: '2-005-78', name: 'Jaspro 2025', category: 'Retribusi Pedagang', unit: 'Bulanan', base_tariff_note: 'Bergantung jenis tempat usaha', description: 'Retribusi pedagang', is_active: true },
  { id: '2-005-79', code: '2-005-79', name: 'Jaspro 2026', category: 'Retribusi Pedagang', unit: 'Bulanan', base_tariff_note: 'Bergantung jenis tempat usaha', description: 'Retribusi pedagang', is_active: true },
  { id: '2-005-80', code: '2-005-80', name: 'Harian', category: 'Retribusi Pedagang', unit: 'Harian', base_tariff_note: 'Per lapak/pedagang per hari', description: 'Retribusi harian', is_active: true },
  { id: '2-005-84', code: '2-005-84', name: 'Daging', category: 'Komoditas', unit: 'Harian / per meja', base_tariff_note: 'Per meja daging atau fasilitas daging', description: 'Komoditas daging', is_active: true },
  { id: '2-005-85', code: '2-005-85', name: 'Rempah / Tepung / Kelapa', category: 'Komoditas', unit: 'Harian', base_tariff_note: 'Per lapak komoditas', description: 'Komoditas', is_active: true },
  { id: '2-005-86', code: '2-005-86', name: 'Cabut Bulu Ayam', category: 'Fasilitas Pasar', unit: 'Per penggunaan', base_tariff_note: 'Per penggunaan fasilitas cabut bulu ayam', description: 'Fasilitas pasar', is_active: true },
  { id: '2-005-87', code: '2-005-87', name: 'Mobil Box', category: 'Jasa Kendaraan', unit: 'Per kendaraan', base_tariff_note: 'Per kendaraan masuk', description: 'Jasa kendaraan', is_active: true },
  { id: '2-005-88', code: '2-005-88', name: 'Parkir', category: 'Jasa Kendaraan', unit: 'Per kendaraan', base_tariff_note: 'Motor, mobil, atau kendaraan lain', description: 'Jasa kendaraan', is_active: true },
  { id: '2-005-89', code: '2-005-89', name: 'Bongkaran', category: 'Jasa Logistik', unit: 'Per kegiatan', base_tariff_note: 'Bongkar muat barang', description: 'Jasa logistik', is_active: true },
  { id: '2-005-90', code: '2-005-90', name: 'Rekomendasi', category: 'Administrasi', unit: 'Per dokumen', base_tariff_note: 'Surat rekomendasi', description: 'Administrasi', is_active: true },
  { id: '2-005-91', code: '2-005-91', name: 'Kartu Pedagang', category: 'Administrasi', unit: 'Per kartu', base_tariff_note: 'Penerbitan/perpanjangan kartu', description: 'Administrasi', is_active: true },
  { id: '2-005-92', code: '2-005-92', name: 'BBN', category: 'Pendapatan Lain', unit: 'Sesuai ketentuan', base_tariff_note: 'Per transaksi', description: 'Pendapatan lain', is_active: true },
  { id: '2-005-93', code: '2-005-93', name: 'Izin Pemasangan Listrik & PDAM', category: 'Perizinan', unit: 'Per izin', base_tariff_note: 'Permohonan pemasangan utilitas', description: 'Perizinan', is_active: true },
  { id: '2-005-94', code: '2-005-94', name: 'Penerimaan Lain-lain', category: 'Lain-lain', unit: 'Variatif', base_tariff_note: 'Sesuai jenis penerimaan', description: 'Lain-lain', is_active: true }
]
