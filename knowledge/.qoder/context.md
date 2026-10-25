# Context Aktif (L0) — 2026-10-25

**Sesi:** SESSION-2026-10-25-1 · **Commit:** `73c7267` · **Branch:** `main` · **Autonomy:** L1

## Task aktif

**Wipe selesai** (DB + storage): semua data operasional 0; tersisa `admin@siaga.id`, 4 roles,
7 retribution_types, 5 stall_categories. **Berikutnya:** rotasi password admin, set 2 env Vercel,
push 6 commit & deploy.

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

1. Set `PUBLIC_STALL_PIN_HASH` + `PERUMDA_JWT_SECRET` (>=32 char) di Vercel.
2. Rotasi password `admin@siaga.id`, `kepala@siaga.id`, `petugas@siaga.id`.
3. Push 6 commit → deploy → uji: `pin=1234` 401, Perumda login, head read-only, tanpa menu bendahara.
4. CI merah: `tsc --noEmit` 40+ error lama — perbaiki bertahap (BACKLOG P1-05).

## Catatan akses DB

Host direct `db.<ref>.supabase.co` hanya IPv6 dan tidak terjangkau dari mesin ini
(`getaddrinfo ENOTFOUND`). Eksekusi SQL dilakukan lewat **Supabase SQL Editor** di browser
(sesi login user), atau butuh connection string **pooler IPv4**.
