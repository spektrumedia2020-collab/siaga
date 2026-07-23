-- Add market_id column to transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS market_id BIGINT;

-- Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_market_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_market_id_fkey
      FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_market_id ON public.transactions(market_id);