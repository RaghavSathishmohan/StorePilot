'use server'

import { createServerSupabaseClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface Product {
  id: string
  store_id: string
  category_id: string | null
  sku: string
  name: string
  description: string | null
  barcode: string | null
  unit_of_measure: string
  cost_price: number | null
  selling_price: number
  tax_rate: number
  min_stock_level: number
  max_stock_level: number | null
  reorder_point: number
  reorder_quantity: number | null
  supplier_name: string | null
  supplier_contact: string | null
  is_active: boolean
  is_featured: boolean
  image_url: string | null
  weight_kg: number | null
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
    color_code: string | null
  } | null
}

export interface ProductCategory {
  id: string
  store_id: string
  name: string
  description: string | null
  color_code: string | null
  sort_order: number
  is_active: boolean
}

// ==================== PRODUCT CRUD ====================

export async function getProducts(storeId?: string): Promise<Product[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  let query = supabase
    .from('products')
    .select(`
      *,
      category:category_id (id, name, color_code)
    `)
    .eq('is_active', true)
    .order('name')

  if (storeId) {
    query = query.eq('store_id', storeId)
  } else {
    // Get stores user has access to
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    const storeIds = stores?.map(s => s.store_id) || []

    if (storeIds.length === 0) {
      return []
    }

    query = query.in('store_id', storeIds)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching products:', JSON.stringify(error, null, 2))
    console.error('Error details:', error.message, error.code, error.details)
    return []
  }

  return (data as Product[]) || []
}

export async function getProduct(productId: string): Promise<Product | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:category_id (id, name, color_code)
    `)
    .eq('id', productId)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return null
  }

  return data as Product
}

export async function createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; product?: Product; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data, error } = await (supabase
    .from('products') as any)
    .insert({
      ...productData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating product:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/products')
  return { success: true, product: data as Product }
}

export async function updateProduct(productId: string, updates: Partial<Product>): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { error } = await (supabase
    .from('products') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)

  if (error) {
    console.error('Error updating product:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/products')
  revalidatePath(`/dashboard/products/${productId}`)
  return { success: true }
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  // Soft delete - just mark as inactive
  const { error } = await (supabase
    .from('products') as any)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)

  if (error) {
    console.error('Error deleting product:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/products')
  return { success: true }
}

// ==================== CATEGORIES ====================

export async function getCategories(storeId: string): Promise<ProductCategory[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  return (data as ProductCategory[]) || []
}

export async function createCategory(categoryData: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; category?: ProductCategory; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await (supabase
    .from('product_categories') as any)
    .insert({
      ...categoryData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating category:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/products')
  return { success: true, category: data as ProductCategory }
}

// ==================== INVENTORY ====================

export interface InventoryItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  category_name: string | null
  quantity: number
  reserved_quantity: number
  available_quantity: number
  unit_cost: number | null
  reorder_point: number
  min_stock_level: number
  location_id: string | null
  location_name: string | null
}

export async function getInventory(storeId: string, locationId?: string): Promise<InventoryItem[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('inventory_snapshots')
    .select(`
      id,
      product_id,
      quantity,
      reserved_quantity,
      available_quantity,
      unit_cost,
      location_id,
      store_locations:location_id (name),
      products:product_id (
        name,
        sku,
        reorder_point,
        min_stock_level,
        category:category_id (name)
      )
    `)
    .eq('store_id', storeId)
    .order('snapshot_date', { ascending: false })

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching inventory:', error)
    return []
  }

  // Get latest snapshot per product per location
  const latestInventory = new Map<string, any>()
  data?.forEach((item: any) => {
    const key = `${item.product_id}-${item.location_id || 'null'}`
    if (!latestInventory.has(key)) {
      latestInventory.set(key, item)
    }
  })

  return Array.from(latestInventory.values()).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    product_name: item.products?.name || 'Unknown',
    product_sku: item.products?.sku || '',
    category_name: item.products?.category?.name || null,
    quantity: item.quantity || 0,
    reserved_quantity: item.reserved_quantity || 0,
    available_quantity: item.available_quantity || item.quantity || 0,
    unit_cost: item.unit_cost,
    reorder_point: item.products?.reorder_point || 0,
    min_stock_level: item.products?.min_stock_level || 0,
    location_id: item.location_id,
    location_name: item.store_locations?.name || 'Default',
  }))
}

export async function adjustInventory(
  storeId: string,
  productId: string,
  newQuantity: number,
  locationId: string | null,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get current inventory
  const { data: currentData } = await supabase
    .from('inventory_snapshots')
    .select('quantity')
    .eq('store_id', storeId)
    .eq('product_id', productId)
    .eq('location_id', locationId || '')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  const currentQuantity = (currentData as any)?.quantity || 0
  const adjustment = newQuantity - currentQuantity

  // Create new snapshot
  const { error: snapshotError } = await (supabase
    .from('inventory_snapshots') as any)
    .insert({
      store_id: storeId,
      location_id: locationId,
      product_id: productId,
      quantity: newQuantity,
      reserved_quantity: 0,
      snapshot_date: new Date().toISOString(),
      created_by: user.id,
      notes: reason,
    })

  if (snapshotError) {
    console.error('Error creating inventory snapshot:', snapshotError)
    return { success: false, error: snapshotError.message }
  }

  // Create movement record
  const { error: movementError } = await (supabase
    .from('inventory_movements') as any)
    .insert({
      store_id: storeId,
      location_id: locationId,
      product_id: productId,
      movement_type: adjustment >= 0 ? 'adjustment' : 'waste',
      quantity: adjustment,
      created_by: user.id,
      notes: reason,
    })

  if (movementError) {
    console.error('Error creating movement record:', movementError)
  }

  revalidatePath('/dashboard/inventory')
  return { success: true }
}
