# Context Aktif (L0) — 2026-10-25

**Sesi:** SESSION-2026-10-25-1 · **Commit:** `73c7267` · **Branch:** `main` · **Autonomy:** L1

## Task aktif

**P0-01 selesai & ter-deploy** (`4a0e766`, `https://siaga-pi.vercel.app`): tanpa token → 401,
origin asing → 403. Berikutnya: **P0-02** (RLS `user_roles`).

## Temuan yang memicu task berikutnya

| ID | Ringkas | Severity |
|---|---|---|
| S-01 | `api/users.ts` tanpa autentikasi (list/create/delete user, service role, CORS `*`) | CRITICAL |
| S-02 | Policy RLS `user_roles` memakai `USING (true)` untuk semua operasi | HIGH |
| S-03 | `api/lapak.ts` fallback PIN `1234` bila env tidak diset | MEDIUM |
| S-04 | `api/perumda.ts` memakai service-role key sebagai fallback secret JWT | MEDIUM |

Detail + evidence: [../security/SECURITY.md](../security/SECURITY.md).

## Berkas yang sudah dibaca (bukti)

`package.json`, `vercel.json`, `src/App.tsx`, `src/server.ts`, `src/middleware/auth.ts`,
`src/lib/supabase.ts`, `src/lib/api.ts`, `src/lib/roleUtils.ts`, `src/components/Auth.tsx`,
`src/components/ProtectedRoute.tsx`, `src/pages/UserManagement.tsx` (potongan),
`api/users.ts`, `api/perumda.ts` (potongan), `api/lapak.ts` (potongan),
`create_user_roles_table.sql`, `mobile/migrations/001_init.sql`, `mobile/pubspec.yaml`,
`.env.template`, `.gitignore`, `TODO_FIXES.md` (potongan), `AUDIT_REPORT.md` (potongan).

## Keputusan sesi

1. Knowledge root dibuat di `knowledge/` saja; dokumen root repo tidak dipindah/diubah.
2. Code index **tidak** dibangun (butuh SQLite); status `UNAVAILABLE` + fallback grep dicatat.
3. Validasi build/typecheck **belum dijalankan** (tidak diminta/ dihentikan user) → status `unknown`.

## Next action (spesifik)

1. P0-02: batasi INSERT/UPDATE/DELETE `user_roles` ke admin; verifikasi via `pg_policies`.
2. P0-05: audit policy `markets`, `stalls`, `transactions`, `users`, `stall_owners`.
3. P0-03/P0-04: set `PUBLIC_STALL_PIN_HASH` dan `PERUMDA_JWT_SECRET` di env Vercel.
4. Uji produksi dengan akun non-admin (harus 403) dan ADMIN (201) bila kredensial tersedia.
5. CI merah: `tsc --noEmit` 40+ error lama — perbaiki bertahap (BACKLOG P1-05).
