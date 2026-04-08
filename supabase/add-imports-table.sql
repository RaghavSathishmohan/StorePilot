-- Add imports table that the code expects
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('products', 'inventory', 'sales', 'customers', 'suppliers', 'categories')),
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_format TEXT CHECK (file_format IN ('csv', 'excel', 'json', 'xml')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  mapping_config JSONB,
  validation_rules JSONB,
  initiated_by UUID NOT NULL REFERENCES profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_imports_store ON imports(store_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status);
CREATE INDEX IF NOT EXISTS idx_imports_created_at ON imports(created_at);

-- RLS
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;

-- Helper functions (if not exist)
CREATE OR REPLACE FUNCTION is_store_member(p_store_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members
    WHERE store_id = p_store_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_store_owner(p_store_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores
    WHERE id = p_store_id AND owner_id = p_user_id
  );
$$;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'imports' AND policyname = 'Store owners can manage imports'
  ) THEN
    CREATE POLICY "Store owners can manage imports" ON imports
      FOR ALL USING (is_store_owner(store_id, auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'imports' AND policyname = 'Store members can view imports'
  ) THEN
    CREATE POLICY "Store members can view imports" ON imports
      FOR SELECT USING (is_store_member(store_id, auth.uid()) OR is_store_owner(store_id, auth.uid()));
  END IF;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_imports_updated_at') THEN
    CREATE TRIGGER update_imports_updated_at BEFORE UPDATE ON imports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
