# ADR-001 — Supabase-first untuk data operasional

- **Status:** Accepted (terverifikasi dari kode; alasan historis dari `AUDIT_REPORT.md`)
- **Tanggal:** 2026-10-25 (dokumentasi); keputusan berlaku sejak audit 23 Agu 2026
- **Konteks:** SIAGA punya tiga jalur potensial ke data: Express, Vercel functions, dan akses langsung Supabase.

## Keputusan

Klien (web & mobile) mengakses Supabase **langsung** dengan anon key + RLS untuk operasi CRUD
operasional. Backend (Express/serverless) hanya dipakai bila membutuhkan service role atau
agregasi lintas tabel yang tidak praktis di klien.

## Alasan

1. Mengurangi lapisan yang harus dijaga dan di-deploy.
2. RLS menjadi satu titik kontrol otorisasi per baris.
3. Mobile butuh akses langsung untuk mode offline + sinkronisasi.
4. `AUDIT_REPORT.md` menyatakan arah "Supabase-first" dan rencana menghapus duplikasi backend.

## Konsekuensi

**Positif**
- Skema & policy DB menjadi kontrak utama (lihat `database/SCHEMA.md`).

**Negatif / risiko**
- Setiap policy RLS yang longgar = lubang keamanan langsung (S-02, S-05).
- Operasi privileged (manajemen user) harus punya endpoint sendiri dengan otorisasi eksplisit.
- Duplikasi backend Express vs Vercel masih ada dan belum diselesaikan (A-01).
- Logika bisnis tersebar di klien (web + Flutter) sehingga berisiko divergen.

## Alternatif yang ditolak

- **Semua lewat Express**: butuh hosting persisten + duplikasi untuk mobile offline.
- **Semua lewat Vercel functions**: menambah latensi & biaya untuk CRUD volume tinggi.

## Tindak lanjut

- Audit policy RLS seluruh tabel inti (BACKLOG P0-05).
- Putuskan konsolidasi backend (BACKLOG P1-01).
