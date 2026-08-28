-- Allow a MARKET_HEAD assigned through users.market_id to edit that market.
DROP POLICY IF EXISTS markets_update_admin_or_head ON public.markets;
CREATE POLICY markets_update_admin_or_head
ON public.markets
FOR UPDATE TO authenticated
USING (
  is_current_user_admin()
  OR id_head_market = (
    SELECT users.id_user
    FROM public.users
    WHERE users.auth_uid = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1
    FROM public.users head_user
    JOIN public.roles head_role ON head_role.id = head_user.id_role
    WHERE head_user.auth_uid = auth.uid()
      AND head_user.market_id = markets.id
      AND head_role.name = 'MARKET_HEAD'
  )
)
WITH CHECK (
  is_current_user_admin()
  OR id_head_market = (
    SELECT users.id_user
    FROM public.users
    WHERE users.auth_uid = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1
    FROM public.users head_user
    JOIN public.roles head_role ON head_role.id = head_user.id_role
    WHERE head_user.auth_uid = auth.uid()
      AND head_user.market_id = markets.id
      AND head_role.name = 'MARKET_HEAD'
  )
);
