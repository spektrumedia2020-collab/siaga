-- ============================================================================
-- 012_secure_read_scope_and_setoran.sql
--
-- Menutup S-15 & S-16:
--   attendance        : `attendance_select true` -> baca semua absensi
--   officers          : `officers_select_auth true` -> baca semua petugas
--   retribution_types : INSERT `true`
--   setoran           : cek peran hanya `users.id_role`, tanpa scope market
--
-- Policy baru:
--   attendance        : own (tetap) | admin | kepala pasar
--   officers          : own (tetap) | admin | staf pasar yang sama
--   retribution_types : SELECT authenticated (tetap) | INSERT admin/staf
--   setoran           : SELECT/INSERT/UPDATE memakai market scope + peran
--                       (TREASURER/MARKET_HEAD/ADMIN) via user_roles & users.id_role
--
-- Idempoten. Jalankan di Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Helper: peran tertentu pada market tertentu
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_has_market_role(
  target_market_id bigint,
  allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.market_id = target_market_id
      AND upper(r.name) = ANY (SELECT upper(x) FROM unnest(allowed_roles) AS x)
  )
  OR EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.id_role
    WHERE u.auth_uid = auth.uid()
      AND u.market_id = target_market_id
      AND upper(r.name) = ANY (SELECT upper(x) FROM unnest(allowed_roles) AS x)
  )
  OR (
    'MARKET_HEAD' = ANY (SELECT upper(x) FROM unnest(allowed_roles) AS x)
    AND public.is_current_user_market_head(target_market_id)
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_has_market_role(bigint, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_market_role(bigint, text[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. attendance
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_select_admin_or_head" ON public.attendance;

CREATE POLICY "attendance_select_admin_or_head"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_head(market_id))
);

-- ---------------------------------------------------------------------------
-- 3. officers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "officers_select_auth" ON public.officers;
DROP POLICY IF EXISTS "officers_select_market_member" ON public.officers;

CREATE POLICY "officers_select_market_member"
ON public.officers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_current_user_admin_full()
  OR (market_id IS NOT NULL AND public.is_current_user_market_member(market_id))
);

-- ---------------------------------------------------------------------------
-- 4. retribution_types
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "retribution_types_insert" ON public.retribution_types;
DROP POLICY IF EXISTS "retribution_types_insert_staff" ON public.retribution_types;

CREATE POLICY "retribution_types_insert_staff"
ON public.retribution_types
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin_full()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.auth_uid = auth.uid() AND u.id_role IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- 5. setoran
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "setoran_officer_select" ON public.setoran;
DROP POLICY IF EXISTS "setoran_officer_insert" ON public.setoran;
DROP POLICY IF EXISTS "setoran_approval_update" ON public.setoran;

DROP POLICY IF EXISTS "setoran_select_own_or_market_approver" ON public.setoran;
DROP POLICY IF EXISTS "setoran_insert_own_market" ON public.setoran;
DROP POLICY IF EXISTS "setoran_update_market_approver" ON public.setoran;

CREATE POLICY "setoran_select_own_or_market_approver"
ON public.setoran
FOR SELECT
TO authenticated
USING (
  officer_id = auth.uid()
  OR public.is_current_user_admin_full()
  OR (
    market_id IS NOT NULL
    AND public.current_user_has_market_role(
      market_id,
      ARRAY['TREASURER', 'MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN']
    )
  )
);

CREATE POLICY "setoran_insert_own_market"
ON public.setoran
FOR INSERT
TO authenticated
WITH CHECK (
  officer_id = auth.uid()
  AND market_id IS NOT NULL
  AND public.is_current_user_market_member(market_id)
);

CREATE POLICY "setoran_update_market_approver"
ON public.setoran
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin_full()
  OR (
    market_id IS NOT NULL
    AND public.current_user_has_market_role(
      market_id,
      ARRAY['TREASURER', 'MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN']
    )
  )
)
WITH CHECK (
  public.is_current_user_admin_full()
  OR (
    market_id IS NOT NULL
    AND public.current_user_has_market_role(
      market_id,
      ARRAY['TREASURER', 'MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN']
    )
  )
);

-- ---------------------------------------------------------------------------
-- 6. Verifikasi
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('attendance', 'officers', 'retribution_types', 'setoran')
ORDER BY tablename, cmd, policyname;

COMMIT;
