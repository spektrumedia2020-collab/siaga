-- Seed retribution_rates for ALL stalls
-- This creates entries for every active stall with Harian and Jaspro 2026

-- Harian (Rp 2.000) for ALL active stalls
INSERT INTO public.retribution_rates (amount, stall_id, market_id, types_id, created_at, updated_at)
SELECT 2000, s.id, s.market_id, t.id, NOW(), NOW()
FROM public.stalls s
JOIN public.retribution_types t ON t.code = '2-005-80'
WHERE s.status = 'AKTIF';

-- Jaspro 2026 (Rp 10.000.000) for ALL active stalls
INSERT INTO public.retribution_rates (amount, stall_id, market_id, types_id, created_at, updated_at)
SELECT 10000000, s.id, s.market_id, t.id, NOW(), NOW()
FROM public.stalls s
JOIN public.retribution_types t ON t.code = '2-005-79'
WHERE s.status = 'AKTIF';