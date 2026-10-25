# SECURITY — SIAGA

Audit: 2026-10-25 · commit `73c7267` · semua temuan di bawah **VERIFIED di source**.
Status konfigurasi DB produksi: **UNKNOWN** (tidak ada akses DB pada sesi ini).

## Ringkasan

| ID | Severity | Temuan | Status |
|---|---|---|---|
| S-01 | CRITICAL | `api/users.ts` tanpa autentikasi | **FIXED & TERVERIFIKASI di produksi** |
| S-02 | HIGH | RLS `user_roles` `USING (true)` | **FIXED & TERVERIFIKASI di DB** |
| S-03 | MEDIUM | PIN lapak default `1234` | OPEN bila env kosong |
| S-04 | MEDIUM | Secret JWT Perumda fallback ke service-role key | OPEN bila env kosong |
| S-05 | HIGH | RLS `retribution_rates` `USING (true)` untuk insert/update | **FIXED & TERVERIFIKASI di DB** |
| S-06 | LOW | CORS `*` pada Vercel functions | **PARTIAL** — `users` diperbaiki |
| S-07 | LOW | Express: CORS error → 500; body limit 10 MB | OPEN |
| S-08 | INFO | Tombol akun test tampil default di produksi | OPEN |
| S-09 | INFO | Role gating web bersifat client-side; impersonation bukan kontrol | BY DESIGN |
| S-10 | INFO | Tidak ada test otomatis / lint | OPEN |
| S-11 | CRITICAL | RLS `users` `USING (true)` untuk SELECT/INSERT/UPDATE | **FIXED & TERVERIFIKASI di DB** |
| S-12 | HIGH | RLS `transactions` `true` untuk INSERT/SELECT/UPDATE | OPEN (audit 2026-10-25) |
| S-13 | HIGH | RLS `stalls` & `stall_owners` `ALL true` | OPEN (audit 2026-10-25) |
| S-14 | MEDIUM | `stall_categories` RLS **nonaktif**, 0 policy | OPEN (audit 2026-10-25) |
| S-15 | MEDIUM | Read over-broad: `attendance`, `officers`, `retribution_types` | OPEN (audit 2026-10-25) |
| S-16 | MEDIUM | `setoran` cek peran hanya `users.id_role`, tanpa scope market | OPEN (audit 2026-10-25) |

---

## S-01 · CRITICAL — `/api/users` tanpa autentikasi — **FIXED & DEPLOYED (2026-10-25)**

**Resolusi**
- `api/users.ts` kini memverifikasi `Authorization: Bearer <supabase access token>` via
  `supabaseAdmin.auth.getUser(token)` dan mewajibkan peran `ADMIN` (`user_roles`, fallback `users.id_role`).
- Semua method (GET/POST/DELETE) menolak request tanpa token → 401; non-admin → 403.
- CORS `*` diganti allowlist (localhost dev, `FRONTEND_URL`, atau same-origin).
- Guard konfigurasi: env Supabase kosong → 500 `Server configuration error` (fail-closed).
- `src/pages/UserManagement.tsx` mengirim access token pada POST.
- Smoke test lokal: POST/GET tanpa token → 401; origin asing → 403; OPTIONS sah → 200; semua PASS.

**Verifikasi produksi (`https://siaga-pi.vercel.app`, commit `4a0e766`)**
```
GET  /api/users  tanpa token        -> 401 {"error":"Access token required"}
POST /api/users  tanpa token        -> 401
GET  /api/users  Origin: evil.example -> 403
OPTIONS /api/users Origin: siaga-pi   -> 200
```
Uji dengan akun non-admin (403) dan ADMIN (201) belum dilakukan — butuh kredensial.

**Evidence awal (sebelum perbaikan)**
- `api/users.ts:3-6` — header CORS `Access-Control-Allow-Origin: *`.
- `api/users.ts:88-116` — GET: `auth.admin.listUsers()` + join `user_roles` (email semua user).
- `api/users.ts:19-79` — POST: buat user auth dengan `roleId` dari body (bebas), email langsung dikonfirmasi.
- `api/users.ts:119-139` — DELETE: hapus `user_roles`, `users`, lalu `auth.admin.deleteUser(id)`.
- Tidak ada pembacaan `req.headers.authorization` di seluruh berkas.
- `vercel.json` — route `/api/users` dan `/api/users/(.*)` → `/api/users.ts`.

**Dampak**: siapa pun yang mengetahui URL dapat (a) membaca seluruh email pengguna,
(b) membuat akun dengan peran apa pun termasuk `ADMIN`, (c) menghapus akun mana pun.
Semua dengan service role (bypass RLS).

**Perbaikan minimum**
1. Verifikasi JWT Supabase (mis. `supabaseAdmin.auth.getUser(token)`) di awal handler.
2. Ambil peran dari `user_roles`; tolak jika bukan `ADMIN` (401/403).
3. Batasi CORS ke origin web.
4. Tambahkan rate limit per IP.

**Catatan**: `src/routes/users.ts` (Express) **sudah** terlindungi `authenticateToken + requireAdmin`;
melindungi Express saja tidak memperbaiki produksi karena Vercel hanya membangun `api/*`.

---

## S-02 · HIGH — Policy RLS `user_roles` — **FIXED & APPLIED (2026-10-25)**

**Resolusi**
- Migrasi `migrations/007_secure_user_roles_rls.sql` dijalankan di Supabase SQL Editor
  (project `hlvsbmxpkqvniemunygh`, branch `main PRODUCTION`).
- Fungsi baru `public.is_current_user_admin_full()` (SECURITY DEFINER) mengecek admin dari
  `users.id_role` **atau** `user_roles`, sehingga policy tidak memicu rekursi RLS.
- Policy lama (`user_roles_select/insert/update/delete`) dihapus.
- Hasil verifikasi `pg_policies` — **4 rows**:
  ```
  SELECT | user_roles_select_own_or_admin | using: ((user_id = auth.uid()) OR is_current_user_admin_full())
  INSERT | user_roles_insert_admin         | check: is_current_user_admin_full()
  UPDATE | user_roles_update_admin         | using/check: is_current_user_admin_full()
  DELETE | user_roles_delete_admin         | using: is_current_user_admin_full()
  ```
- Tidak ada lagi policy `USING (true)` pada `user_roles`.
- Efek samping: user non-admin kini hanya melihat baris `user_roles` miliknya sendiri
  (daftar penugasan di halaman `#pasar` hanya lengkap untuk admin).
- `service_role` (api/users.ts, Express) bypass RLS → alur admin tetap berjalan.

**Evidence awal (sebelum perbaikan)**
```sql
CREATE POLICY "user_roles_select" ... TO authenticated USING (true);
CREATE POLICY "user_roles_insert" ... TO authenticated WITH CHECK (true);
CREATE POLICY "user_roles_update" ... TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "user_roles_delete" ... TO authenticated USING (true);
```

**Dampak**: user login mana pun dapat menyisipkan/mengubah baris `user_roles` miliknya sendiri
menjadi `role_id` ADMIN. Diperkuat oleh sign-up publik yang aktif di UI (`src/components/Auth.tsx:29-39`),
sehingga eskalasi tidak selalu butuh akun internal.

**Perbaikan**: batasi INSERT/UPDATE/DELETE ke `is_current_user_admin()`; SELECT hanya baris sendiri
(atau semua bila ADMIN). Verifikasi di DB produksi (`pg_policies`).

---

## S-03 · MEDIUM — PIN lapak default `1234`

**Evidence**: `api/lapak.ts:21-24`
```ts
const expectedPin = configuredPin || (!configuredPinHash ? '1234' : '')
```

**Dampak**: bila env tidak diset, seluruh data lapak publik terbuka dengan PIN `1234`.

**Perbaikan**: wajibkan `PUBLIC_STALL_PIN_HASH` (bcrypt); fail-closed bila kosong; rate limit.

---

## S-04 · MEDIUM — Secret JWT Perumda

**Evidence**: `api/perumda.ts:43-45`
```ts
return process.env.PERUMDA_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
```

**Dampak**: service-role key dipakai sebagai kunci HMAC. Jika bocor, penyerang bisa menandatangani
token laporan maupun mengakses Supabase sepenuhnya. Rotasi service key juga memutus token.

**Perbaikan**: `PERUMDA_JWT_SECRET` wajib, panjang acak, berbeda dari service key; startup gagal bila kosong.

---

## S-05 · HIGH — Policy RLS `retribution_rates` — **FIXED & APPLIED (2026-10-25)**

**Resolusi**
- Migrasi `migrations/008_secure_retribution_rates_rls.sql` dijalankan di Supabase SQL Editor.
- Fungsi baru `public.is_current_user_market_member(bigint)` (SECURITY DEFINER): cek `user_roles.market_id`,
  `users.market_id`, atau `markets.id_head_market`.
- Policy lama (select/insert/update/delete) dihapus dan dibuat ulang.
- Verifikasi `pg_policies` — **4 rows**:
  ```
  SELECT | retribution_rates_select | using: true                      (data referensi, tetap terbaca)
  INSERT | retribution_rates_insert | check: admin OR market_member(market_id)
  UPDATE | retribution_rates_update | using & check: admin OR market_member(market_id)
  DELETE | retribution_rates_delete | using: admin OR market_member(market_id)
  ```
- Efek: user login yang tidak terhubung ke pasar tersebut tidak bisa lagi mengubah tarifnya.
  Staf pasar terkait (termasuk petugas) tetap bisa lewat `MarketDashboard → StallsPage`.
- Opsi lebih ketat (hanya ADMIN/MARKET_HEAD) tersedia bila kebijakan bisnis menghendaki.

**Evidence awal (sebelum perbaikan)** — SELECT/INSERT/UPDATE
`TO authenticated USING (true) WITH CHECK (true)`.

**Dampak**: setiap user login dapat mengubah tarif retribusi (integritas finansial).
`mobile/assets/sql/add_delete_policy_retribution_rates.sql` menambah policy DELETE — cek cakupannya.

**Perbaikan**: tulis hanya `ADMIN` atau `MARKET_HEAD` untuk pasar terkait (pola `migrations/004`).

---

## S-06 · LOW — CORS `*` pada Vercel functions

**Evidence**: `api/users.ts:4`, `api/lapak.ts:11`, `api/perumda.ts:101`.

**Dampak**: mempermudah pemanggilan lintas origin (terutama dikombinasikan S-01/S-03).
**Perbaikan**: allowlist origin seperti `src/server.ts`.

## S-07 · LOW — Hardening Express

- `src/server.ts:44-53` — callback CORS melempar `Error` → error handler → **500** (bukan 403).
- `src/server.ts:55-56` — `express.json({limit:'10mb'})` untuk semua endpoint.
- Rate limit global 100/15 menit mencakup health check.

## S-08 · INFO — Akun test di produksi

`src/components/Auth.tsx:10` — `VITE_SHOW_TEST_ACCOUNTS !== 'false'` ⇒ tampil secara default.
Kredensial tidak di-hardcode di source (form hanya tombol/isi cepat). Tetap sebaiknya default mati
di produksi dan dipagari env eksplisit.

## S-09 · INFO — Client-side gating & impersonation

- `ProtectedRoute` hanya membandingkan `role_name` di browser; kontrol sebenarnya RLS.
- Impersonation disimpan di `localStorage` dan tidak mengubah sesi Supabase.
- Implikasi: jangan menambah data sensitif baru yang hanya dilindungi UI.

## S-10 · INFO — Tidak ada test/lint

Tidak ada test file di `src/` dan `api/`; tidak ada konfigurasi ESLint/Prettier.
Regresi keamanan (seperti S-01) tidak akan tertangkap otomatis.

---

## Hasil audit RLS (P0-05, 2026-10-25)

Detail tabel & jumlah policy: [database/SCHEMA.md](../database/SCHEMA.md#audit-rls-produksi--2026-10-25-p0-05).

### S-11 · CRITICAL — `users` RLS terbuka (eskalasi ADMIN) — **FIXED & APPLIED (2026-10-25)**

**Resolusi**
- Migrasi `migrations/009_secure_users_rls.sql` dijalankan di Supabase SQL Editor.
- Policy lama (SELECT ×2, INSERT, UPDATE `true`) dihapus; diganti 3 policy:
  ```
  SELECT | users_select_own_admin_or_market | auth_uid = auth.uid() OR admin OR staf pasar yang sama
  INSERT | users_insert_admin_or_head       | admin OR kepala pasar (role bukan ADMIN)
  UPDATE | users_update_own_admin_or_head   | own OR admin OR kepala pasar
  ```
- Fungsi `is_current_user_market_head(bigint)` (SECURITY DEFINER).
- Trigger `guard_users_privileged_columns` (BEFORE UPDATE):
  non-admin tidak bisa mengubah `auth_uid`/`akses_global`; `id_role` hanya admin/kepala pasar,
  dan role `ADMIN` hanya oleh admin; pindah `market_id` hanya admin/kepala pasar kedua pasar.
- Verifikasi DB: `pg_policies` = 3 policy baru; `pg_trigger` = `guard_users_privileged_columns`.
- Dampak: eskalasi mandiri ke ADMIN via `users.id_role` tertutup. Market head tetap bisa
  membuat/mengubah staff pasar-nya (alur `OfficersPage`).
- Catatan: user non-admin tanpa `market_id` (mis. role global) kini hanya melihat profilnya sendiri.

**Uji runtime (2026-10-25, role `authenticated`, transaksi di-rollback)**
```
escalation_blocked=true; self_profile_update=true; table_update_priv=true
```
`table_update_priv=true` membuktikan penolakan berasal dari policy/trigger, bukan kurang grant.
Objek uji sementara sudah hilang (`tmp_fn_left=0`); `users_policies=3`, `guard_trigger=1`.

**Evidence awal (sebelum perbaikan)**
- `Allow authenticated users to view own profile` — SELECT `true`
- `Users can view own profile` — SELECT `true`
- `Allow authenticated users to insert their own profile` — INSERT `WITH CHECK (true)`
- `Allow authenticated users to update own profile` — UPDATE `USING (true) WITH CHECK (true)`

**Dampak**: user login mana pun bisa (a) membaca seluruh profil user (email, no_hp, market, role),
(b) menyisipkan baris profil dengan `id_role`/`auth_uid` bebas, (c) mengubah baris user mana pun,
termasuk menaikkan `id_role` dirinya ke `ADMIN`. Karena `is_current_user_admin()` dan fallback
`roleUtils` membaca `users.id_role`, ini memberi **akses admin penuh** — lebih parah daripada S-02.

**Perbaikan minimum**
- SELECT: `auth_uid = auth.uid() OR is_current_user_admin_full()`.
- INSERT: hanya `auth_uid = auth.uid()` dan `id_role IS NULL` (pembuatan user tetap lewat service role).
- UPDATE: `auth_uid = auth.uid()` dengan kolom terbatas (nama/no_hp/avatar), **tanpa** `id_role`,
  `market_id`, `akses_global`; perubahan peran hanya oleh admin/service role.
- Hapus policy duplikat.

### S-12 · HIGH — `transactions` terbuka
**Evidence**: `authenticated_can_insert_transactions` INSERT `true`; `transactions_select_own` SELECT
`true`; `transactions_update_own` UPDATE `true`/`true`.
**Dampak**: semua transaksi bisa dibaca dan diubah user login mana pun.
**Perbaikan**: SELECT/INSERT/UPDATE dibatasi pasar petugas (`is_current_user_market_member`),
UPDATE hanya admin/treasurer.

### S-13 · HIGH — `stalls` & `stall_owners` `ALL true`
**Evidence**: `Authenticated users can manage stalls` (ALL, `true`/`true`);
`Authenticated users can manage stall owners` (ALL, `true`/`true`).
**Dampak**: user login mana pun bisa menambah/mengubah/menghapus lapak dan data pemilik.
**Perbaikan**: tulis dibatasi `is_current_user_market_member(market_id)`; SELECT lapak publik tetap.

### S-14 · MEDIUM — `stall_categories` RLS nonaktif
**Evidence**: `relrowsecurity = false`, 0 policy.
**Dampak**: tabel terbuka mengikuti grant default (anon/authenticated).
**Perbaikan**: aktifkan RLS; SELECT authenticated; tulis admin/head.

### S-15 · MEDIUM — Read over-broad
- `attendance_select` `true` → semua user login membaca absensi (termasuk lokasi).
- `officers_select_auth` `true` → semua petugas terbaca.
- `retribution_types_insert` `true` → user login bisa menambah tipe retribusi.
**Perbaikan**: own/admin untuk absensi & petugas (scoped market); insert types untuk admin/head.

### S-16 · MEDIUM — `setoran` cek peran tidak konsisten
**Evidence**: policy select/update memakai `users.id_role` (bukan `user_roles`) dan tidak membatasi
`market_id`.
**Dampak**: admin yang hanya terdaftar di `user_roles` bisa tertolak; bendahara bisa menyetujui
setoran pasar lain.
**Perbaikan**: pakai `is_current_user_admin_full()` + scope market.

---

## Aturan keamanan yang wajib dipatuhi

1. Service-role key hanya di server/function; tidak pernah `VITE_*`.
2. Semua Vercel function dengan service role wajib memverifikasi identitas + peran sendiri.
3. RLS adalah kontrol utama data; policy `USING (true)` hanya boleh untuk data non-sensitif.
4. Secret produksi diset eksplisit; jangan mengandalkan fallback default.
5. Jangan commit `.env` (saat ini PASS — hanya template yang ter-track).
