-- Seed sectors for market_id = 1
-- FIX 23 Agu 2026: target tabel `market_sectors` (bukan `sectors` yang legacy).
-- Skema market_sectors: id, market_id, name, created_at, officer_id
INSERT INTO public.market_sectors (id, market_id, name, created_at) VALUES
(1, 1, 'Sektor A', NOW()),
(2, 1, 'Sektor B', NOW()),
(3, 1, 'Sektor C', NOW())
ON CONFLICT (id) DO NOTHING;