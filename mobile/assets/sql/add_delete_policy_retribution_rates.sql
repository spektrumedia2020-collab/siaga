-- Add DELETE policy for retribution_rates table
DROP POLICY IF EXISTS "retribution_rates_delete" ON public.retribution_rates;

CREATE POLICY "retribution_rates_delete"
ON public.retribution_rates
FOR DELETE
TO authenticated
USING (true);

-- Verify all policies exist
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'retribution_rates'
ORDER BY cmd;