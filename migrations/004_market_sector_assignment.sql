-- Allow admins and market heads to manage sector assignments.
DROP POLICY IF EXISTS market_sectors_insert_admin_or_head ON public.market_sectors;
CREATE POLICY market_sectors_insert_admin_or_head
ON public.market_sectors
FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR EXISTS (
    SELECT 1
    FROM public.markets
    WHERE markets.id = market_sectors.market_id
      AND markets.id_head_market = (
        SELECT users.id_user
        FROM public.users
        WHERE users.auth_uid = auth.uid()
        LIMIT 1
      )
  )
);

DROP POLICY IF EXISTS market_sectors_update_admin_or_head ON public.market_sectors;
CREATE POLICY market_sectors_update_admin_or_head
ON public.market_sectors
FOR UPDATE TO authenticated
USING (
  is_current_user_admin()
  OR EXISTS (
    SELECT 1
    FROM public.markets
    WHERE markets.id = market_sectors.market_id
      AND markets.id_head_market = (
        SELECT users.id_user
        FROM public.users
        WHERE users.auth_uid = auth.uid()
        LIMIT 1
      )
  )
)
WITH CHECK (
  is_current_user_admin()
  OR EXISTS (
    SELECT 1
    FROM public.markets
    WHERE markets.id = market_sectors.market_id
      AND markets.id_head_market = (
        SELECT users.id_user
        FROM public.users
        WHERE users.auth_uid = auth.uid()
        LIMIT 1
      )
  )
);