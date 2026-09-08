-- Seed transaksi harian Niaga Daya (market_id 30).
-- Hanya lapak aktif yang memiliki pemilik dan sektor yang ditugaskan
-- kepada petugas yang akan dibuatkan transaksi.

BEGIN;

WITH seed_rows AS (
  SELECT
    d.transaction_date::date AS transaction_date,
    st.id AS stall_id,
    st.market_id,
    ms.officer_id,
    so.name AS payer_name,
    2000::numeric(12, 2) AS amount
  FROM generate_series(
    DATE '2026-07-01',
    CURRENT_DATE,
    INTERVAL '1 day'
  ) AS d(transaction_date)
  CROSS JOIN public.stalls st
  JOIN public.market_sectors ms
    ON ms.id = st.sector_id
   AND ms.market_id = st.market_id
  JOIN public.stall_owners so
    ON so.id = st.owner_id
  WHERE st.market_id = 30
    AND st.status = 'AKTIF'
    AND st.owner_id IS NOT NULL
    AND ms.officer_id IS NOT NULL
)
INSERT INTO public.transactions (
  market_id,
  stall_id,
  officer_id,
  amount,
  payment_method,
  payer_name,
  status,
  source,
  transaction_date,
  created_at
)
SELECT
  sr.market_id,
  sr.stall_id,
  sr.officer_id,
  sr.amount,
  CASE
    WHEN mod(abs(hashtext(
      sr.transaction_date::text || '-' || sr.stall_id::text
    )), 4) = 0 THEN 'QRIS'
    ELSE 'Tunai'
  END,
  sr.payer_name,
  'paid',
  'seed-sector-2026',
  sr.transaction_date,
  sr.transaction_date + INTERVAL '08 hours'
FROM seed_rows sr
WHERE NOT EXISTS (
  SELECT 1
  FROM public.transactions t
  WHERE t.market_id = sr.market_id
    AND t.stall_id = sr.stall_id
    AND t.transaction_date = sr.transaction_date
    AND t.source = 'seed-sector-2026'
);

COMMIT;

SELECT
  t.source,
  COUNT(*) AS total_rows,
  MIN(t.transaction_date) AS first_date,
  MAX(t.transaction_date) AS last_date,
  SUM(t.amount)::numeric(14, 2) AS total_amount
FROM public.transactions t
WHERE t.market_id = 30
  AND t.source = 'seed-sector-2026'
GROUP BY t.source;