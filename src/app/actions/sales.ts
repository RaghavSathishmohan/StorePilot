'use server'

import { createServerSupabaseClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface SaleItem {
  product_id: string
  quantity: number
  unit_price: number
  discount_amount: number
  total: number
}

export interface SaleReceipt {
  id: string
  store_id: string
  location_id: string | null
  receipt_number: string
  transaction_date: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  payment_method: 'cash' | 'card' | 'mobile' | 'other'
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  loyalty_points_used: number | null
  loyalty_points_earned: number | null
  is_voided: boolean
  void_reason: string | null
  created_at: string
  updated_at: string
  items?: SaleItem[]
}

// ==================== SALES CRUD ====================

export async function getSales(storeId?: string, startDate?: string, endDate?: string): Promise<SaleReceipt[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  let query = supabase
    .from('sales_receipts')
    .select(`
      *,
      items:sale_line_items(*)
    `)
    .eq('is_voided', false)
    .order('transaction_date', { ascending: false })

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

  if (startDate) {
    query = query.gte('transaction_date', startDate)
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching sales:', error)
    return []
  }

  return (data as SaleReceipt[]) || []
}

export async function getSale(saleId: string): Promise<SaleReceipt | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('sales_receipts')
    .select(`
      *,
      items:sale_line_items(*)
    `)
    .eq('id', saleId)
    .single()

  if (error) {
    console.error('Error fetching sale:', error)
    return null
  }

  return data as SaleReceipt
}

export async function createSale(saleData: Omit<SaleReceipt, 'id' | 'created_at' | 'updated_at' | 'receipt_number'>, items: Omit<SaleItem, 'id'>[]): Promise<{ success: boolean; sale?: SaleReceipt; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Generate receipt number
  const receiptNumber = `R-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

  // Start a transaction by using the service client or by doing multiple operations
  const { data: sale, error: saleError } = await (supabase
    .from('sales_receipts') as any)
    .insert({
      ...saleData,
      receipt_number: receiptNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (saleError || !sale) {
    console.error('Error creating sale:', saleError)
    return { success: false, error: saleError?.message || 'Failed to create sale' }
  }

  // Insert sale items
  const saleItems = items.map(item => ({
    ...item,
    sale_id: sale.id,
    store_id: saleData.store_id,
    created_at: new Date().toISOString(),
  }))

  const { error: itemsError } = await (supabase
    .from('sale_line_items') as any)
    .insert(saleItems)

  if (itemsError) {
    console.error('Error creating sale items:', itemsError)
    // Note: In production, you might want to delete the sale record if items fail
    return { success: false, error: itemsError.message }
  }

  // Update inventory
  for (const item of items) {
    // Get current inventory snapshot
    const { data: currentInventory } = await supabase
      .from('inventory_snapshots')
      .select('quantity')
      .eq('store_id', saleData.store_id)
      .eq('product_id', item.product_id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    const currentQty = (currentInventory as any)?.quantity || 0
    const newQty = Math.max(0, currentQty - item.quantity)

    // Create new snapshot
    await (supabase.from('inventory_snapshots') as any).insert({
      store_id: saleData.store_id,
      product_id: item.product_id,
      quantity: newQty,
      reserved_quantity: 0,
      available_quantity: newQty,
      snapshot_date: new Date().toISOString(),
      created_by: user.id,
      notes: `Sale ${receiptNumber}`,
    })

    // Create movement record
    await (supabase.from('inventory_movements') as any).insert({
      store_id: saleData.store_id,
      product_id: item.product_id,
      movement_type: 'sale',
      quantity: -item.quantity,
      reference_id: sale.id,
      reference_type: 'sale',
      created_by: user.id,
      notes: `Sale ${receiptNumber}`,
    })
  }

  revalidatePath('/dashboard/sales')
  return { success: true, sale: sale as SaleReceipt }
}

export async function voidSale(saleId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get sale items to restore inventory
  const { data: items } = await supabase
    .from('sale_line_items')
    .select('*')
    .eq('sale_id', saleId)

  const saleItems = items as SaleItem[] | null

  // Update sale status
  const { error: updateError } = await (supabase
    .from('sales_receipts') as any)
    .update({
      is_voided: true,
      void_reason: reason,
      payment_status: 'voided',
      updated_at: new Date().toISOString(),
    })
    .eq('id', saleId)

  if (updateError) {
    console.error('Error voiding sale:', updateError)
    return { success: false, error: updateError.message }
  }

  // Restore inventory
  if (saleItems) {
    for (const item of saleItems) {
      // Get current inventory
      const { data: currentInventory } = await supabase
        .from('inventory_snapshots')
        .select('quantity, store_id')
        .eq('product_id', item.product_id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

      const currentQty = (currentInventory as any)?.quantity || 0
      const storeId = (currentInventory as any)?.store_id
      const newQty = currentQty + item.quantity

      // Create new snapshot
      await (supabase.from('inventory_snapshots') as any).insert({
        store_id: storeId,
        product_id: item.product_id,
        quantity: newQty,
        reserved_quantity: 0,
        available_quantity: newQty,
        snapshot_date: new Date().toISOString(),
        created_by: user.id,
        notes: `Voided sale ${saleId}`,
      })

      // Create movement record
      await (supabase.from('inventory_movements') as any).insert({
        store_id: storeId,
        product_id: item.product_id,
        movement_type: 'adjustment',
        quantity: item.quantity,
        reference_id: saleId,
        reference_type: 'void',
        created_by: user.id,
        notes: `Voided sale: ${reason}`,
      })
    }
  }

  revalidatePath('/dashboard/sales')
  return { success: true }
}

// ==================== SALES SUMMARY ====================

export interface SalesSummary {
  totalSales: number
  totalRevenue: number
  totalTax: number
  totalDiscounts: number
  averageTransaction: number
  paymentMethods: {
    method: string
    count: number
    amount: number
  }[]
  topProducts: {
    product_id: string
    name: string
    quantity: number
    revenue: number
  }[]
}

export async function getSalesSummary(storeId?: string, startDate?: string, endDate?: string): Promise<SalesSummary> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Default to last 30 days if no dates provided
  const end = endDate || new Date().toISOString()
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('sales_receipts')
    .select('*')
    .eq('is_voided', false)
    .eq('payment_status', 'completed')
    .gte('transaction_date', start)
    .lte('transaction_date', end)

  if (storeId) {
    query = query.eq('store_id', storeId)
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    const storeIds = stores?.map(s => s.store_id) || []

    if (storeIds.length === 0) {
      return {
        totalSales: 0,
        totalRevenue: 0,
        totalTax: 0,
        totalDiscounts: 0,
        averageTransaction: 0,
        paymentMethods: [],
        topProducts: [],
      }
    }

    query = query.in('store_id', storeIds)
  }

  const { data: sales, error } = await query

  if (error) {
    console.error('Error fetching sales summary:', error)
    return {
      totalSales: 0,
      totalRevenue: 0,
      totalTax: 0,
      totalDiscounts: 0,
      averageTransaction: 0,
      paymentMethods: [],
      topProducts: [],
    }
  }

  const salesData = sales as SaleReceipt[]

  // Calculate summary
  const totalSales = salesData.length
  const totalRevenue = salesData.reduce((sum, s) => sum + (s.total_amount || 0), 0)
  const totalTax = salesData.reduce((sum, s) => sum + (s.tax_amount || 0), 0)
  const totalDiscounts = salesData.reduce((sum, s) => sum + (s.discount_amount || 0), 0)
  const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0

  // Payment methods breakdown
  const paymentMethodMap = new Map<string, { count: number; amount: number }>()
  salesData.forEach(sale => {
    const existing = paymentMethodMap.get(sale.payment_method) || { count: 0, amount: 0 }
    existing.count++
    existing.amount += sale.total_amount
    paymentMethodMap.set(sale.payment_method, existing)
  })

  const paymentMethods = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
    method,
    count: data.count,
    amount: data.amount,
  }))

  return {
    totalSales,
    totalRevenue,
    totalTax,
    totalDiscounts,
    averageTransaction,
    paymentMethods,
    topProducts: [], // Would need separate query
  }
}
