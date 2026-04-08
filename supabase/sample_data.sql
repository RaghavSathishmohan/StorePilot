
-- Continue with refunds, voids, and daily metrics
DO $$
DECLARE
  v_store_id UUID;
  v_location_id UUID;
  v_cashier_ids UUID[];
  receipt_record RECORD;
  v_suspicious_cashier UUID;
BEGIN
  -- Get store info
  SELECT id INTO v_store_id FROM stores WHERE slug = 'quickstop-market' LIMIT 1;
  SELECT id INTO v_location_id FROM store_locations WHERE store_id = v_store_id AND name = 'Main Street Store';

  -- Get cashier IDs
  SELECT ARRAY_AGG(id) INTO v_cashier_ids FROM profiles WHERE email LIKE '%@quickstop.com';
  -- Alice Johnson is the suspicious cashier (ANOMALY #6)
  SELECT id INTO v_suspicious_cashier FROM profiles WHERE email = 'alice.cashier@quickstop.com';

-- ============================================
-- REFUND EVENTS (Normal + Suspicious)
-- ============================================

-- Normal refunds (~2% of receipts)
INSERT INTO refund_events (store_id, receipt_id, line_item_id, refund_number, original_amount, refund_amount, refund_quantity, reason, processed_by, approval_status, refund_method, processed_at)
SELECT
  v_store_id,
  r.id,
  li.id,
  'RFND-' || to_char(r.transaction_date, 'YYYYMMDD') || '-' || LPAD(i::text, 4, '0'),
  li.total_amount,
  li.total_amount * 0.5, -- Partial refund
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

-- SUSPICIOUS REFUNDS for Alice (ANOMALY #6) - Much higher rate
INSERT INTO refund_events (store_id, receipt_id, line_item_id, refund_number, original_amount, refund_amount, refund_quantity, reason, processed_by, approval_status, refund_method, processed_at)
SELECT
  v_store_id,
  r.id,
  li.id,
  'RFND-SUSP-' || to_char(r.transaction_date, 'YYYYMMDD') || '-' || LPAD(i::text, 4, '0'),
  li.total_amount,
  li.total_amount, -- FULL refunds (suspicious)
  li.quantity,
  'Customer complaint', -- Generic reason
  v_suspicious_cashier,
  'approved',
  'cash', -- Cash refunds (easier to manipulate)
  r.transaction_date + INTERVAL '30 minutes'
FROM sales_receipts r
JOIN sale_line_items li ON li.receipt_id = r.id
CROSS JOIN generate_series(1, 25) i
WHERE r.store_id = v_store_id
AND r.cashier_id = v_suspicious_cashier
AND random() < 0.15 -- 15% of Alice's receipts have refunds (vs 2% normal)
LIMIT 25;

RAISE NOTICE 'Refund events created (including suspicious activity)';

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
-- DAILY METRICS (30 days of aggregated data)
-- ============================================

INSERT INTO daily_metrics (store_id, location_id, metric_date, total_sales, total_transactions, total_items_sold, total_tax_collected, total_discounts, total_refunds, gross_profit, unique_customers, new_customers, returning_customers, low_stock_items, out_of_stock_items)
SELECT
  v_store_id,
  v_location_id,
  CURRENT_DATE - (30 - i),
  COALESCE((SELECT SUM(total_amount) FROM sales_receipts WHERE DATE(transaction_date) = CURRENT_DATE - (30 - i) AND store_id = v_store_id), 0),
  COALESCE((SELECT COUNT(*) FROM sales_receipts WHERE DATE(transaction_date) = CURRENT_DATE - (30 - i) AND store_id = v_store_id), 0),
  COALESCE((SELECT SUM(quantity) FROM sale_line_items li JOIN sales_receipts r ON r.id = li.receipt_id WHERE DATE(r.transaction_date) = CURRENT_DATE - (30 - i) AND r.store_id = v_store_id), 0),
  COALESCE((SELECT SUM(tax_amount) FROM sales_receipts WHERE DATE(transaction_date) = CURRENT_DATE - (30 - i) AND store_id = v_store_id), 0),
  COALESCE((SELECT SUM(discount_amount) FROM sales_receipts WHERE DATE(transaction_date) = CURRENT_DATE - (30 - i) AND store_id = v_store_id), 0),
  COALESCE((SELECT SUM(refund_amount) FROM refund_events WHERE DATE(processed_at) = CURRENT_DATE - (30 - i) AND store_id = v_store_id), 0),
  COALESCE((SELECT SUM(li.total_amount - (li.quantity * li.cost_price)) FROM sale_line_items li JOIN sales_receipts r ON r.id = li.receipt_id WHERE DATE(r.transaction_date) = CURRENT_DATE - (30 - i) AND r.store_id = v_store_id), 0),
  30 + (random() * 20)::int,
  5 + (random() * 10)::int,
  25 + (random() * 15)::int,
  2,
  1
FROM generate_series(1, 30) i;

-- Update low stock and out of stock counts based on actual inventory
UPDATE daily_metrics SET
  low_stock_items = 5,
  out_of_stock_items = 0
WHERE store_id = v_store_id;

RAISE NOTICE 'Daily metrics created';

-- ============================================
-- HOURLY METRICS (Sample for last 7 days)
-- ============================================

INSERT INTO hourly_metrics (store_id, location_id, metric_hour, sales_amount, transaction_count, items_sold, customer_count)
SELECT
  v_store_id,
  v_location_id,
  CURRENT_DATE - (7 - d.i) + (h.i * INTERVAL '1 hour'),
  CASE
    WHEN h.i BETWEEN 7 AND 9 THEN 500 + (random() * 300)   -- Morning rush
    WHEN h.i BETWEEN 12 AND 14 THEN 800 + (random() * 400) -- Lunch rush
    WHEN h.i BETWEEN 17 AND 20 THEN 1000 + (random() * 500) -- Evening peak
    ELSE 100 + (random() * 200) -- Slow hours
  END,
  CASE
    WHEN h.i BETWEEN 7 AND 9 THEN 20 + (random() * 10)::int
    WHEN h.i BETWEEN 12 AND 14 THEN 35 + (random() * 15)::int
    WHEN h.i BETWEEN 17 AND 20 THEN 45 + (random() * 20)::int
    ELSE 5 + (random() * 8)::int
  END,
  CASE
    WHEN h.i BETWEEN 7 AND 9 THEN 40 + (random() * 20)::int
    WHEN h.i BETWEEN 12 AND 14 THEN 70 + (random() * 30)::int
    WHEN h.i BETWEEN 17 AND 20 THEN 90 + (random() * 40)::int
    ELSE 10 + (random() * 15)::int
  END,
  CASE
    WHEN h.i BETWEEN 7 AND 9 THEN 25 + (random() * 10)::int
    WHEN h.i BETWEEN 12 AND 14 THEN 40 + (random() * 15)::int
    WHEN h.i BETWEEN 17 AND 20 THEN 50 + (random() * 20)::int
    ELSE 8 + (random() * 8)::int
  END
FROM generate_series(1, 7) d(i)
CROSS JOIN generate_series(0, 23) h(i);

RAISE NOTICE 'Hourly metrics created';

-- ============================================
-- ALERTS (Various types)
-- ============================================

-- Low stock alerts for energy drink and soda
INSERT INTO alerts (store_id, location_id, alert_type, severity, title, description, related_entity_type, related_entity_id, is_read, created_at)
VALUES
  (v_store_id, v_location_id, 'low_stock', 'critical', 'Critical: Energy Drink Low Stock', 'Mega Energy Drink Original (BEV-001) is below reorder point. Current stock: 15 units.', 'product', (SELECT id FROM products WHERE sku = 'BEV-001'), false, CURRENT_DATE),
  (v_store_id, v_location_id, 'low_stock', 'critical', 'Critical: Cola Low Stock', 'Cola Supreme 2L (BEV-101) is below reorder point. Current stock: 20 units.', 'product', (SELECT id FROM products WHERE sku = 'BEV-101'), false, CURRENT_DATE),
  (v_store_id, v_location_id, 'slow_moving', 'warning', 'Snacks Category Declining', 'Snack sales have dropped 40% over the past 30 days.', 'category', (SELECT id FROM product_categories WHERE name = 'Snacks' AND store_id = v_store_id), false, CURRENT_DATE - 5),
  (v_store_id, v_location_id, 'inventory_discrepancy', 'warning', 'Suspicious Refund Activity', 'Cashier Alice Johnson has processed 25+ full refunds this month, 7x higher than average.', 'user', v_suspicious_cashier, false, CURRENT_DATE - 2),
  (v_store_id, v_location_id, 'high_demand', 'info', 'Bundle Opportunity: Gum + Candy', 'Gum and Candy bars are frequently purchased together. Consider creating a bundle discount.', 'product', (SELECT id FROM products WHERE sku = 'CND-001'), false, CURRENT_DATE - 1);

-- Dead inventory alerts
INSERT INTO alerts (store_id, location_id, alert_type, severity, title, description, related_entity_type, related_entity_id, is_read, created_at)
SELECT
  v_store_id,
  v_location_id,
  'slow_moving',
  'warning',
  'Dead Inventory: ' || p.name,
  p.name || ' (' || p.sku || ') has not sold any units in 30 days. Consider clearance pricing.',
  'product',
  p.id,
  false,
  CURRENT_DATE - (random() * 10)::int
FROM products p
WHERE p.sku LIKE '%-OLD1'
AND p.store_id = v_store_id;

RAISE NOTICE 'Alerts created';

-- ============================================
-- RECOMMENDATIONS (AI-generated)
-- ============================================

INSERT INTO recommendations (store_id, location_id, recommendation_type, title, description, rationale, expected_impact, confidence_score, priority, status, target_metrics, created_at)
VALUES
  (v_store_id, v_location_id, 'inventory', 'Reorder Energy Drinks Immediately', 'Stock levels critical, risk of stockout within 2 days.', 'Sales velocity is 45 units/day, current stock: 15 units', 'Prevent lost sales of $180/day', 0.95, 1, 'pending', '{"current_stock": 15, "daily_sales": 45, "days_remaining": 0.3}'::jsonb, CURRENT_DATE),
  (v_store_id, v_location_id, 'inventory', 'Reorder Soda 2L Immediately', 'Stock running low on high-velocity item.', 'Sales velocity is 38 units/day, current stock: 20 units', 'Prevent lost sales of $95/day', 0.92, 1, 'pending', '{"current_stock": 20, "daily_sales": 38, "days_remaining": 0.5}'::jsonb, CURRENT_DATE),
  (v_store_id, v_location_id, 'pricing', 'Discount Dead Inventory by 50%', '5 items have not sold in 30+ days.', 'Clear shelf space and recover capital', 'Recover $500+ in capital, free up shelf space', 0.78, 3, 'pending', '{"items": 5, "avg_cost": 2.56}'::jsonb, CURRENT_DATE - 3),
  (v_store_id, v_location_id, 'promotion', 'Create Gum + Candy Bundle', 'Analysis shows 68% of gum buyers also buy candy bars.', 'Increase average transaction value', 'Increase ATV by $0.75, boost candy sales by 15%', 0.84, 2, 'pending', '{"bundle_frequency": 0.68, "current_candy_sales": 320}'::jsonb, CURRENT_DATE - 2),
  (v_store_id, v_location_id, 'operational', 'Review Cashier Alice Refund Pattern', 'Refund rate 7x higher than other cashiers, mostly full cash refunds.', 'Potential training issue or policy violation', 'Reduce shrink by $200+/month, improve controls', 0.88, 2, 'pending', '{"refund_rate": 0.15, "avg_rate": 0.02, "cash_percentage": 0.8}'::jsonb, CURRENT_DATE - 1);

RAISE NOTICE 'Recommendations created';

-- ============================================
-- AI BRIEFS (Sample daily brief)
-- ============================================

INSERT INTO ai_briefs (store_id, location_id, brief_type, period_start, period_end, summary, key_highlights, concerns, opportunities, action_items, performance_metrics, created_at)
VALUES (
  v_store_id,
  v_location_id,
  'daily',
  CURRENT_DATE - 1,
  CURRENT_DATE,
  'Yesterday was a solid sales day with $3,240 in revenue, up 8% from the previous day. However, inventory management requires immediate attention with two critical items near stockout and concerning patterns in refund activity.',
  '["Revenue up 8% vs previous day", "Energy drink sales exceeded forecast by 22%", "Evening rush hour (6-8pm) drove 35% of daily sales"]'::jsonb,
  '["Energy Drink (BEV-001) critically low - only 15 units remaining", "Cola 2L (BEV-101) approaching reorder point", "Cashier Alice refund rate 7x higher than peers", "Snacks category sales declining 40% over 30 days"]'::jsonb,
  '["Bundle discount on Gum + Candy could increase ATV", "Dead inventory clearance could free up $500 capital", "Peak hour staffing optimization potential"]'::jsonb,
  '["Reorder energy drinks and soda TODAY", "Review Alice refund transactions from last 7 days", "Create gum+candy bundle promotion", "Mark down dead inventory items"]'::jsonb,
  '{"revenue": 3240.00, "transactions": 89, "atv": 36.40, "gross_profit": 1280.50, "inventory_value": 45200.00}'::jsonb,
  CURRENT_DATE
);

RAISE NOTICE 'AI briefs created';

-- ============================================
-- CHAT QUERIES (Sample conversation history)
-- ============================================

INSERT INTO chat_queries (store_id, user_id, session_id, query_text, response_text, query_type, intent_classification, response_time_ms, was_helpful, created_at)
VALUES
  (v_store_id, v_cashier_ids[1], 'session-001', 'How are sales today?', 'Today''s sales are $3,240 with 89 transactions, up 8% from yesterday. Your best selling items are Energy Drinks and Cola.', 'sales', 'sales_summary', 450, true, CURRENT_DATE),
  (v_store_id, v_cashier_ids[1], 'session-001', 'What items are low on stock?', 'You have 2 critical items: Energy Drink Original (15 units) and Cola Supreme 2L (20 units). Both need immediate reorder.', 'inventory', 'inventory_status', 320, true, CURRENT_DATE),
  (v_store_id, v_cashier_ids[2], 'session-002', 'Why are snacks not selling?', 'Snack sales are down 40% over the past 30 days. Consider rotating displays, discounting slow movers, or running a promotion.', 'analytics', 'trend_analysis', 680, true, CURRENT_DATE - 1),
  (v_store_id, v_cashier_ids[1], 'session-001', 'Which products should I bundle?', 'Gum and Candy Bars show 68% co-purchase rate. A bundle discount could increase average transaction value by $0.75.', 'analytics', 'recommendation', 520, true, CURRENT_DATE);

RAISE NOTICE 'Chat queries created';

-- ============================================
-- IMPORTS (Sample import history)
-- ============================================

INSERT INTO imports (store_id, import_type, file_name, file_size_bytes, file_format, status, total_rows, processed_rows, successful_rows, failed_rows, initiated_by, started_at, completed_at, processing_time_ms, notes)
VALUES
  (v_store_id, 'products', 'product_catalog_v1.csv', 245000, 'csv', 'completed', 450, 450, 448, 2, v_cashier_ids[1], CURRENT_DATE - 30, CURRENT_DATE - 30 + INTERVAL '5 minutes', 284000, 'Initial product import - 2 SKUs failed validation'),
  (v_store_id, 'inventory', 'stock_count_2024-02-15.csv', 128000, 'csv', 'completed', 450, 450, 450, 0, v_cashier_ids[1], CURRENT_DATE - 15, CURRENT_DATE - 15 + INTERVAL '3 minutes', 156000, 'Physical inventory count import'),
  (v_store_id, 'sales', 'historical_sales_2024.csv', 512000, 'csv', 'processing', 1500, 800, 795, 5, v_cashier_ids[2], CURRENT_DATE - 1, NULL, NULL, 'Import in progress...'),
  (v_store_id, 'customers', 'loyalty_members.csv', 64000, 'csv', 'failed', 250, 0, 0, 250, v_cashier_ids[3], CURRENT_DATE - 5, CURRENT_DATE - 5 + INTERVAL '1 minute', 45000, 'Failed: Invalid email format in 250 rows');

RAISE NOTICE 'Imports created';

-- ============================================
-- IMPORT ROW DETAILS (Sample)
-- ============================================

INSERT INTO import_row_details (import_id, row_number, row_data, status, error_message)
SELECT
  i.id,
  row_num.i,
  jsonb_build_object('sku', 'INVALID-' || row_num.i, 'name', 'Unknown Product'),
  'error',
  'SKU not found in product catalog'
FROM imports i
CROSS JOIN generate_series(1, 5) row_num(i)
WHERE i.store_id = v_store_id
AND i.status = 'completed';

RAISE NOTICE 'Import row details created';

RAISE NOTICE '========================================';
RAISE NOTICE 'SAMPLE DATA CREATION COMPLETE!';
RAISE NOTICE '========================================';
RAISE NOTICE 'Store: QuickStop Market';
RAISE NOTICE 'Products: ~450 (including 5 dead inventory)';
RAISE NOTICE 'Sales: 30 days of data';
RAISE NOTICE 'Anomalies created:';
RAISE NOTICE '  1. Energy Drink (BEV-001) - Near stockout';
RAISE NOTICE '  2. Cola 2L (BEV-101) - Near stockout';
RAISE NOTICE '  3. Snacks category - Sales declining 40%';
RAISE NOTICE '  4. 5 Dead inventory items - No sales in 30 days';
RAISE NOTICE '  5. Gum + Candy - Bundle opportunity (68% co-purchase)';
RAISE NOTICE '  6. Cashier Alice - Suspicious refund activity (7x normal rate)';
RAISE NOTICE '========================================';

END $$;
