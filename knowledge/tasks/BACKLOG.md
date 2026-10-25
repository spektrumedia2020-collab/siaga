# BACKLOG — SIAGA

Prioritas: **P0** (keamanan/kritis) → **P1** (kualitas arsitektur) → **P2** (kebersihan/UX).
Setiap item wajib punya evidence sebelum dieksekusi dan hasil verifikasi setelah selesai.

## P0 — Keamanan

> **P0-01 selesai 2026-10-25** (commit `5f69b82`, deploy `4a0e766`) — lihat [DONE.md](./DONE.md).
> **P0-02 selesai 2026-10-25** (migration `007`) — lihat [DONE.md](./DONE.md).
> **P0-06 selesai 2026-10-25** (migration `008`) — lihat [DONE.md](./DONE.md).
> **P0-05 selesai 2026-10-25** (audit RLS) — hasil: [database/SCHEMA.md](../database/SCHEMA.md#audit-rls-produksi--2026-10-25-p0-05).
> **P0-07 selesai 2026-10-25** (migration `009`) — lihat [DONE.md](./DONE.md).
> **P0-08 selesai 2026-10-25** (migration `010`) — lihat [DONE.md](./DONE.md).
> **P0-09 selesai 2026-10-25** (migration `011`) — lihat [DONE.md](./DONE.md).
> **P0-10 selesai 2026-10-25** (migration `012`) — lihat [DONE.md](./DONE.md).
> **P0-11 selesai 2026-10-25** (migration `013`) — lihat [DONE.md](./DONE.md).

### P0-03 · PIN halaman lapak default `1234`
- **Status:** kode fail-closed selesai (commit `6c8ea42`), **belum deploy**.
- **Blocker:** `PUBLIC_STALL_PIN_HASH` belum diset di Vercel (produksi masih menerima `1234`).
- **DoD:** env diset → push → uji `pin=1234` = 401, PIN benar = 404/200.

### P0-04 · Secret JWT Perumda memakai fallback service-role key
- **Evidence:** `api/perumda.ts:43-45` (`PERUMDA_JWT_SECRET || SUPABASE_SERVICE_ROLE_KEY`).
- **DoD:** `PERUMDA_JWT_SECRET` wajib dan berbeda dari service key; startup gagal bila kosong.

### P0-12 · Kredensial akun demo (termasuk ADMIN) di halaman publik
- **Status:** kode dibersihkan (`JuriDocumentationPage` + tombol akun test `Auth.tsx`); bundle bersih.
- **Sisa:** rotasi password `admin@siaga.id`, `kepala@siaga.id`, `petugas@siaga.id` (Supabase Auth).
  Password lama pernah publik & ada di Git history → wajib rotasi.
- **DoD:** ketiga akun memakai password baru; login lama gagal; tidak ada kredensial di bundle.

### P1 — Arsitektur & kualitas

- **P1-01 Duplikasi backend**: `src/routes/*` (Express) vs `api/*` (Vercel) mengeksekusi logika user mirip.
  Putuskan satu jalur (rekomendasi: Express logic dipindah/dipakai ulang, atau `api/` dihapus setelah
  paritas fitur). Evidence: `vercel.json` + `src/server.ts`.
- **P1-02 Sumber migrasi ganda** (4 lokasi SQL). Konsolidasikan ke satu direktori migrasi berurutan,
  tandai file ad-hoc sebagai arsip.
- **P1-03 Skema peran ganda** (`user_roles` + `users.id_role`). Tambahkan sinkronisasi eksplisit
  (trigger/backfill) agar tidak diverge.
- **P1-04 Tidak ada test otomatis.** Mulai dari unit test helper murni (`roleUtils` mapping, `exportUtils`)
  dan integration test `api/users` auth.
- **P1-05 Tidak ada lint/format/typecheck script.** Tambahkan `typecheck` (`tsc --noEmit`), ESLint, Prettier.
- **P1-06 UI read-only untuk MARKET_HEAD.** Saat ini tombol aksi masih tampil meski RLS menolak;
  sembunyikan/disable aksi tulis di halaman pasar (stalls, owners, officers, sectors, categories,
  retribusi, transactions, setoran) untuk kepala pasar.

## P2 — Kebersihan

- **P2-01 Dead files**: `src/pages/MarketLandingPage.old.tsx`, `MarketLandingPage.css.old` — hapus setelah
  dipastikan tidak direferensikan.
- **P2-02 `express.json({ limit: '10mb' })`** (`src/server.ts:55`) terlalu besar untuk API CRUD; turunkan
  sesuai kebutuhan upload.
- **P2-03 CORS error menghasilkan 500**: callback `cors` melempar `Error` yang jatuh ke error handler umum
  (`src/server.ts:44-53`, `:89-92`). Kembalikan 403 secara eksplisit.
- **P2-04 Akun test tampil default di login produksi** (`VITE_SHOW_TEST_ACCOUNTS !== 'false'`).
  Sebaiknya default mati di produksi.
- **P2-05 Dokumen root bertumpuk** (`AUDIT_REPORT.md`, `TODO_FIXES.md`, `ARCHITECTURE_*`, dll).
  Arsipkan yang sudah selesai; jadikan `knowledge/` satu-satunya sumber aktif.
- **P2-06 Code index SQLite belum ada** — putuskan apakah akan dibangun (`INDEX`) atau tetap
  `LIGHTWEIGHT_GREP` untuk repo sebesar ini.
