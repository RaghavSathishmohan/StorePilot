-- StorePilot Multi-Tenant SaaS Database Schema (Complete)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store locations table
CREATE TABLE IF NOT EXISTS store_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store members table (for multi-user access)
CREATE TABLE IF NOT EXISTS store_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

-- Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
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
  unit_of_measure TEXT DEFAULT 'each',
  cost_price DECIMAL(10, 2),
  selling_price DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) DEFAULT 0.0825,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, sku)
);

-- Inventory table (tracks stock at specific locations)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  unit_cost DECIMAL(10, 2),
  location_name TEXT,
  last_counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, location_id, product_id)
);

-- Sales/Transactions table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
  transaction_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'debit', 'mobile', 'other')),
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'refunded', 'voided')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'refunded')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, transaction_number)
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory movements table (audit log)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'return', 'transfer_in', 'transfer_out', 'count')),
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data imports table
CREATE TABLE IF NOT EXISTS data_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('products', 'inventory', 'sales', 'customers')),
  file_name TEXT NOT NULL,
  file_size INTEGER,
  row_count INTEGER,
  processed_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_log TEXT,
  mapping_config JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Store settings table
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, setting_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_store_members_user ON store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store ON store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_store ON store_locations(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_categories_store ON product_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON inventory_movements(created_at);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS (SECURITY DEFINER to prevent recursion)
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

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for stores
CREATE POLICY "Store owners can manage their stores" ON stores
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Store members can view stores" ON stores
  FOR SELECT USING (
    is_store_member(id, auth.uid())
  );

-- RLS Policies for store_locations
CREATE POLICY "Store owners can manage locations" ON store_locations
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

CREATE POLICY "Store members can view locations" ON store_locations
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- RLS Policies for store_members
CREATE POLICY "Store owners can manage members" ON store_members
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

CREATE POLICY "Users can view their memberships" ON store_members
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for product_categories
CREATE POLICY "Store owners can manage categories" ON product_categories
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

CREATE POLICY "Store members can view categories" ON product_categories
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- RLS Policies for products
CREATE POLICY "Store owners can manage products" ON products
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

CREATE POLICY "Store members can view products" ON products
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- RLS Policies for inventory
CREATE POLICY "Store owners can manage inventory" ON inventory
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

CREATE POLICY "Store members can view inventory" ON inventory
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- RLS Policies for sales
CREATE POLICY "Store owners can manage sales" ON sales
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

CREATE POLICY "Store members can view sales" ON sales
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- RLS Policies for sale_items
CREATE POLICY "Store owners can manage sale items" ON sale_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales WHERE id = sale_items.sale_id
      AND is_store_owner(store_id, auth.uid())
    )
  );

CREATE POLICY "Store members can view sale items" ON sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales WHERE id = sale_items.sale_id
      AND (is_store_member(store_id, auth.uid()) OR is_store_owner(store_id, auth.uid()))
    )
  );

-- RLS Policies for inventory_movements
CREATE POLICY "Store owners can manage movements" ON inventory_movements
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

CREATE POLICY "Store members can view movements" ON inventory_movements
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- RLS Policies for data_imports
CREATE POLICY "Store owners can manage imports" ON data_imports
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

CREATE POLICY "Store members can view imports" ON data_imports
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- RLS Policies for store_settings
CREATE POLICY "Store owners can manage settings" ON store_settings
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

CREATE POLICY "Store members can view settings" ON store_settings
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_store_locations_updated_at ON store_locations;
CREATE TRIGGER update_store_locations_updated_at
  BEFORE UPDATE ON store_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_store_members_updated_at ON store_members;
CREATE TRIGGER update_store_members_updated_at
  BEFORE UPDATE ON store_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_product_categories_updated_at ON product_categories;
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_store_settings_updated_at ON store_settings;
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to update inventory on sale
CREATE OR REPLACE FUNCTION process_sale_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Reduce inventory quantity for the sold product
  UPDATE inventory
  SET
    quantity = quantity - NEW.quantity,
    updated_at = NOW()
  WHERE product_id = NEW.product_id
    AND EXISTS (
      SELECT 1 FROM sales WHERE id = NEW.sale_id AND store_id = inventory.store_id
    );

  -- Record the movement
  INSERT INTO inventory_movements (
    store_id,
    inventory_id,
    product_id,
    movement_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reference_id,
    reference_type,
    notes
  )
  SELECT
    s.store_id,
    i.id,
    NEW.product_id,
    'sale',
    -NEW.quantity,
    i.quantity + NEW.quantity,
    i.quantity,
    NEW.sale_id,
    'sale',
    'Sale transaction'
  FROM sales s
  JOIN inventory i ON i.product_id = NEW.product_id AND i.store_id = s.store_id
  WHERE s.id = NEW.sale_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for sale items
DROP TRIGGER IF EXISTS on_sale_item_created ON sale_items;
CREATE TRIGGER on_sale_item_created
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION process_sale_inventory();
