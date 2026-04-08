-- Fix imports schema for unified import type and mapping accuracy

-- Add unified to the import_type check constraint
ALTER TABLE imports DROP CONSTRAINT IF EXISTS imports_import_type_check;
ALTER TABLE imports ADD CONSTRAINT imports_import_type_check
  CHECK (import_type IN ('products', 'inventory', 'sales', 'customers', 'suppliers', 'categories', 'unified'));

-- Add mapping_accuracy column to store the accuracy percentage
ALTER TABLE imports ADD COLUMN IF NOT EXISTS mapping_accuracy INTEGER;

-- Add column_mapping_details to store full mapping with accuracy per field
ALTER TABLE imports ADD COLUMN IF NOT EXISTS column_mapping_details JSONB;

-- Create index for faster import lookups by accuracy
CREATE INDEX IF NOT EXISTS idx_imports_accuracy ON imports(mapping_accuracy) WHERE mapping_accuracy IS NOT NULL;
