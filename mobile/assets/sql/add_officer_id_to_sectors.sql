-- officer_id di market_sectors sudah BIGINT (integer), REFERENCES users.id_user (integer)
-- Ini sudah benar. Tidak perlu diubah.

-- Enable RLS to let officers only see their assigned sectors
ALTER TABLE public.market_sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sectors_select" ON public.market_sectors;
CREATE POLICY "sectors_select"
ON public.market_sectors
FOR SELECT
TO authenticated
USING (
  officer_id IS NULL OR 
  officer_id = (SELECT id_user FROM public.users WHERE auth_uid = auth.uid() LIMIT 1)
);