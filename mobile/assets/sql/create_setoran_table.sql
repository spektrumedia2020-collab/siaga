-- ============================================
-- CREATE SETORAN TABLE
-- ============================================
-- Tabel untuk mencatat setoran petugas ke bendahara/kepala pasar
-- Status flow: pending_officer -> pending_treasurer -> pending_head -> approved

CREATE TABLE IF NOT EXISTS setoran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id INTEGER NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  proof_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_treasurer' CHECK (status IN ('pending_treasurer', 'pending_head', 'approved', 'rejected')),
  rejection_reason TEXT,
  approved_by_treasurer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_head UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at_treasurer TIMESTAMPTZ,
  approved_at_head TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster querying
CREATE INDEX IF NOT EXISTS idx_setoran_officer_id ON setoran(officer_id);
CREATE INDEX IF NOT EXISTS idx_setoran_market_id ON setoran(market_id);
CREATE INDEX IF NOT EXISTS idx_setoran_status ON setoran(status);
CREATE INDEX IF NOT EXISTS idx_setoran_created_at ON setoran(created_at DESC);

-- Enable RLS
ALTER TABLE setoran ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Officer can view only their own setoran
-- Treasurer, Market Head, Admin can view all
CREATE POLICY "setoran_officer_select" ON setoran
  FOR SELECT TO authenticated
  USING (
    officer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.id_role = r.id
      WHERE u.auth_uid = auth.uid()
      AND r.name IN ('TREASURER', 'MARKET_HEAD', 'ADMIN')
    )
  );

-- Officer can insert their own setoran
CREATE POLICY "setoran_officer_insert" ON setoran
  FOR INSERT TO authenticated
  WITH CHECK (officer_id = auth.uid());

-- Treasurer/Market_Head can update (approve/reject)
CREATE POLICY "setoran_approval_update" ON setoran
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.id_role = r.id
      WHERE u.auth_uid = auth.uid()
      AND r.name IN ('TREASURER', 'MARKET_HEAD', 'ADMIN')
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_setoran_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_setoran_timestamp ON setoran;
CREATE TRIGGER update_setoran_timestamp
  BEFORE UPDATE ON setoran
  FOR EACH ROW
  EXECUTE FUNCTION update_setoran_timestamp();

-- Function to get today's total revenue for setoran creation
CREATE OR REPLACE FUNCTION get_today_revenue_for_setoran(p_officer_id UUID)
RETURNS TABLE(total_amount NUMERIC, transaction_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0)::NUMERIC(15,2) as total_amount,
    COUNT(*)::BIGINT as transaction_count
  FROM transactions
  WHERE officer_id = p_officer_id
    AND created_at::date = CURRENT_DATE
    AND status = 'paid';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;