# Modul — Import CSV Data Awal

Path: `src/lib/csvImport*.ts`, `src/pages/ImportDataPage.tsx` · Status: **VERIFIED** · 2026-10-31

Tujuan: migrasi data dari aplikasi lama (berkas Excel/CSV per pasar) ke Supabase tanpa entri manual.
Dipasang sebagai tab admin `#superadmin/import` ("📥 Import Data").

## Berkas

| Berkas | Peran |
|---|---|
| `src/lib/csvImport.ts` | Parser (PapaParse), deteksi baris header, peta kolom, derivasi sektor/nomor lapak, spesifikasi jenis retribusi |
| `src/lib/csvImportRunner.ts` | Eksekutor Supabase: paginated read, chunked insert, pool update, idempotensi |
| `src/pages/ImportDataPage.tsx` | UI unggah multi-berkas, target pasar per berkas, preview, progres, ringkasan, unduh CSV gagal |
| `src/pages/ImportDataPage.css` | Gaya kartu unggah, tabel preview, badge status |
| `public/templates/contoh-import-pasar.csv` | Template format jastem + retribusi harian |
| `public/templates/contoh-import-sewa.csv` | Template format sewa tahunan + sewa harian |

Kedua template ditautkan di halaman import ("Belum punya berkas? Unduh template…")
dan disajikan sebagai berkas statis `/templates/*.csv`.

## Format CSV yang didukung

Header dicari otomatis (skor alias per kolom), jadi baris judul/blank di atas header tidak masalah.

| Sumber | Ciri | Kolom kunci |
|---|---|---|
| Sawah (SWH) | header baris ke-3, sub-header `HARIAN` | `NAMA PASAR`, kolom nama tanpa judul, `KODE LAMA`, `KODE BARU`, `NAMA PEDAGANG`, `JASTEM`, `RETRIBUSI HARIAN`, `STATUS` |
| Panakkukang (PNK) | idem SWH | idem |
| Terong (TRG) | idem, satu kolom kosong di depan | idem |
| Niaga Daya (NGD) | header baris ke-1 | `KODE LAMA` (legacy), kolom lokasi `Blok ...`, `KODE` (kode lapak), `NAMA PEDAGANG`, `SEWA TEMPAT/TAHUN`, `SEWA HARIAN` |

Angka gaya Indonesia diparse dengan membuang semua non-digit (`180,000` → 180000, `2.016.000` → 2016000),
sama seperti SQL impor lama.

## Derivasi

- **Sektor** (`deriveSector`): `NDY.K.X` → `Kios X`; `NDY.R.<roman+letter>` → `Ruko ...`;
  lokasi `Blok ...` dibersihkan dari `No.`; selain itu lokasi apa adanya; kosong → `Tanpa Blok`.
- **Nomor lapak** (`deriveStallNumber`): untuk NGD ambil `No. <n>` dari lokasi, fallback kode legacy;
  berkas lain memakai lokasi/kode apa adanya.
- **Jenis retribusi** (`retributionTypeSpecs`): `JASTEM` → `<KODE>-JASTEM`,
  `RETRIBUSI HARIAN` → `<KODE>-RETRIBUSI-HARIAN`, sedangkan NGD memakai
  `<KODE>-SEWA-TAHUNAN` dan `<KODE>-SEWA-HARIAN` (konsisten dengan `seed_niaga_daya.sql`).
- Pemilik tanpa nama diberi placeholder `Belum diisi - <kode lapak>`; status kosong → `AKTIF`.

## Idempotensi & batas API

- Kunci unik logis: lapak `(market_id, lower(code))`, pemilik nama lowercase, sektor
  `(market_id, lower(name))`, rate `(stall_id, types_id)`.
- Baca `PAGE_SIZE = 500` (PostgREST membatasi 1000 baris), insert `CHUNK_SIZE = 400`,
  update paralel 8. Bila satu chunk gagal, barisnya dicoba satu per satu.
- Impor ulang berkas yang sama: 0 create / 0 update (diuji dengan klien Supabase palsu).
- `public_token` lapak **tidak** dikirim; diisi default DB (migration 016).

## Hasil parsing berkas nyata (2026-10-31)

| Berkas | Baris | Sektor | Pemilik | Dilewati |
|---|---|---|---|---|
| Sawah | 262 | 9 | 168 | 0 |
| Panakkukang | 626 | 37 | 460 | 0 |
| Terong | 1814 | 21 | 574 | 0 |
| Niaga Daya | 1396 | 24 | 763 | 0 |

Simulasi impor seluruh berkas: 1.658 lapak, 3.310 rate.

## Known issues

- Tidak ada transaksi klien: impor yang gagal di tengah meninggalkan baris parsial. Karena idempoten,
  cukup jalankan ulang.
- Preview memakai hasil parse di browser; batas ukuran berkas bergantung memori tab.
- `take_screenshot` tidak tersedia pada sesi verifikasi (surface browser tersembunyi) — verifikasi UI
  dilakukan struktural via DOM/snapshot.
