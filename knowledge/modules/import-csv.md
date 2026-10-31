# Modul — Import CSV Data Awal

Path: `src/lib/csvImport*.ts`, `src/pages/ImportDataPage.tsx` · Status: **VERIFIED** · 2026-10-31

Tujuan: migrasi data dari aplikasi lama (berkas Excel/CSV per pasar) ke Supabase tanpa entri manual.
Dipasang sebagai tab admin `#superadmin/import` ("📥 Import Data").

## Berkas

| Berkas | Peran |
|---|---|
| `src/lib/csvImport.ts` | Parser (PapaParse), deteksi baris header, peta kolom, deteksi jenis berkas, derivasi sektor/nomor lapak, spesifikasi jenis retribusi |
| `src/lib/csvImportRunner.ts` | Eksekutor Supabase per jenis (`runMarketImport`, `runStallImport`, `runRateImport`) + gabungan (`runCsvImport`): paginated read, chunked insert, pool update, idempotensi |
| `src/pages/ImportDataPage.tsx` | UI unggah multi-berkas, deteksi jenis otomatis, target pasar per berkas, preview/ringkasan per jenis, unduh CSV gagal |
| `src/pages/ImportDataPage.css` | Gaya kartu unggah, tabel preview, badge status, badge jenis |
| `public/templates/contoh-pasar.csv` | Template CSV terpisah: data pasar |
| `public/templates/contoh-lapak.csv` | Template CSV terpisah: data lapak |
| `public/templates/contoh-tarif.csv` | Template CSV terpisah: tarif retribusi |
| `public/templates/contoh-import-pasar.csv` | Template format gabungan jastem + retribusi harian |
| `public/templates/contoh-import-sewa.csv` | Template format gabungan sewa tahunan + sewa harian |

Semua template ditautkan di halaman import ("Belum punya berkas? Unduh template…")
dan disajikan sebagai berkas statis `/templates/*.csv`.

## Format CSV yang didukung

Ada dua keluarga format. Jenis berkas **dideteksi otomatis** dari kolom yang dikenali
(`detectImportKind`), jadi admin tidak perlu memilih mode.

### A. Berkas terpisah (disarankan untuk data baru)

| Jenis | Header | Perilaku impor |
|---|---|---|
| Pasar (`markets`) | `NO., KODE PASAR, NAMA PASAR, KOTA, ALAMAT PASAR, STATUS` | Upsert pasar per kode (nama/kota/alamat/status diperbarui); tanpa target pasar |
| Lapak (`stalls`) | `NO., KODE PASAR, KODE LAPAK, NOMOR, LOKASI, NAMA PEDAGANG, STATUS` | Pasar dibuat/dicari lewat kode, lalu sektor + pemilik + lapak |
| Tarif (`rates`) | `NO., KODE PASAR, KODE LAPAK, JENIS RETRIBUSI, PERIODE, JUMLAH` | Pasar & lapak **harus sudah ada**; jenis dibuat otomatis bila belum ada; tarif di-upsert |

- Urutan aman: pasar → lapak → tarif. Tombol "Import semua berkas" mengurutkan otomatis.
- `detectImportKind`: kolom nominal tahunan/harian → `combined`; kolom jenis/tarif → `rates`;
  kolom kode lapak → `stalls`; hanya kolom pasar → `markets`.
- Tarif: `PERIODE` (`TAHUN`/`BULAN`/`HARI`/`MINGGU`, atau `tahunan/harian/...`) menentukan `unit`.
  `KODE JENIS` opsional; bila kosong diturunkan `<KODE PASAR>-<SLUG JENIS>` (mis. `MKS-RETRIBUSI-HARIAN`).
  Kategori `SEWA` bila nama memuat `sewa`/`jastem`, selain itu `RETRIBUSI`.
- Duplikat di dalam satu berkas (kode pasar, atau pasangan lapak+jenis tarif) ditandai error dan dilewati.

### B. Format gabungan legacy (tetap didukung)

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
- **Nomor lapak** (`deriveStallNumber`): kolom `NOMOR` eksplisit dipakai apa adanya; untuk NGD ambil
  `No. <n>` dari lokasi, fallback kode legacy; berkas lain memakai lokasi/kode apa adanya.
- **Jenis retribusi** (`retributionTypeSpecs`, khusus gabungan): `JASTEM` → `<KODE>-JASTEM`,
  `RETRIBUSI HARIAN` → `<KODE>-RETRIBUSI-HARIAN`, sedangkan NGD memakai
  `<KODE>-SEWA-TAHUNAN` dan `<KODE>-SEWA-HARIAN` (konsisten dengan `seed_niaga_daya.sql`).
- **Jenis retribusi dari berkas tarif** (`deriveTypeCode`): `<KODE PASAR>-<SLUG JENIS>`.
- Pemilik tanpa nama diberi placeholder `Belum diisi - <kode lapak>`; status kosong → `AKTIF`.

## Idempotensi & batas API

- Kunci unik logis: pasar `lower(code)`, lapak `(market_id, lower(code))`, pemilik nama lowercase, sektor
  `(market_id, lower(name))`, jenis `code` atau `name` per pasar, rate `(stall_id, types_id)`.
- Baca `PAGE_SIZE = 500` (PostgREST membatasi 1000 baris), insert `CHUNK_SIZE = 400`,
  update paralel 8. Bila satu chunk gagal, barisnya dicoba satu per satu.
- Impor ulang berkas yang sama: 0 create / 0 update (diuji dengan klien Supabase palsu,
  termasuk urutan pasar → lapak → tarif).
- `public_token` lapak **tidak** dikirim; diisi default DB (migration 016).
- Impor tarif **tidak** membuat pasar maupun lapak. Bila pasar/lapak belum ada, baris dicatat sebagai
  masalah dan import berhenti dengan pesan jelas.

## Hasil parsing berkas nyata (2026-10-31)

| Berkas | Baris | Sektor | Pemilik | Dilewati |
|---|---|---|---|---|
| Sawah | 262 | 9 | 168 | 0 |
| Panakkukang | 626 | 37 | 460 | 0 |
| Terong | 1814 | 21 | 574 | 0 |
| Niaga Daya | 1396 | 24 | 763 | 0 |

Simulasi impor seluruh berkas: 1.658 lapak, 3.310 rate.

### Verifikasi berkas terpisah (2026-10-31)

| Berkas template | Terdeteksi | Baris | Hasil simulasi |
|---|---|---|---|
| `contoh-pasar.csv` | `markets` | 2 | 2 pasar dibuat |
| `contoh-lapak.csv` | `stalls` | 5 | 2 sektor, 5 pemilik, 5 lapak |
| `contoh-tarif.csv` | `rates` | 8 | 4 jenis, 8 tarif |
| Keempat CSV legacy | `combined` | 262 / 626 / 1814 / 1396 | tetap terbaca, 0 dilewati |

Impor ulang ketiga template menghasilkan 0 create / 0 update. Impor tarif ke pasar yang belum ada
ditolak dengan pesan "Pasar dengan kode … belum ada".

## Known issues

- Tidak ada transaksi klien: impor yang gagal di tengah meninggalkan baris parsial. Karena idempoten,
  cukup jalankan ulang.
- Preview memakai hasil parse di browser; batas ukuran berkas bergantung memori tab.
- `take_screenshot` tidak tersedia pada sesi verifikasi (surface browser tersembunyi) — verifikasi UI
  dilakukan struktural via DOM/snapshot.
