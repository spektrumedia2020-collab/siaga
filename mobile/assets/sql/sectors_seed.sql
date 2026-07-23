-- Seed sectors for market_id = 1
INSERT INTO public.sectors (id, market_id, name, created_at, updated_at) VALUES
(1, 1, 'Sektor A', NOW(), NOW()),
(2, 1, 'Sektor B', NOW(), NOW()),
(3, 1, 'Sektor C', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;