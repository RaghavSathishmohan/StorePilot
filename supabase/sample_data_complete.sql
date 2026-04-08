
-- PART 3: INVENTORY SNAPSHOTS AND SALES DATA
DO $$
DECLARE
  v_store_id UUID;
  v_location_id UUID;
  v_location2_id UUID;
  v_user_id UUID;
  v_alice_id UUID;
  v_bob_id UUID;
  v_carol_id UUID;
  v_energy_drink_id UUID;
  v_soda_id UUID;
  v_snacks_cat UUID;
  v_product RECORD;
  v_cashier_ids UUID[];
BEGIN
  -- Get store info
  SELECT id INTO v_store_id FROM stores WHERE slug = 'quickstop-market' LIMIT 1;
  SELECT id INTO v_location_id FROM store_locations WHERE store_id = v_store_id AND name = 'Main Street Store';
  SELECT id INTO v_location2_id FROM store_locations WHERE store_id = v_store_id AND name = 'Downtown Express';
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  SELECT id INTO v_alice_id FROM profiles WHERE email = 'alice.cashier@quickstop.com';
  SELECT id INTO v_bob_id FROM profiles WHERE email = 'bob.cashier@quickstop.com';
  SELECT id INTO v_carol_id FROM profiles WHERE email = 'carol.manager@quickstop.com';

  v_cashier_ids := ARRAY[v_user_id, v_alice_id, v_bob_id, v_carol_id];

  SELECT id INTO v_energy_drink_id FROM products WHERE sku = 'BEV-001' AND store_id = v_store_id;
  SELECT id INTO v_soda_id FROM products WHERE sku = 'BEV-101' AND store_id = v_store_id;
  SELECT id INTO v_snacks_cat FROM product_categories WHERE name = 'Snacks' AND store_id = v_store_id;

  IF v_store_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Store or user not found';
  END IF;

-- ============================================
-- INVENTORY SNAPSHOTS (30 days of data)
-- ============================================

-- Create inventory snapshots for each product for each day
FOR v_product IN
  SELECT p.id, p.sku, p.category_id, p.cost_price
  FROM products p
  WHERE p.store_id = v_store_id
LOOP
  -- Insert 30 days of snapshots per product
  INSERT INTO inventory_snapshots (store_id, location_id, product_id, quantity, reserved_quantity, unit_cost, snapshot_date, created_by)
  SELECT
    v_store_id,
    v_location_id,
    v_product.id,
    CASE
      -- ANOMALY #1: Energy drink - critically low stock (sells 45/day, only 15 left)
      WHEN v_product.sku = 'BEV-001' THEN GREATEST(15 - (day * 2), 5)
      -- ANOMALY #2: Soda - low stock (sells 38/day, only 20 left)
      WHEN v_product.sku = 'BEV-101' THEN GREATEST(20 - (day * 2), 8)
      -- ANOMALY #3: Snacks - declining (slower movement)
      WHEN v_product.category_id = v_snacks_cat THEN GREATEST(80 - (day * 3), 20)
      -- ANOMALY #4: Dead inventory - stagnant (no sales = no movement)
      WHEN v_product.sku LIKE '%-OLD1' THEN 40
      -- Default: healthy inventory with normal depletion
      ELSE GREATEST(100 + (random() * 50)::int - (day * 2), 30)
    END,
    CASE WHEN random() < 0.1 THEN 3 ELSE 0 END,
    v_product.cost_price,
    CURRENT_DATE - (30 - day),
    v_user_id
  FROM generate_series(1, 30) day;
END LOOP;

RAISE NOTICE 'Inventory snapshots created: 30 days x ~450 products';

-- ============================================
-- SALES RECEIPTS (30 days, ~50 transactions/day)
-- ============================================

INSERT INTO sales_receipts (store_id, location_id, receipt_number, transaction_date, subtotal, tax_amount, discount_amount, total_amount, payment_method, payment_status, customer_name, cashier_id, is_voided)
SELECT
  v_store_id,
  v_location_id,
  'RCPT-' || to_char(CURRENT_DATE - (30 - d.i), 'YYYYMMDD') || '-' || LPAD(((d.i * 100) + h.i)::text, 5, '0'),
  CURRENT_DATE - (30 - d.i) + (h.i * INTERVAL '12 minutes'),
  CASE
    WHEN random() < 0.3 THEN 15.00 + (random() * 20)
    WHEN random() < 0.6 THEN 25.00 + (random() * 30)
    ELSE 45.00 + (random() * 50)
  END,
  0,
  CASE WHEN random() < 0.15 THEN 2.00 + (random() * 5) ELSE 0 END,
  0,
  CASE (random() * 3)::int
    WHEN 0 THEN 'cash'
    WHEN 1 THEN 'card'
    ELSE 'digital_wallet'
  END,
  'completed',
  CASE WHEN random() < 0.3 THEN 'Customer ' || h.i ELSE NULL END,
  v_cashier_ids[(random() * 4)::int + 1],
  false
FROM generate_series(1, 30) d(i)
CROSS JOIN generate_series(1, 50) h(i);

-- Calculate tax and total
UPDATE sales_receipts SET
  tax_amount = ROUND((subtotal * 0.0725)::numeric, 2),
  total_amount = ROUND((subtotal * 1.0725 - discount_amount)::numeric, 2)
WHERE store_id = v_store_id;

RAISE NOTICE 'Sales receipts created: ~1,500 transactions';

-- ============================================
-- SALE LINE ITEMS (Products sold per receipt)
-- ============================================

-- Insert line items for each receipt (2-5 items per receipt on average)
INSERT INTO sale_line_items (receipt_id, product_id, product_name, product_sku, quantity, unit_price, discount_amount, tax_amount, total_amount, cost_price)
SELECT
  r.id,
  p.id,
  p.name,
  p.sku,
  CASE
    -- ANOMALY #1: Energy drink - HIGH velocity (45 units/day)
    WHEN p.sku = 'BEV-001' THEN 2 + (random() * 4)::int
    -- ANOMALY #2: Soda - HIGH velocity (38 units/day)
    WHEN p.sku = 'BEV-101' THEN 1 + (random() * 3)::int
    -- ANOMALY #5: Gum + Candy - Bundle opportunity (frequently bought together)
    WHEN p.sku IN ('CND-001', 'CND-002') THEN 1 + (random() * 2)::int
    -- ANOMALY #3: Snacks - SLOWING down (declining sales)
    WHEN p.category_id = v_snacks_cat THEN CASE WHEN random() < 0.4 THEN 1 ELSE 0 END
    -- ANOMALY #4: Dead inventory - ZERO sales
    WHEN p.sku LIKE '%-OLD1' THEN 0
    -- Default: normal sales
    ELSE CASE WHEN random() < 0.5 THEN 1 ELSE 0 END
  END,
  p.selling_price,
  0,
  0,
  0,
  p.cost_price
FROM sales_receipts r
CROSS JOIN products p
WHERE r.store_id = v_store_id
AND random() < 0.35; -- Each receipt has ~35% chance of each product

-- Calculate line item totals
UPDATE sale_line_items SET
  tax_amount = ROUND((unit_price * quantity * 0.0725)::numeric, 2),
  total_amount = ROUND((unit_price * quantity * 1.0725 - discount_amount)::numeric, 2)
WHERE quantity > 0;

-- Remove zero-quantity line items
DELETE FROM sale_line_items WHERE quantity = 0;

RAISE NOTICE 'Sale line items created';

-- ============================================
-- REFUND EVENTS (Normal + Suspicious)
-- ============================================

-- Normal refunds (~2% of transactions)
INSERT INTO refund_events (store_id, receipt_id, line_item_id, refund_number, original_amount, refund_amount, refund_quantity, reason, processed_by, approval_status, refund_method, processed_at)
SELECT
  v_store_id,
  r.id,
  li.id,
  'RFND-' || to_char(r.transaction_date, 'YYYYMMDD') || '-' || LPAD(i::text, 4, '0'),
  li.total_amount,
  li.total_amount * 0.5,
  li.quantity / 2,
  CASE (random() * 4)::int
    WHEN 0 THEN 'Defective product'
    WHEN 1 THEN 'Wrong item'
    WHEN 2 THEN 'Customer changed mind'
    ELSE 'Product expired'
  END,
  r.cashier_id,
  'approved',
  'original_payment',
  r.transaction_date + INTERVAL '1 hour'
FROM sales_receipts r
JOIN sale_line_items li ON li.receipt_id = r.id
CROSS JOIN generate_series(1, 30) i
WHERE r.store_id = v_store_id
AND random() < 0.02
LIMIT 30;

-- ANOMALY #6: Suspicious refunds by Alice (7x normal rate, full cash refunds)
INSERT INTO refund_events (store_id, receipt_id, line_item_id, refund_number, original_amount, refund_amount, refund_quantity, reason, processed_by, approval_status, refund_method, processed_at)
SELECT
  v_store_id,
  r.id,
  li.id,
  'RFND-SUSP-' || to_char(r.transaction_date, 'YYYYMMDD') || '-' || LPAD(i::text, 4, '0'),
  li.total_amount,
  li.total_amount, -- FULL refunds
  li.quantity,
  'Customer complaint',
  v_alice_id,
  'approved',
  'cash', -- Cash refunds
  r.transaction_date + INTERVAL '30 minutes'
FROM sales_receipts r
JOIN sale_line_items li ON li.receipt_id = r.id
CROSS JOIN generate_series(1, 25) i
WHERE r.store_id = v_store_id
AND r.cashier_id = v_alice_id
AND random() < 0.15
LIMIT 25;

RAISE NOTICE 'Refund events created (including suspicious activity by Alice)';

-- ============================================
-- VOID EVENTS (~1% of receipts)
-- ============================================

INSERT INTO void_events (store_id, receipt_id, void_type, voided_amount, reason, voided_by, original_receipt_data, created_at)
SELECT
  v_store_id,
  r.id,
  CASE (random() * 3)::int
    WHEN 0 THEN 'full'
    WHEN 1 THEN 'partial'
    ELSE 'line_item'
  END,
  r.total_amount,
  CASE (random() * 4)::int
    WHEN 0 THEN 'Payment failed'
    WHEN 1 THEN 'Customer walked out'
    WHEN 2 THEN 'Wrong items scanned'
    ELSE 'System error'
  END,
  r.cashier_id,
  jsonb_build_object('receipt_number', r.receipt_number, 'total', r.total_amount),
  r.transaction_date + INTERVAL '5 minutes'
FROM sales_receipts r
WHERE r.store_id = v_store_id
AND random() < 0.01
LIMIT 15;

RAISE NOTICE 'Void events created';

-- ============================================
-- DAILY METRICS (30 days)
-- ============================================

INSERT INTO daily_metrics (store_id, location_id, metric_date, total_sales, total_transactions, total_items_sold, total_tax_collected, total_discounts, total_refunds, gross_profit, unique_customers, new_customers, returning_customers, low_stock_items, out_of_stock_items)
SELECT
  v_store_id,
  v_location_id,
  CURRENT_DATE - (30 - i),
  COALESCE((SELECT SUM(total_amount) FROM sales_receipts WHERE DATE(transaction_date) = CURRENT_DATE - (30 - i) AND store_id = v_store_id AND is_voided = false), 0),
  COALESCE((SELECT COUNT(*) FROM sales_receipts WHERE DATE(transaction_date) = CURRENT_DATE - (30 - i) AND store_id = v_store_id AND is_voided = false), 0),
  COALESCE((SELECT SUM(quantity) FROM sale_line_items li JOIN sales_receipts r ON r.id = li.receipt_id WHERE DATE(r.transaction_date) = CURRENT_DATE - (30 - i) AND r.store_id = v_store_id AND r.is_voided = false), 0),
  COALESCE((SELECT SUM(tax_amount) FROM sales_receipts WHERE DATE(transaction_date) = CURRENT_DATE - (30 - i) AND store_id = v_store_id AND is_voided = false), 0),
  COALESCE((SELECT SUM(discount_amount) FROM sales_receipts WHERE DATE(transaction_date) = CURRENT_DATE - (30 - i) AND store_id = v_store_id AND is_voided = false), 0),
  COALESCE((SELECT SUM(refund_amount) FROM refund_events WHERE DATE(processed_at) = CURRENT_DATE - (30 - i) AND store_id = v_store_id), 0),
  COALESCE((SELECT SUM(li.total_amount - (li.quantity * COALESCE(li.cost_price, 0))) FROM sale_line_items li JOIN sales_receipts r ON r.id = li.receipt_id WHERE DATE(r.transaction_date) = CURRENT_DATE - (30 - i) AND r.store_id = v_store_id AND r.is_voided = false), 0),
  30 + (random() * 20)::int,
  5 + (random() * 10)::int,
  25 + (random() * 15)::int,
  2,
  0
FROM generate_series(1, 30) i;

-- Update metrics to show low stock for anomalies
UPDATE daily_metrics
SET low_stock_items = 2,
    out_of_stock_items = 0
WHERE store_id = v_store_id;

RAISE NOTICE 'Daily metrics created';

-- ============================================
-- ALERTS (System-generated)
-- ============================================

INSERT INTO alerts (store_id, location_id, alert_type, severity, title, description, related_entity_type, related_entity_id, is_read, created_at)
VALUES
  (v_store_id, v_location_id, 'low_stock', 'critical', 'CRITICAL: Energy Drink Near Stockout', 'Mega Energy Drink (BEV-001) is critically low. Current stock: 15 units. Sales velocity: 45/day. Reorder immediately!', 'product', v_energy_drink_id, false, CURRENT_DATE),
  (v_store_id, v_location_id, 'low_stock', 'critical', 'CRITICAL: Cola 2L Low Stock', 'Cola Supreme 2L (BEV-101) is below reorder point. Current stock: 20 units. Sales velocity: 38/day.', 'product', v_soda_id, false, CURRENT_DATE),
  (v_store_id, v_location_id, 'slow_moving', 'warning', 'Snacks Category Sales Declining', 'Snack sales have dropped 40% over the past 30 days. Consider promotional activities.', 'category', v_snacks_cat, false, CURRENT_DATE - 5),
  (v_store_id, v_location_id, 'inventory_discrepancy', 'warning', 'Suspicious Refund Activity Detected', 'Cashier Alice Johnson has processed 25+ refunds (7x normal rate), mostly full cash refunds. Review recommended.', 'user', v_alice_id, false, CURRENT_DATE - 2);

-- Dead inventory alerts
INSERT INTO alerts (store_id, location_id, alert_type, severity, title, description, related_entity_type, related_entity_id, is_read, created_at)
SELECT
  v_store_id,
  v_location_id,
  'slow_moving',
  'warning',
  'Dead Inventory: ' || p.name,
  p.name || ' has not sold any units in 30 days. Consider clearance pricing to free up capital.',
  'product',
  p.id,
  false,
  CURRENT_DATE - (random() * 10)::int
FROM products p
WHERE p.store_id = v_store_id
AND p.sku LIKE '%-OLD1';

RAISE NOTICE 'Alerts created';

-- ============================================
-- RECOMMENDATIONS (AI-generated insights)
-- ============================================

INSERT INTO recommendations (store_id, location_id, recommendation_type, title, description, rationale, expected_impact, confidence_score, priority, status, target_metrics, created_at)
VALUES
  (v_store_id, v_location_id, 'inventory', 'URGENT: Reorder Energy Drinks', 'Critical stock level - risk of stockout within hours.', 'Selling 45 units/day, only 15 remaining', 'Prevent lost sales of $180/day', 0.95, 1, 'pending', '{"current_stock": 15, "daily_sales": 45}'::jsonb, CURRENT_DATE),
  (v_store_id, v_location_id, 'inventory', 'Reorder Cola 2L Bottles', 'Below reorder point with high velocity.', 'Selling 38 units/day, only 20 remaining', 'Prevent lost sales of $95/day', 0.92, 1, 'pending', '{"current_stock": 20, "daily_sales": 38}'::jsonb, CURRENT_DATE),
  (v_store_id, v_location_id, 'promotion', 'Create Gum + Candy Bundle Discount', '68% of gum purchases include candy bars - bundle opportunity.', 'High co-purchase rate indicates customer preference', 'Increase ATV by $0.75, boost candy sales 15%', 0.84, 2, 'pending', '{"co_purchase_rate": 0.68}'::jsonb, CURRENT_DATE - 2),
  (v_store_id, v_location_id, 'pricing', 'Clearance: Dead Inventory 50% Off', '5 items with zero sales in 30 days.', 'Free up shelf space and recover capital', 'Recover $500+ in capital', 0.78, 3, 'pending', '{"dead_items": 5}'::jsonb, CURRENT_DATE - 3),
  (v_store_id, v_location_id, 'operational', 'Review Cashier Alice Refund Pattern', 'Refund rate 7x higher than peers, 80% cash refunds.', 'Potential training issue or policy concern', 'Reduce shrink by $200+/month', 0.88, 2, 'pending', '{"refund_rate": 0.15, "avg_rate": 0.02}'::jsonb, CURRENT_DATE - 1);

RAISE NOTICE 'Recommendations created';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

RAISE NOTICE '========================================';
RAISE NOTICE 'SAMPLE DATA CREATION COMPLETE!';
RAISE NOTICE '========================================';
RAISE NOTICE 'Store: QuickStop Market';
RAISE NOTICE 'Store ID: %', v_store_id;
RAISE NOTICE 'Owner ID: %', v_user_id;
RAISE NOTICE '========================================';
RAISE NOTICE 'ANOMALIES CREATED:';
RAISE NOTICE '  1. Energy Drink (BEV-001) - CRITICAL: 15 units left';
RAISE NOTICE '  2. Cola 2L (BEV-101) - LOW: 20 units left';
RAISE NOTICE '  3. Snacks category - Sales declining 40%';
RAISE NOTICE '  4. 5 Dead inventory items - Zero sales';
RAISE NOTICE '  5. Gum + Candy - Bundle opportunity (68% co-purchase)';
RAISE NOTICE '  6. Cashier Alice - Suspicious refunds (7x normal rate)';
RAISE NOTICE '========================================';

END $$;
