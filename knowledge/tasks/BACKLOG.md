# BACKLOG — SIAGA

Prioritas: **P0** (keamanan/kritis) → **P1** (kualitas arsitektur) → **P2** (kebersihan/UX).
Setiap item wajib punya evidence sebelum dieksekusi dan hasil verifikasi setelah selesai.

## P0 — Keamanan

> **P0-01 selesai 2026-10-25** (commit `5f69b82`) — lihat [DONE.md](./DONE.md). Sisa: deploy + uji produksi.

### P0-02 · Policy RLS `user_roles` permisif
- **Evidence:** `create_user_roles_table.sql:37-51` — SELECT/INSERT/UPDATE/DELETE `TO authenticated USING (true)`.
- **Dampak:** user login mana pun dapat menulis peran sendiri (eskalasi ke `ADMIN`), terutama karena
  sign-up publik aktif di UI (`src/components/Auth.tsx`).
- **DoD:** tulis hanya untuk `ADMIN`; SELECT hanya baris milik sendiri (kecuali ADMIN); verifikasi di DB.

### P0-03 · PIN halaman lapak default `1234`
- **Evidence:** `api/lapak.ts:21-24` — `expectedPin = configuredPin || (!configuredPinHash ? '1234' : '')`.
- **DoD:** `PUBLIC_STALL_PIN_HASH` wajib di produksi; fallback dihapus; rate limit per IP/endpoint.

### P0-04 · Secret JWT Perumda memakai fallback service-role key
- **Evidence:** `api/perumda.ts:43-45` (`PERUMDA_JWT_SECRET || SUPABASE_SERVICE_ROLE_KEY`).
- **DoD:** `PERUMDA_JWT_SECRET` wajib dan berbeda dari service key; startup gagal bila kosong.

### P0-06 · Policy RLS `retribution_rates` permisif
- **Evidence:** `mobile/assets/sql/retribution_rates_table.sql:29-48` — SELECT/INSERT/UPDATE
  `TO authenticated USING (true) WITH CHECK (true)`; `add_delete_policy_retribution_rates.sql` menambah DELETE.
- **Dampak:** siapa pun yang login dapat mengubah tarif retribusi (integritas finansial).
- **DoD:** tulis hanya `ADMIN` / `MARKET_HEAD` pasar terkait (pola `migrations/004`); SELECT tetap
  boleh luas bila tarif memang publik internal; verifikasi di DB.

### P0-05 · Verifikasi status RLS tabel inti di produksi
- **Konteks:** file SQL RLS tersebar (root, `mobile/migrations/003_rls_policies.sql`, `mobile/assets/sql/*`),
  status terpasang di DB **UNKNOWN**.
- **DoD:** audit `pg_policies` per tabel inti (`markets`, `stalls`, `transactions`, `users`,
  `retribution_rates`, `stall_owners`, `setoran`, `attendance`); catat hasil di knowledge.

## P1 — Arsitektur & kualitas

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
