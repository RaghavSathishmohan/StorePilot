-- StorePilot Extended Schema Migration
-- Adds comprehensive tables for inventory management, sales tracking, AI features, and analytics

-- ============================================
-- PRODUCT MANAGEMENT
-- ============================================

-- Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  color_code TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  barcode TEXT,
  unit_of_measure TEXT DEFAULT 'unit',
  cost_price DECIMAL(10, 2),
  selling_price DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  reorder_point INTEGER DEFAULT 0,
  reorder_quantity INTEGER,
  supplier_name TEXT,
  supplier_contact TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  image_url TEXT,
  weight_kg DECIMAL(8, 3),
  dimensions_cm JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, sku)
);

-- ============================================
-- INVENTORY MANAGEMENT
-- ============================================

-- Inventory snapshots table (for historical tracking)
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  unit_cost DECIMAL(10, 2),
  total_value DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory movements table (for detailed tracking)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'waste')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2),
  reference_id TEXT,
  reference_type TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SALES & TRANSACTIONS
-- ============================================

-- Sales receipts table
CREATE TABLE IF NOT EXISTS sales_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
  receipt_number TEXT NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'digital_wallet', 'other')),
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  cashier_id UUID REFERENCES profiles(id),
  register_id TEXT,
  shift_id TEXT,
  is_voided BOOLEAN DEFAULT false,
  void_reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, receipt_number)
);

-- Sale line items table
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
  profit_amount DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount - (quantity * COALESCE(cost_price, 0)) - discount_amount) STORED,
  is_returned BOOLEAN DEFAULT false,
  returned_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refund events table
CREATE TABLE IF NOT EXISTS refund_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  receipt_id UUID NOT NULL REFERENCES sales_receipts(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES sale_line_items(id) ON DELETE CASCADE,
  refund_number TEXT NOT NULL,
  original_amount DECIMAL(10, 2) NOT NULL,
  refund_amount DECIMAL(10, 2) NOT NULL,
  refund_quantity INTEGER NOT NULL,
  reason TEXT,
  processed_by UUID REFERENCES profiles(id),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  refund_method TEXT CHECK (refund_method IN ('cash', 'card', 'store_credit', 'original_payment')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Void events table
CREATE TABLE IF NOT EXISTS void_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  receipt_id UUID NOT NULL REFERENCES sales_receipts(id) ON DELETE CASCADE,
  void_type TEXT NOT NULL CHECK (void_type IN ('full', 'partial', 'line_item')),
  voided_amount DECIMAL(10, 2),
  reason TEXT NOT NULL,
  voided_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  original_receipt_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS & METRICS
-- ============================================

-- Daily metrics table
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_sales DECIMAL(12, 2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_items_sold INTEGER DEFAULT 0,
  average_transaction_value DECIMAL(10, 2) GENERATED ALWAYS AS (CASE WHEN total_transactions > 0 THEN total_sales / total_transactions ELSE 0 END) STORED,
  total_tax_collected DECIMAL(12, 2) DEFAULT 0,
  total_discounts DECIMAL(12, 2) DEFAULT 0,
  total_refunds DECIMAL(12, 2) DEFAULT 0,
  gross_profit DECIMAL(12, 2) DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  peak_hour_start INTEGER,
  peak_hour_end INTEGER,
  peak_hour_sales DECIMAL(12, 2),
  inventory_value DECIMAL(14, 2) DEFAULT 0,
  low_stock_items INTEGER DEFAULT 0,
  out_of_stock_items INTEGER DEFAULT 0,
  staff_hours DECIMAL(6, 2),
  labor_cost DECIMAL(12, 2),
  weather_condition TEXT,
  foot_traffic INTEGER,
  conversion_rate DECIMAL(5, 4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, location_id, metric_date)
);

-- Hourly metrics table (for detailed analysis)
CREATE TABLE IF NOT EXISTS hourly_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
  metric_hour TIMESTAMPTZ NOT NULL,
  sales_amount DECIMAL(12, 2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, location_id, metric_hour)
);

-- ============================================
-- AI & NOTIFICATIONS
-- ============================================

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'high_demand', 'slow_moving', 'expiry', 'sales_target', 'inventory_discrepancy', 'system', 'custom')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES profiles(id),
  action_taken TEXT,
  action_taken_by UUID REFERENCES profiles(id),
  action_taken_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations table (AI-generated suggestions)
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('pricing', 'inventory', 'marketing', 'staffing', 'product_mix', 'promotion', 'operational')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  expected_impact TEXT,
  confidence_score DECIMAL(3, 2),
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented', 'snoozed')),
  target_metrics JSONB,
  implemented_by UUID REFERENCES profiles(id),
  implemented_at TIMESTAMPTZ,
  implementation_notes TEXT,
  actual_results JSONB,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES profiles(id),
  dismiss_reason TEXT,
  ai_model_version TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI briefs table (AI-generated daily/weekly summaries)
CREATE TABLE IF NOT EXISTS ai_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
  brief_type TEXT NOT NULL CHECK (brief_type IN ('daily', 'weekly', 'monthly', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary TEXT NOT NULL,
  key_highlights JSONB DEFAULT '[]',
  concerns JSONB DEFAULT '[]',
  opportunities JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  performance_metrics JSONB DEFAULT '{}',
  comparison_period_metrics JSONB DEFAULT '{}',
  sentiment_analysis JSONB,
  ai_model_version TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_by UUID[] DEFAULT '{}',
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat queries table (AI chat history)
CREATE TABLE IF NOT EXISTS chat_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  query_text TEXT NOT NULL,
  response_text TEXT,
  context_data JSONB,
  intent_classification TEXT,
  entities_extracted JSONB,
  query_type TEXT CHECK (query_type IN ('sales', 'inventory', 'analytics', 'general', 'troubleshooting')),
  response_time_ms INTEGER,
  was_helpful BOOLEAN,
  follow_up_questions JSONB,
  ai_model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DATA IMPORTS
-- ============================================

-- Imports table (for tracking bulk data imports)
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

-- Import row details table (for detailed error tracking)
CREATE TABLE IF NOT EXISTS import_row_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  row_data JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error', 'warning')),
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Product indexes
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));

-- Product categories indexes
CREATE INDEX idx_categories_store ON product_categories(store_id);
CREATE INDEX idx_categories_parent ON product_categories(parent_category_id);

-- Inventory indexes
CREATE INDEX idx_inventory_snapshots_store ON inventory_snapshots(store_id);
CREATE INDEX idx_inventory_snapshots_product ON inventory_snapshots(product_id);
CREATE INDEX idx_inventory_snapshots_location ON inventory_snapshots(location_id);
CREATE INDEX idx_inventory_snapshots_date ON inventory_snapshots(snapshot_date);
CREATE INDEX idx_inventory_movements_store ON inventory_movements(store_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at);

-- Sales indexes
CREATE INDEX idx_receipts_store ON sales_receipts(store_id);
CREATE INDEX idx_receipts_location ON sales_receipts(location_id);
CREATE INDEX idx_receipts_date ON sales_receipts(transaction_date);
CREATE INDEX idx_receipts_number ON sales_receipts(receipt_number);
CREATE INDEX idx_receipts_cashier ON sales_receipts(cashier_id);
CREATE INDEX idx_receipts_status ON sales_receipts(payment_status);
CREATE INDEX idx_line_items_receipt ON sale_line_items(receipt_id);
CREATE INDEX idx_line_items_product ON sale_line_items(product_id);

-- Refund and void indexes
CREATE INDEX idx_refunds_store ON refund_events(store_id);
CREATE INDEX idx_refunds_receipt ON refund_events(receipt_id);
CREATE INDEX idx_voids_store ON void_events(store_id);
CREATE INDEX idx_voids_receipt ON void_events(receipt_id);

-- Metrics indexes
CREATE INDEX idx_daily_metrics_store ON daily_metrics(store_id);
CREATE INDEX idx_daily_metrics_location ON daily_metrics(location_id);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date);
CREATE INDEX idx_hourly_metrics_store ON hourly_metrics(store_id);
CREATE INDEX idx_hourly_metrics_hour ON hourly_metrics(metric_hour);

-- AI and notification indexes
CREATE INDEX idx_alerts_store ON alerts(store_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_read ON alerts(is_read) WHERE is_read = false;
CREATE INDEX idx_alerts_created ON alerts(created_at);
CREATE INDEX idx_recommendations_store ON recommendations(store_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);
CREATE INDEX idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX idx_ai_briefs_store ON ai_briefs(store_id);
CREATE INDEX idx_ai_briefs_type ON ai_briefs(brief_type);
CREATE INDEX idx_ai_briefs_period ON ai_briefs(period_start, period_end);
CREATE INDEX idx_chat_queries_store ON chat_queries(store_id);
CREATE INDEX idx_chat_queries_user ON chat_queries(user_id);
CREATE INDEX idx_chat_queries_session ON chat_queries(session_id);
CREATE INDEX idx_chat_queries_created ON chat_queries(created_at);

-- Import indexes
CREATE INDEX idx_imports_store ON imports(store_id);
CREATE INDEX idx_imports_status ON imports(status);
CREATE INDEX idx_imports_type ON imports(import_type);
CREATE INDEX idx_import_row_details_import ON import_row_details(import_id);
CREATE INDEX idx_import_row_details_status ON import_row_details(status);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE void_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_row_details ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has store access
CREATE OR REPLACE FUNCTION user_has_store_access(store_uuid UUID, required_role TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM stores
    WHERE id = store_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM store_members
    WHERE store_id = store_uuid
    AND user_id = auth.uid()
    AND (required_role IS NULL OR
         (required_role = 'admin' AND role IN ('owner', 'admin')) OR
         (required_role = 'manager' AND role IN ('owner', 'admin', 'manager')) OR
         (required_role = 'staff' AND role IN ('owner', 'admin', 'manager', 'staff')))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Product categories RLS
CREATE POLICY "Store members can view categories" ON product_categories
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store admins can manage categories" ON product_categories
  FOR ALL USING (user_has_store_access(store_id, 'admin'));

-- Products RLS
CREATE POLICY "Store members can view products" ON products
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store admins can manage products" ON products
  FOR ALL USING (user_has_store_access(store_id, 'admin'));

CREATE POLICY "Store staff can update product stock" ON products
  FOR UPDATE USING (user_has_store_access(store_id, 'staff'))
  WITH CHECK (user_has_store_access(store_id, 'staff'));

-- Inventory RLS
CREATE POLICY "Store members can view inventory" ON inventory_snapshots
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store admins can manage inventory" ON inventory_snapshots
  FOR ALL USING (user_has_store_access(store_id, 'admin'));

CREATE POLICY "Store staff can create inventory snapshots" ON inventory_snapshots
  FOR INSERT WITH CHECK (user_has_store_access(store_id, 'staff'));

CREATE POLICY "Store members can view movements" ON inventory_movements
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store staff can create movements" ON inventory_movements
  FOR INSERT WITH CHECK (user_has_store_access(store_id, 'staff'));

-- Sales RLS
CREATE POLICY "Store members can view receipts" ON sales_receipts
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store staff can create receipts" ON sales_receipts
  FOR INSERT WITH CHECK (user_has_store_access(store_id, 'staff'));

CREATE POLICY "Store managers can update receipts" ON sales_receipts
  FOR UPDATE USING (user_has_store_access(store_id, 'manager'));

CREATE POLICY "Store members can view line items" ON sale_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales_receipts r
      WHERE r.id = receipt_id AND user_has_store_access(r.store_id)
    )
  );

CREATE POLICY "Store staff can create line items" ON sale_line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_receipts r
      WHERE r.id = receipt_id AND user_has_store_access(r.store_id, 'staff')
    )
  );

-- Refund RLS
CREATE POLICY "Store members can view refunds" ON refund_events
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store managers can process refunds" ON refund_events
  FOR ALL USING (user_has_store_access(store_id, 'manager'));

-- Void RLS
CREATE POLICY "Store members can view voids" ON void_events
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store managers can create voids" ON void_events
  FOR INSERT WITH CHECK (user_has_store_access(store_id, 'manager'));

-- Metrics RLS (read-only for members, admin can manage)
CREATE POLICY "Store members can view daily metrics" ON daily_metrics
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "System can manage daily metrics" ON daily_metrics
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Store members can view hourly metrics" ON hourly_metrics
  FOR SELECT USING (user_has_store_access(store_id));

-- Alerts RLS
CREATE POLICY "Store members can view alerts" ON alerts
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store admins can manage alerts" ON alerts
  FOR ALL USING (user_has_store_access(store_id, 'admin'));

CREATE POLICY "Store members can update their alert status" ON alerts
  FOR UPDATE USING (user_has_store_access(store_id))
  WITH CHECK (user_has_store_access(store_id));

-- Recommendations RLS
CREATE POLICY "Store members can view recommendations" ON recommendations
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "System can create recommendations" ON recommendations
  FOR INSERT WITH CHECK (user_has_store_access(store_id));

CREATE POLICY "Store admins can manage recommendations" ON recommendations
  FOR UPDATE USING (user_has_store_access(store_id, 'admin'));

-- AI Briefs RLS
CREATE POLICY "Store members can view AI briefs" ON ai_briefs
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "System can create AI briefs" ON ai_briefs
  FOR INSERT WITH CHECK (user_has_store_access(store_id));

-- Chat queries RLS
CREATE POLICY "Users can view their own queries" ON chat_queries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Store admins can view all store queries" ON chat_queries
  FOR SELECT USING (user_has_store_access(store_id, 'admin'));

CREATE POLICY "Users can create queries" ON chat_queries
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Imports RLS
CREATE POLICY "Store members can view imports" ON imports
  FOR SELECT USING (user_has_store_access(store_id));

CREATE POLICY "Store admins can manage imports" ON imports
  FOR ALL USING (user_has_store_access(store_id, 'admin'));

CREATE POLICY "Store managers can initiate imports" ON imports
  FOR INSERT WITH CHECK (user_has_store_access(store_id, 'manager'));

CREATE POLICY "Store members can view import details" ON import_row_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM imports i
      WHERE i.id = import_id AND user_has_store_access(i.store_id)
    )
  );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sales_receipts_updated_at
  BEFORE UPDATE ON sales_receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_refund_events_updated_at
  BEFORE UPDATE ON refund_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_daily_metrics_updated_at
  BEFORE UPDATE ON daily_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chat_queries_updated_at
  BEFORE UPDATE ON chat_queries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_imports_updated_at
  BEFORE UPDATE ON imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS FOR CONVENIENCE
-- ============================================

-- Current inventory view
CREATE OR REPLACE VIEW current_inventory AS
SELECT DISTINCT ON (store_id, location_id, product_id)
  s.*,
  p.name as product_name,
  p.sku,
  p.selling_price,
  p.min_stock_level,
  p.reorder_point
FROM inventory_snapshots s
JOIN products p ON p.id = s.product_id
ORDER BY store_id, location_id, product_id, snapshot_date DESC;

-- Daily sales summary view
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  store_id,
  location_id,
  DATE(transaction_date) as sale_date,
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_sales,
  SUM(tax_amount) as total_tax,
  SUM(discount_amount) as total_discounts,
  SUM(subtotal) as total_subtotal,
  COUNT(DISTINCT cashier_id) as unique_cashiers
FROM sales_receipts
WHERE is_voided = false
GROUP BY store_id, location_id, DATE(transaction_date);

-- Low stock alerts view
CREATE OR REPLACE VIEW low_stock_items AS
SELECT
  p.id as product_id,
  p.store_id,
  p.name,
  p.sku,
  p.min_stock_level,
  p.reorder_point,
  COALESCE(ci.quantity, 0) as current_quantity,
  p.supplier_name,
  p.reorder_quantity
FROM products p
LEFT JOIN current_inventory ci ON ci.product_id = p.id
WHERE p.is_active = true
AND COALESCE(ci.quantity, 0) <= p.reorder_point;
