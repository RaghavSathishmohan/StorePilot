-- Fix for Infinite Recursion in RLS Policies
-- Run this in your Supabase SQL Editor

-- Drop existing recursive policies on stores table
DROP POLICY IF EXISTS "Store members can view stores" ON stores;
DROP POLICY IF EXISTS "Store owners can manage their stores" ON stores;

-- Drop existing policies on store_locations that may also cause issues
DROP POLICY IF EXISTS "Store owners can manage locations" ON store_locations;
DROP POLICY IF EXISTS "Store members can view locations" ON store_locations;

-- Create helper functions with SECURITY DEFINER to bypass RLS recursion
-- These functions run with the privileges of the function owner, not the user

-- Function to check if user is a store member
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

-- Function to check if user is a store owner
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

-- Function to check if user owns a store by owner_id directly
CREATE OR REPLACE FUNCTION owns_store(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p_owner_id = auth.uid();
$$;

-- Recreate stores policies using the helper functions

-- Policy 1: Store owners can manage their stores
CREATE POLICY "Store owners can manage their stores" ON stores
  FOR ALL USING (owner_id = auth.uid());

-- Policy 2: Store members can view stores (using SECURITY DEFINER function)
CREATE POLICY "Store members can view stores" ON stores
  FOR SELECT USING (
    is_store_member(id, auth.uid())
  );

-- Recreate store_locations policies using helper functions

-- Policy 1: Store owners can manage locations
CREATE POLICY "Store owners can manage locations" ON store_locations
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );

-- Policy 2: Store members can view locations
CREATE POLICY "Store members can view locations" ON store_locations
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- Also fix store_members policy if needed
DROP POLICY IF EXISTS "Store owners can manage members" ON store_members;

CREATE POLICY "Store owners can manage members" ON store_members
  FOR ALL USING (
    is_store_owner(store_id, auth.uid())
  );
