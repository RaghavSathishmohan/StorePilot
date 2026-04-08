-- Add sales_receipts and sale_line_items tables that the code expects
-- Run this in Supabase SQL Editor

-- Sales receipts table (what the code actually queries)
CREATE TABLE IF NOT EXISTS sales_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
  receipt_number TEXT NOT NULL,
  sale_datetime TIMESTAMPTZ DEFAULT NOW(),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile', 'other')),
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  loyalty_points_used INTEGER DEFAULT 0,
  loyalty_points_earned INTEGER DEFAULT 0,
  is_voided BOOLEAN DEFAULT false,
  void_reason TEXT,
  cashier_id UUID REFERENCES profiles(id),
  register_id TEXT,
  shift_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, receipt_number)
);

-- Sale line items table (what the code actually queries)
CREATE TABLE IF NOT EXISTS sale_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES sales_receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  profit_amount DECIMAL(10, 2),
  is_returned BOOLEAN DEFAULT false,
  returned_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_receipts_store ON sales_receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_receipts_datetime ON sales_receipts(sale_datetime);
CREATE INDEX IF NOT EXISTS idx_sales_receipts_status ON sales_receipts(payment_status);
CREATE INDEX IF NOT EXISTS idx_sale_line_items_receipt ON sale_line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_sale_line_items_product ON sale_line_items(product_id);

-- RLS
ALTER TABLE sales_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_line_items ENABLE ROW LEVEL SECURITY;

-- Helper functions
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

-- RLS Policies for sales_receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sales_receipts' AND policyname = 'Store owners can manage receipts'
  ) THEN
    CREATE POLICY "Store owners can manage receipts" ON sales_receipts
      FOR ALL USING (is_store_owner(store_id, auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sales_receipts' AND policyname = 'Store members can view receipts'
  ) THEN
    CREATE POLICY "Store members can view receipts" ON sales_receipts
      FOR SELECT USING (is_store_member(store_id, auth.uid()) OR is_store_owner(store_id, auth.uid()));
  END IF;
END $$;

-- RLS Policies for sale_line_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sale_line_items' AND policyname = 'Store owners can manage line items'
  ) THEN
    CREATE POLICY "Store owners can manage line items" ON sale_line_items
      FOR ALL USING (EXISTS (SELECT 1 FROM sales_receipts WHERE id = receipt_id AND is_store_owner(store_id, auth.uid())));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sale_line_items' AND policyname = 'Store members can view line items'
  ) THEN
    CREATE POLICY "Store members can view line items" ON sale_line_items
      FOR SELECT USING (EXISTS (SELECT 1 FROM sales_receipts WHERE id = receipt_id AND (is_store_member(store_id, auth.uid()) OR is_store_owner(store_id, auth.uid()))));
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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_receipts_updated_at') THEN
    CREATE TRIGGER update_sales_receipts_updated_at BEFORE UPDATE ON sales_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
