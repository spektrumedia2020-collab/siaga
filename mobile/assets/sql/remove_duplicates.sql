-- Remove duplicate retribution_rates, keep only the oldest (lowest id) per stall+type
DELETE FROM public.retribution_rates
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.retribution_rates
  GROUP BY stall_id, types_id
);

-- Add unique constraint to prevent duplicates in the future
ALTER TABLE public.retribution_rates 
DROP CONSTRAINT IF EXISTS unique_stall_type;

ALTER TABLE public.retribution_rates 
ADD CONSTRAINT unique_stall_type UNIQUE (stall_id, types_id);