-- Quick check: Verify tables exist in your database
-- Run this in Supabase SQL Editor

SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- This will show you all tables that exist
-- Look for: products, inventory, sales, sale_items, product_categories, data_imports, inventory_movements
