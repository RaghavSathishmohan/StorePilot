'use server'

import { createServiceClient } from '@/lib/supabase'

/**
 * Create a demo account with sample data
 * Run this with: npx tsx scripts/create-demo-account.ts
 * Or call from an API route
 */
export async function createDemoAccount() {
  const supabase = createServiceClient()

  const demoEmail = 'demo@storepilot.app'
  const demoPassword = 'Demo123!'

  try {
    // Test connection first
    const { error: testError } = await supabase.from('profiles').select('count')
    if (testError) {
      console.error('Database test error:', testError)
      if (testError.message.includes('does not exist')) {
        throw new Error('Database tables not set up. Please run the schema.sql file in Supabase SQL Editor first.')
      }
      throw new Error(`Database connection failed: ${testError.message}`)
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', demoEmail)
      .maybeSingle()

    if (checkError) {
      console.error('Check existing user error:', checkError)
    }

    if (existingUser) {
      return {
        success: true,
        message: 'Demo account already exists',
        credentials: { email: demoEmail, password: demoPassword },
      }
    }

    // Create the user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo User',
      },
    })

    if (authError) {
      console.error('Auth error details:', authError)
      if (authError.message?.includes('Database error') && authError.status === 500) {
        throw new Error(
          'Auth schema not initialized. Please go to your Supabase Dashboard → Authentication → Users page. ' +
          'This will initialize the auth tables needed for user creation.'
        )
      }
      throw new Error(`Auth error: ${authError.message} (${authError.status})`)
    }

    const userId = authData.user.id

    // Create profile
    await (supabase.from('profiles') as any).insert({
      id: userId,
      email: demoEmail,
      full_name: 'Demo User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Create demo store
    const { data: store } = await (supabase
      .from('stores') as any)
      .insert({
        name: 'Demo Store',
        slug: 'demo-store',
        description: 'A demo store for testing StorePilot features',
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (!store) {
      throw new Error('Failed to create store')
    }

    // Add user as store member
    await (supabase.from('store_members') as any).insert({
      store_id: store.id,
      user_id: userId,
      role: 'owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Create demo location
    const { data: location } = await (supabase
      .from('store_locations') as any)
      .insert({
        store_id: store.id,
        name: 'Main Location',
        address: '123 Demo Street',
        city: 'Demo City',
        state: 'CA',
        zip_code: '12345',
        country: 'USA',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    // Create demo categories
    const categories = [
      { name: 'Electronics', color_code: '#3b82f6' },
      { name: 'Clothing', color_code: '#10b981' },
      { name: 'Food & Beverage', color_code: '#f59e0b' },
      { name: 'Home & Garden', color_code: '#8b5cf6' },
    ]

    const categoryIds: string[] = []
    for (const cat of categories) {
      const { data: category } = await (supabase
        .from('product_categories') as any)
        .insert({
          store_id: store.id,
          name: cat.name,
          color_code: cat.color_code,
          is_active: true,
          sort_order: categoryIds.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (category) categoryIds.push(category.id)
    }

    // Create demo products
    const demoProducts = [
      {
        name: 'Wireless Headphones',
        sku: 'ELEC-001',
        category: 0,
        price: 79.99,
        cost: 40,
        stock: 45,
        min_stock: 10,
      },
      {
        name: 'Smart Watch',
        sku: 'ELEC-002',
        category: 0,
        price: 249.99,
        cost: 120,
        stock: 8,
        min_stock: 5,
      },
      {
        name: 'Cotton T-Shirt',
        sku: 'CLOTH-001',
        category: 1,
        price: 24.99,
        cost: 8,
        stock: 120,
        min_stock: 20,
      },
      {
        name: 'Jeans',
        sku: 'CLOTH-002',
        category: 1,
        price: 59.99,
        cost: 20,
        stock: 3,
        min_stock: 10,
      },
      {
        name: 'Organic Coffee Beans',
        sku: 'FOOD-001',
        category: 2,
        price: 14.99,
        cost: 6,
        stock: 35,
        min_stock: 15,
      },
      {
        name: 'Tea Set',
        sku: 'FOOD-002',
        category: 2,
        price: 34.99,
        cost: 15,
        stock: 0,
        min_stock: 5,
      },
      {
        name: 'Garden Tools Set',
        sku: 'HOME-001',
        category: 3,
        price: 89.99,
        cost: 35,
        stock: 12,
        min_stock: 5,
      },
      {
        name: 'LED Desk Lamp',
        sku: 'HOME-002',
        category: 3,
        price: 45.99,
        cost: 18,
        stock: 28,
        min_stock: 8,
      },
    ]

    for (const product of demoProducts) {
      const { data: prod } = await (supabase
        .from('products') as any)
        .insert({
          store_id: store.id,
          category_id: categoryIds[product.category] || null,
          sku: product.sku,
          name: product.name,
          description: `Demo ${product.name} for testing`,
          selling_price: product.price,
          cost_price: product.cost,
          min_stock_level: product.min_stock,
          reorder_point: Math.floor(product.min_stock * 0.5),
          unit_of_measure: 'unit',
          tax_rate: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (prod) {
        // Create inventory snapshot
        await (supabase.from('inventory_snapshots') as any).insert({
          store_id: store.id,
          product_id: prod.id,
          quantity: product.stock,
          reserved_quantity: 0,
          unit_cost: product.cost,
          total_value: product.stock * product.cost,
          snapshot_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        })
      }
    }

    // Create some demo sales data
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await (supabase.from('daily_metrics') as any).insert({
      store_id: store.id,
      metric_date: yesterday.toISOString().split('T')[0],
      total_sales: 1245.67,
      total_transactions: 23,
      total_items_sold: 34,
      average_transaction_value: 54.16,
      total_tax_collected: 99.65,
      total_discounts: 45.00,
      total_refunds: 0,
      gross_profit: 620.00,
      unique_customers: 18,
      new_customers: 3,
      returning_customers: 15,
      inventory_value: 8500.00,
      low_stock_items: 2,
      out_of_stock_items: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return {
      success: true,
      message: 'Demo account created successfully',
      credentials: { email: demoEmail, password: demoPassword },
      store: { id: store.id, name: store.name },
    }
  } catch (error) {
    console.error('Error creating demo account:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      credentials: null,
    }
  }
}
