# DONE — Arsip Task Selesai

## 2026-10-25 · P0-09 — Aktifkan RLS `stall_categories` (migration `011`)

- RLS diaktifkan; 4 policy `TO authenticated`: SELECT read; INSERT/UPDATE/DELETE staf/admin.
- Kategori tetap global; `CategoriesPage` di dashboard pasar tetap berfungsi.
- Uji runtime (rollback): `anon_select=0`, `anon_insert_blocked=true`, `auth_select=5`,
  `staff_insert=true`; objek uji tidak tertinggal (baris tetap 5, 4 policy).

## 2026-10-25 · P0-08 — Tutup RLS operasional (migration `010`)

- `transactions`: SELECT/INSERT/UPDATE market-scoped; DELETE tetap tanpa policy (deny).
- `stalls`: SELECT publik (`anon, authenticated`); INSERT/UPDATE/DELETE market-scoped.
- `stall_owners`: SELECT publik; INSERT staf pasar; UPDATE/DELETE admin atau staf pasar pemilik
  lapak terkait.
- Uji runtime (rollback): `tx_own=1 tx_other=0`, `stall_own=1 stall_other=0`,
  `owner_own=1 owner_other=0`, `anon_stalls=4216`; objek uji tidak tertinggal.
- Catatan: SELECT publik `stall_owners` masih mengekspos `nik`/`phone`/`address` → **P0-11**.

## 2026-10-25 · P0-07 — Tutup RLS `users` (migration `009`)

- Migration dijalankan di Supabase SQL Editor (PRODUCTION).
- Policy: SELECT own/admin/staf pasar; INSERT admin/kepala pasar (role bukan ADMIN);
  UPDATE own/admin/kepala pasar.
- Fungsi `is_current_user_market_head(bigint)` + trigger `guard_users_privileged_columns`
  (blok perubahan `auth_uid`, `akses_global`, `id_role`→ADMIN, dan pindah market oleh non-admin).
- Verifikasi DB: `pg_policies` 3 policy baru; `pg_trigger` memuat trigger penjaga.
- Alur `OfficersPage` (kepala pasar mengelola staff) tetap didukung.
- **Uji runtime PASS**: sebagai role `authenticated`, update `id_role`→ADMIN ditolak
  (`escalation_blocked=true`), update profil sendiri diterima (`self_profile_update=true`);
  transaksi di-rollback, objek uji tidak tertinggal.

## 2026-10-25 · P0-05 — Audit RLS produksi

- Query `pg_class` + `pg_policies` di Supabase SQL Editor: **16 tabel**, **46 policy**.
- Hasil lengkap: [database/SCHEMA.md](../database/SCHEMA.md#audit-rls-produksi--2026-10-25-p0-05).
- Temuan baru: S-11 (users CRITICAL), S-12 (transactions), S-13 (stalls/stall_owners),
  S-14 (stall_categories RLS off), S-15 (read over-broad), S-16 (setoran scope).
- Tabel `lapak`, `pemilik_lapak`, `market_themes` **tidak ada** di schema `public`
  (padahal dirujuk kode) — dicatat sebagai drift kode↔DB.
- Tidak ada perubahan DB pada fase ini (read-only).

## 2026-10-25 · P0-06 — Tutup RLS `retribution_rates` (migration `008`)

- `migrations/008_secure_retribution_rates_rls.sql` dijalankan di Supabase SQL Editor (PRODUCTION).
- Fungsi `is_current_user_market_member(bigint)` (SECURITY DEFINER): `user_roles.market_id`,
  `users.market_id`, atau `markets.id_head_market`.
- Verifikasi `pg_policies`: 4 rows — SELECT `true` (referensi), INSERT/UPDATE/DELETE
  `is_current_user_admin_full() OR is_current_user_market_member(market_id)`.
- Alur `MarketDashboard → StallsPage` untuk staf pasar tetap berjalan; user lintas-pasar tidak bisa
  lagi mengubah tarif.

## 2026-10-25 · P0-02 — Tutup RLS `user_roles` (migration `007`)

- `migrations/007_secure_user_roles_rls.sql` dibuat + dijalankan di Supabase SQL Editor
  (project `hlvsbmxpkqvniemunygh`, branch `main PRODUCTION`).
- Fungsi `is_current_user_admin_full()` (SECURITY DEFINER) cek admin dari `users.id_role` **atau**
  `user_roles`; policy tidak rekursif.
- Verifikasi `pg_policies`: 4 rows — select_own_or_admin, insert_admin, update_admin, delete_admin.
  Tidak ada lagi `USING (true)`.
- Catatan: user non-admin kini hanya melihat baris peran miliknya; daftar penugasan di `#pasar`
  hanya lengkap untuk admin. `service_role` tidak terpengaruh.

## 2026-10-25 · Deploy produksi P0-01 (`4a0e766`)

- Remote diganti ke SSH deploy key (`git@github.com:spektrumedia2020-collab/siaga.git`).
- Push `73c7267..4a0e766` → `main` sukses; Vercel `https://siaga-pi.vercel.app` menjalankan kode baru.
- Verifikasi produksi: GET/POST tanpa token → 401; `Origin: https://evil.example` → 403;
  preflight same-origin → 200.
- Belum: uji 403 (non-admin) & 201 (admin) dengan kredensial; CI GitHub masih akan merah
  karena error typecheck lama.

## 2026-10-25 · P0-01 — Amankan `/api/users` (commit `5f69b82`)

**Perubahan**
- `api/users.ts`: verifikasi Bearer token Supabase (`auth.getUser`) + wajib peran `ADMIN`
  (`user_roles`, fallback `users.id_role`); berlaku untuk GET/POST/DELETE; CORS allowlist
  (localhost, `FRONTEND_URL`, same-origin); guard env Supabase (fail-closed).
- `src/pages/UserManagement.tsx`: kirim `Authorization: Bearer <access_token>` pada POST.

**Verifikasi**
- `tsc --noEmit`: tidak ada error pada `api/users.ts` & `UserManagement.tsx`
  (error lain sudah ada sebelumnya — lihat `.qoder/validation.json`).
- Smoke test handler (mock req/res): tanpa token → 401; token tak valid tanpa env → 500 config
  (fail-closed); origin asing → 403; OPTIONS sah → 200. Semua PASS.
- **Belum**: deploy Vercel & uji dengan akun non-admin di produksi.

## 2026-10-25 · SESSION-2026-10-25-1

**Inisialisasi knowledge root SIAGA** (START PROJECT, AGY-QODER OS §2.1–§2.2).

Dibuat (isi nyata, bukan placeholder):

- `knowledge/00_INDEX.md`, `knowledge/01_PROJECT.md`
- `knowledge/.qoder/state.json`, `project.json`, `context.md`, `context.json`, `memory.md`, `validation.json`
- `knowledge/.qoder/index/index-state.json` (status `UNAVAILABLE`, fallback grep — jujur dicatat)
- `knowledge/tasks/CURRENT.md`, `BACKLOG.md`, `DONE.md`
- `knowledge/architecture/SYSTEM_CONTEXT.md`, `HLD.md`, `LLD.md`, `DATA_FLOW.md`
- `knowledge/database/SCHEMA.md`, `RELATIONSHIPS.md`
- `knowledge/api/API.md`
- `knowledge/security/SECURITY.md`
- `knowledge/modules/web-frontend.md`, `mobile-officer.md`, `backend-api.md`
- `knowledge/decisions/ADR-001-supabase-first.md`
- `knowledge/logs/2026-10-25.md`

Hasil sampingan: audit keamanan parsial menemukan 5 isu P0 (S-01…S-05) yang dicatat di BACKLOG
dan SECURITY. Kode aplikasi **tidak** diubah pada sesi ini.
