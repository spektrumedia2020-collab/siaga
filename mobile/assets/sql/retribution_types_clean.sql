-- Remove amount and market_id from retribution_types (master data only)
ALTER TABLE public.retribution_types 
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS market_id;