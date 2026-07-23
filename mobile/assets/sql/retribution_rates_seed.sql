-- Seed retribution_rates for all existing stalls
-- Each stall gets both Harian and Jaspro 2026 with different prices

-- Harian: Rp 2,000 per day for ALL stalls
INSERT INTO public.retribution_rates (types_id, market_id, stall_id, amount, created_at, updated_at)
SELECT 
  t.id as types_id,
  s.market_id,
  s.id as stall_id,
  2000 as amount,
  NOW(),
  NOW()
FROM public.stalls s
CROSS JOIN public.retribution_types t
WHERE t.code = '2-005-80'
  AND s.status = 'AKTIF'
ON CONFLICT DO NOTHING;

-- Jaspro 2026: Rp 10,000,000 per year for ALL stalls
-- This is an annual payment that can be paid in installments
INSERT INTO public.retribution_rates (types_id, market_id, stall_id, amount, created_at, updated_at)
SELECT 
  t.id as types_id,
  s.market_id,
  s.id as stall_id,
  10000000 as amount,
  NOW(),
  NOW()
FROM public.stalls s
CROSS JOIN public.retribution_types t
WHERE t.code = '2-005-79'
  AND s.status = 'AKTIF'
ON CONFLICT DO NOTHING;

-- Optional: Add other retribution types with sample prices
-- Daging: Rp 3,000 per day
INSERT INTO public.retribution_rates (types_id, market_id, stall_id, amount, created_at, updated_at)
SELECT 
  t.id,
  s.market_id,
  s.id,
  3000,
  NOW(),
  NOW()
FROM public.stalls s
CROSS JOIN public.retribution_types t
WHERE t.code = '2-005-84'
  AND s.status = 'AKTIF'
ON CONFLICT DO NOTHING;

-- Rempah/Tepung/Kelapa: Rp 2,500 per day
INSERT INTO public.retribution_rates (types_id, market_id, stall_id, amount, created_at, updated_at)
SELECT 
  t.id,
  s.market_id,
  s.id,
  2500,
  NOW(),
  NOW()
FROM public.stalls s
CROSS JOIN public.retribution_types t
WHERE t.code = '2-005-85'
  AND s.status = 'AKTIF'
ON CONFLICT DO NOTHING;

-- Parkir: Rp 5,000 per vehicle
INSERT INTO public.retribution_rates (types_id, market_id, stall_id, amount, created_at, updated_at)
SELECT 
  t.id,
  s.market_id,
  s.id,
  5000,
  NOW(),
  NOW()
FROM public.stalls s
CROSS JOIN public.retribution_types t
WHERE t.code = '2-005-88'
  AND s.status = 'AKTIF'
ON CONFLICT DO NOTHING;