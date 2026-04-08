-- Add physical_location column for storing physical areas within a store location
-- Run this in your Supabase SQL Editor

-- Add physical_location to inventory_snapshots
ALTER TABLE inventory_snapshots
ADD COLUMN IF NOT EXISTS physical_location TEXT;

-- Add physical_location to sales_receipts
ALTER TABLE sales_receipts
ADD COLUMN IF NOT EXISTS physical_location TEXT;

-- Add notes column to sales_receipts (missing column)
ALTER TABLE sales_receipts
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add physical_location to sale_line_items (for per-item location tracking)
ALTER TABLE sale_line_items
ADD COLUMN IF NOT EXISTS physical_location TEXT;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_physical_location
ON inventory_snapshots(physical_location);

CREATE INDEX IF NOT EXISTS idx_sales_receipts_physical_location
ON sales_receipts(physical_location);

COMMENT ON COLUMN inventory_snapshots.physical_location IS 'Physical area within the location (e.g., Main Floor, Cooler, Front Counter) - used for filtering';
COMMENT ON COLUMN sales_receipts.physical_location IS 'Physical area within the location (e.g., Main Floor, Cooler, Front Counter) - used for filtering';
