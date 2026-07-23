-- Deduplicate retribution_rates: keep only one entry per (stall_id, types_id)
-- This removes duplicates where the same type appears multiple times for the same stall

-- First, let's see what duplicates exist
SELECT stall_id, types_id, COUNT(*), array_agg(id ORDER BY id) as duplicate_ids
FROM public.retribution_rates
GROUP BY stall_id, types_id
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping the entry with the lowest id (oldest)
DELETE FROM public.retribution_rates
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.retribution_rates
  GROUP BY stall_id, types_id
);

-- Verify no more duplicates
SELECT stall_id, types_id, COUNT(*)
FROM public.retribution_rates
GROUP BY stall_id, types_id
HAVING COUNT(*) > 1;

-- Optional: Add a unique constraint to prevent future duplicates
ALTER TABLE public.retribution_rates 
DROP CONSTRAINT IF EXISTS unique_stall_type;

ALTER TABLE public.retribution_rates 
ADD CONSTRAINT unique_stall_type UNIQUE (stall_id, types_id);