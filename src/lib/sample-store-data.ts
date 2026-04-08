// Sample Store Data - Realistic Convenience Store Setup
// This provides demo data when the Sample Store is selected

export const sampleStore = {
  id: 'sample-store',
  name: 'Downtown Convenience',
  slug: 'downtown-convenience',
  description: '24-hour convenience store with fuel, snacks, and essentials',
  role: 'owner',
}

export const sampleLocations = [
  {
    id: 'loc-main',
    store_id: 'sample-store',
    name: 'Main Street',
    address: '1420 Pine Street',
    city: 'Seattle',
    state: 'WA',
    zip_code: '98101',
    country: 'USA',
    phone: '+1 (206) 555-0142',
    email: 'main@raghavsathishmohan.com',
    is_active: true,
    has_fuel: true,
    fuel_pumps: 6,
  },
  {
    id: 'loc-2',
    store_id: 'sample-store',
    name: 'Capitol Hill',
    address: '892 Broadway',
    city: 'Seattle',
    state: 'WA',
    zip_code: '98122',
    country: 'USA',
    phone: '+1 (206) 555-0187',
    email: 'capitol@raghavsathishmohan.com',
    is_active: true,
    has_fuel: false,
    fuel_pumps: 0,
  },
]

// Realistic convenience store categories
export const sampleCategories = [
  { id: 'cat-fuel', store_id: 'sample-store', name: 'Fuel', color_code: '#ef4444' },
  { id: 'cat-tobacco', store_id: 'sample-store', name: 'Tobacco & Vape', color_code: '#64748b' },
  { id: 'cat-bev-cold', store_id: 'sample-store', name: 'Cold Beverages', color_code: '#3b82f6' },
  { id: 'cat-bev-hot', store_id: 'sample-store', name: 'Hot Beverages', color_code: '#b45309' },
  { id: 'cat-snacks', store_id: 'sample-store', name: 'Snacks & Candy', color_code: '#eab308' },
  { id: 'cat-fresh', store_id: 'sample-store', name: 'Fresh Food', color_code: '#22c55e' },
  { id: 'cat-alcohol', store_id: 'sample-store', name: 'Beer & Wine', color_code: '#7c3aed' },
  { id: 'cat-essentials', store_id: 'sample-store', name: 'Essentials', color_code: '#ec4899' },
  { id: 'cat-lottery', store_id: 'sample-store', name: 'Lottery & Gaming', color_code: '#14b8a6' },
]

// Realistic convenience store products
export const sampleProducts = [
  // Fuel
  { id: 'fuel-87', store_id: 'sample-store', category_id: 'cat-fuel', sku: 'FUEL-87', name: 'Regular Unleaded (87)', description: 'Per gallon', selling_price: 4.29, cost_price: 3.85, quantity: 999, min_stock_level: 500, reorder_point: 300, is_active: true, stock_status: 'In Stock', unit: 'gallon' },
  { id: 'fuel-89', store_id: 'sample-store', category_id: 'cat-fuel', sku: 'FUEL-89', name: 'Plus (89)', description: 'Per gallon', selling_price: 4.49, cost_price: 4.05, quantity: 999, min_stock_level: 400, reorder_point: 250, is_active: true, stock_status: 'In Stock', unit: 'gallon' },
  { id: 'fuel-93', store_id: 'sample-store', category_id: 'cat-fuel', sku: 'FUEL-93', name: 'Premium (93)', description: 'Per gallon', selling_price: 4.79, cost_price: 4.25, quantity: 999, min_stock_level: 300, reorder_point: 200, is_active: true, stock_status: 'In Stock', unit: 'gallon' },
  { id: 'fuel-diesel', store_id: 'sample-store', category_id: 'cat-fuel', sku: 'FUEL-DIE', name: 'Diesel', description: 'Per gallon', selling_price: 4.59, cost_price: 4.10, quantity: 999, min_stock_level: 400, reorder_point: 250, is_active: true, stock_status: 'In Stock', unit: 'gallon' },

  // Tobacco & Vape
  { id: 'tob-001', store_id: 'sample-store', category_id: 'cat-tobacco', sku: 'TOB-MARLB', name: 'Marlboro Red (Pack)', selling_price: 9.50, cost_price: 7.25, quantity: 48, min_stock_level: 24, reorder_point: 12, is_active: true, stock_status: 'In Stock', age_restricted: true, unit: 'pack' },
  { id: 'tob-002', store_id: 'sample-store', category_id: 'cat-tobacco', sku: 'TOB-CAMEL', name: 'Camel Blue (Pack)', selling_price: 9.25, cost_price: 7.10, quantity: 36, min_stock_level: 20, reorder_point: 10, is_active: true, stock_status: 'In Stock', age_restricted: true, unit: 'pack' },
  { id: 'tob-003', store_id: 'sample-store', category_id: 'cat-tobacco', sku: 'TOB-POUCH', name: 'ZYN Nicotine Pouches', selling_price: 6.99, cost_price: 5.25, quantity: 72, min_stock_level: 30, reorder_point: 15, is_active: true, stock_status: 'In Stock', age_restricted: true, unit: 'can' },
  { id: 'tob-004', store_id: 'sample-store', category_id: 'cat-tobacco', sku: 'VAPE-DISP', name: 'Disposable Vape - Mint', selling_price: 14.99, cost_price: 10.50, quantity: 24, min_stock_level: 15, reorder_point: 8, is_active: true, stock_status: 'In Stock', age_restricted: true, unit: 'each' },
  { id: 'tob-005', store_id: 'sample-store', category_id: 'cat-tobacco', sku: 'TOB-LIGHT', name: 'Lighter - Bic', selling_price: 2.49, cost_price: 1.20, quantity: 120, min_stock_level: 50, reorder_point: 25, is_active: true, stock_status: 'In Stock', unit: 'each' },

  // Cold Beverages
  { id: 'bev-001', store_id: 'sample-store', category_id: 'cat-bev-cold', sku: 'BEV-COKE-20', name: 'Coca-Cola 20oz', selling_price: 2.29, cost_price: 1.45, quantity: 96, min_stock_level: 48, reorder_point: 24, is_active: true, stock_status: 'In Stock', unit: 'bottle' },
  { id: 'bev-002', store_id: 'sample-store', category_id: 'cat-bev-cold', sku: 'BEV-WATER', name: 'Aquafina Water 20oz', selling_price: 1.99, cost_price: 1.10, quantity: 144, min_stock_level: 72, reorder_point: 36, is_active: true, stock_status: 'In Stock', unit: 'bottle' },
  { id: 'bev-003', store_id: 'sample-store', category_id: 'cat-bev-cold', sku: 'BEV-RED', name: 'Red Bull 8.4oz', selling_price: 3.49, cost_price: 2.25, quantity: 60, min_stock_level: 30, reorder_point: 15, is_active: true, stock_status: 'In Stock', unit: 'can' },
  { id: 'bev-004', store_id: 'sample-store', category_id: 'cat-bev-cold', sku: 'BEV-MONST', name: 'Monster Energy 16oz', selling_price: 3.29, cost_price: 2.10, quantity: 48, min_stock_level: 24, reorder_point: 12, is_active: true, stock_status: 'In Stock', unit: 'can' },
  { id: 'bev-005', store_id: 'sample-store', category_id: 'cat-bev-cold', sku: 'BEV-GBC', name: 'Gatorade 28oz', selling_price: 2.49, cost_price: 1.55, quantity: 84, min_stock_level: 40, reorder_point: 20, is_active: true, stock_status: 'In Stock', unit: 'bottle' },
  { id: 'bev-006', store_id: 'sample-store', category_id: 'cat-bev-cold', sku: 'BEV-ICE', name: 'Bagged Ice 7lb', selling_price: 3.99, cost_price: 2.50, quantity: 32, min_stock_level: 20, reorder_point: 10, is_active: true, stock_status: 'In Stock', unit: 'bag' },

  // Hot Beverages
  { id: 'hot-001', store_id: 'sample-store', category_id: 'cat-bev-hot', sku: 'HOT-COF-M', name: 'Coffee - Medium', selling_price: 2.49, cost_price: 0.85, quantity: 999, min_stock_level: 100, reorder_point: 50, is_active: true, stock_status: 'In Stock', unit: 'cup' },
  { id: 'hot-002', store_id: 'sample-store', category_id: 'cat-bev-hot', name: 'Coffee - Large', selling_price: 2.99, cost_price: 1.05, quantity: 999, min_stock_level: 100, reorder_point: 50, is_active: true, stock_status: 'In Stock', unit: 'cup' },
  { id: 'hot-003', store_id: 'sample-store', category_id: 'cat-bev-hot', sku: 'HOT-CAP', name: 'Cappuccino', selling_price: 3.49, cost_price: 1.35, quantity: 999, min_stock_level: 80, reorder_point: 40, is_active: true, stock_status: 'In Stock', unit: 'cup' },
  { id: 'hot-004', store_id: 'sample-store', category_id: 'cat-bev-hot', sku: 'HOT-HOT', name: 'Hot Chocolate', selling_price: 2.99, cost_price: 1.15, quantity: 999, min_stock_level: 80, reorder_point: 40, is_active: true, stock_status: 'In Stock', unit: 'cup' },

  // Snacks
  { id: 'snk-001', store_id: 'sample-store', category_id: 'cat-snacks', sku: 'SNK-LAYS', name: 'Lay\'s Classic', selling_price: 2.49, cost_price: 1.45, quantity: 72, min_stock_level: 36, reorder_point: 18, is_active: true, stock_status: 'In Stock', unit: 'bag' },
  { id: 'snk-002', store_id: 'sample-store', category_id: 'cat-snacks', sku: 'SNK-DORIT', name: 'Doritos Nacho Cheese', selling_price: 2.49, cost_price: 1.45, quantity: 60, min_stock_level: 30, reorder_point: 15, is_active: true, stock_status: 'In Stock', unit: 'bag' },
  { id: 'snk-003', store_id: 'sample-store', category_id: 'cat-snacks', sku: 'SNK-CANDY', name: 'Snickers Bar', selling_price: 1.89, cost_price: 1.10, quantity: 96, min_stock_level: 48, reorder_point: 24, is_active: true, stock_status: 'In Stock', unit: 'bar' },
  { id: 'snk-004', store_id: 'sample-store', category_id: 'cat-snacks', sku: 'SNK-GUM', name: 'Extra Gum', selling_price: 1.49, cost_price: 0.85, quantity: 144, min_stock_level: 72, reorder_point: 36, is_active: true, stock_status: 'In Stock', unit: 'pack' },
  { id: 'snk-005', store_id: 'sample-store', category_id: 'cat-snacks', sku: 'SNK-BEEF', name: 'Jack Link\'s Beef Jerky', selling_price: 6.99, cost_price: 4.50, quantity: 36, min_stock_level: 18, reorder_point: 9, is_active: true, stock_status: 'In Stock', unit: 'bag' },

  // Fresh Food
  { id: 'fsh-001', store_id: 'sample-store', category_id: 'cat-fresh', sku: 'FSH-SAND', name: 'Turkey & Cheese Sandwich', selling_price: 5.99, cost_price: 3.25, quantity: 18, min_stock_level: 12, reorder_point: 6, is_active: true, stock_status: 'In Stock', unit: 'each' },
  { id: 'fsh-002', store_id: 'sample-store', category_id: 'cat-fresh', sku: 'FSH-HOT', name: 'Hot Dog', selling_price: 2.99, cost_price: 1.50, quantity: 24, min_stock_level: 15, reorder_point: 8, is_active: true, stock_status: 'In Stock', unit: 'each' },
  { id: 'fsh-003', store_id: 'sample-store', category_id: 'cat-fresh', sku: 'FSH-TAQUI', name: 'Taquito (3-pack)', selling_price: 4.49, cost_price: 2.25, quantity: 16, min_stock_level: 10, reorder_point: 5, is_active: true, stock_status: 'Low Stock', unit: 'pack' },
  { id: 'fsh-004', store_id: 'sample-store', category_id: 'cat-fresh', sku: 'FSH-PIZZ', name: 'Personal Pizza', selling_price: 5.49, cost_price: 2.75, quantity: 12, min_stock_level: 10, reorder_point: 5, is_active: true, stock_status: 'Low Stock', unit: 'each' },

  // Beer & Wine
  { id: 'alc-001', store_id: 'sample-store', category_id: 'cat-alcohol', sku: 'ALC-BUD', name: 'Bud Light 25oz Can', selling_price: 3.49, cost_price: 2.50, quantity: 72, min_stock_level: 36, reorder_point: 18, is_active: true, stock_status: 'In Stock', age_restricted: true, unit: 'can' },
  { id: 'alc-002', store_id: 'sample-store', category_id: 'cat-alcohol', sku: 'ALC-CORO', name: 'Corona Extra 12oz', selling_price: 2.99, cost_price: 2.10, quantity: 48, min_stock_level: 24, reorder_point: 12, is_active: true, stock_status: 'In Stock', age_restricted: true, unit: 'bottle' },
  { id: 'alc-003', store_id: 'sample-store', category_id: 'cat-alcohol', sku: 'ALC-WINE', name: 'Sutter Home Merlot 187ml', selling_price: 6.99, cost_price: 4.75, quantity: 36, min_stock_level: 18, reorder_point: 9, is_active: true, stock_status: 'In Stock', age_restricted: true, unit: 'bottle' },

  // Essentials
  { id: 'ess-001', store_id: 'sample-store', category_id: 'cat-essentials', sku: 'ESS-MILK', name: 'Whole Milk Gallon', selling_price: 4.49, cost_price: 3.25, quantity: 24, min_stock_level: 15, reorder_point: 8, is_active: true, stock_status: 'In Stock', unit: 'gallon' },
  { id: 'ess-002', store_id: 'sample-store', category_id: 'cat-essentials', sku: 'ESS-EGGS', name: 'Dozen Large Eggs', selling_price: 5.99, cost_price: 4.25, quantity: 20, min_stock_level: 12, reorder_point: 6, is_active: true, stock_status: 'In Stock', unit: 'dozen' },
  { id: 'ess-003', store_id: 'sample-store', category_id: 'cat-essentials', sku: 'ESS-BREAD', name: 'White Bread', selling_price: 3.49, cost_price: 2.25, quantity: 18, min_stock_level: 10, reorder_point: 5, is_active: true, stock_status: 'In Stock', unit: 'loaf' },
  { id: 'ess-004', store_id: 'sample-store', category_id: 'cat-essentials', sku: 'ESS-TP', name: 'Toilet Paper 4-Pack', selling_price: 6.99, cost_price: 4.50, quantity: 32, min_stock_level: 16, reorder_point: 8, is_active: true, stock_status: 'In Stock', unit: 'pack' },
  { id: 'ess-005', store_id: 'sample-store', category_id: 'cat-essentials', sku: 'ESS-PHONE', name: 'Phone Charger (Universal)', selling_price: 12.99, cost_price: 7.50, quantity: 15, min_stock_level: 8, reorder_point: 4, is_active: true, stock_status: 'In Stock', unit: 'each' },

  // Lottery
  { id: 'lot-001', store_id: 'sample-store', category_id: 'cat-lottery', sku: 'LOT-PB', name: 'Powerball Ticket', selling_price: 2.00, cost_price: 0, quantity: 999, min_stock_level: 500, reorder_point: 250, is_active: true, stock_status: 'In Stock', unit: 'ticket' },
  { id: 'lot-002', store_id: 'sample-store', category_id: 'cat-lottery', sku: 'LOT-MM', name: 'Mega Millions Ticket', selling_price: 2.00, cost_price: 0, quantity: 999, min_stock_level: 500, reorder_point: 250, is_active: true, stock_status: 'In Stock', unit: 'ticket' },
  { id: 'lot-003', store_id: 'sample-store', category_id: 'cat-lottery', sku: 'LOT-SCR', name: 'Scratch Tickets (Assorted)', selling_price: 5.00, cost_price: 3.50, quantity: 200, min_stock_level: 100, reorder_point: 50, is_active: true, stock_status: 'In Stock', unit: 'ticket' },
]

// Realistic convenience store metrics
export const sampleMetrics = {
  total_sales: 8742.50,
  fuel_sales: 4230.00,
  merchandise_sales: 4512.50,
  total_transactions: 312,
  fuel_transactions: 148,
  merchandise_transactions: 164,
  average_transaction_value: 28.02,
  average_fuel_transaction: 32.50,
  average_merch_transaction: 24.15,
  total_tax_collected: 743.11,
  total_discounts: 89.50,
  total_refunds: 45.00,
  gross_profit: 2185.00,
  profit_margin: 25.0,
  unique_customers: 218,
  new_customers: 12,
  returning_customers: 206,
  inventory_value: 18500.00,
  low_stock_items: 8,
  out_of_stock_items: 2,
  fuel_volume_gallons: 987,
  fuel_margin_per_gallon: 0.44,
}

// Hourly sales data (24-hour convenience store pattern)
export const sampleHourlySales = [
  { hour: '12am', sales: 145, transactions: 6 },
  { hour: '1am', sales: 98, transactions: 4 },
  { hour: '2am', sales: 85, transactions: 3 },
  { hour: '3am', sales: 120, transactions: 5 },
  { hour: '4am', sales: 245, transactions: 9 },
  { hour: '5am', sales: 380, transactions: 14 },
  { hour: '6am', sales: 520, transactions: 22 },
  { hour: '7am', sales: 640, transactions: 28 },
  { hour: '8am', sales: 480, transactions: 20 },
  { hour: '9am', sales: 320, transactions: 14 },
  { hour: '10am', sales: 280, transactions: 12 },
  { hour: '11am', sales: 340, transactions: 15 },
  { hour: '12pm', sales: 520, transactions: 22 },
  { hour: '1pm', sales: 460, transactions: 19 },
  { hour: '2pm', sales: 380, transactions: 16 },
  { hour: '3pm', sales: 420, transactions: 18 },
  { hour: '4pm', sales: 580, transactions: 24 },
  { hour: '5pm', sales: 720, transactions: 28 },
  { hour: '6pm', sales: 650, transactions: 25 },
  { hour: '7pm', sales: 540, transactions: 21 },
  { hour: '8pm', sales: 480, transactions: 18 },
  { hour: '9pm', sales: 420, transactions: 16 },
  { hour: '10pm', sales: 380, transactions: 14 },
  { hour: '11pm', sales: 260, transactions: 10 },
]

// Weekly sales trend
export const sampleWeeklySales = [
  { day: 'Mon', fuel: 3200, merchandise: 2850, total: 6050 },
  { day: 'Tue', fuel: 3100, merchandise: 2700, total: 5800 },
  { day: 'Wed', fuel: 3300, merchandise: 2900, total: 6200 },
  { day: 'Thu', fuel: 3450, merchandise: 3100, total: 6550 },
  { day: 'Fri', fuel: 4800, merchandise: 4200, total: 9000 },
  { day: 'Sat', fuel: 5200, merchandise: 4800, total: 10000 },
  { day: 'Sun', fuel: 4100, merchandise: 3500, total: 7600 },
]

// Category breakdown (sales mix)
export const sampleCategoryBreakdown = [
  { name: 'Fuel', value: 48.4, color: '#ef4444' },
  { name: 'Cold Beverages', value: 14.2, color: '#3b82f6' },
  { name: 'Tobacco/Vape', value: 12.8, color: '#64748b' },
  { name: 'Snacks', value: 9.5, color: '#eab308' },
  { name: 'Beer/Wine', value: 8.1, color: '#7c3aed' },
  { name: 'Fresh Food', value: 4.2, color: '#22c55e' },
  { name: 'Essentials', value: 2.8, color: '#ec4899' },
]

// Payment type breakdown
export const samplePaymentTypes = [
  { type: 'Credit Card', percentage: 62, amount: 5420.35 },
  { type: 'Debit Card', percentage: 24, amount: 2098.20 },
  { type: 'Cash', percentage: 11, amount: 961.68 },
  { type: 'Mobile/Contactless', percentage: 3, amount: 262.27 },
]

// Age verification stats
export const sampleAgeVerificationStats = {
  tobacco_scans: 48,
  alcohol_scans: 32,
  denied_sales: 3,
  manual_verification: 12,
}

// Fuel price history (last 7 days)
export const sampleFuelPriceHistory = [
  { date: 'Mon', regular: 4.29, plus: 4.49, premium: 4.79 },
  { date: 'Tue', regular: 4.29, plus: 4.49, premium: 4.79 },
  { date: 'Wed', regular: 4.32, plus: 4.52, premium: 4.82 },
  { date: 'Thu', regular: 4.35, plus: 4.55, premium: 4.85 },
  { date: 'Fri', regular: 4.39, plus: 4.59, premium: 4.89 },
  { date: 'Sat', regular: 4.39, plus: 4.59, premium: 4.89 },
  { date: 'Sun', regular: 4.39, plus: 4.59, premium: 4.89 },
]

// Low stock alerts
export const sampleLowStockAlerts = [
  { product: 'Taquito (3-pack)', current: 6, threshold: 10, location: 'Main Street' },
  { product: 'Personal Pizza', current: 4, threshold: 10, location: 'Main Street' },
  { product: 'Red Bull 8.4oz', current: 8, threshold: 30, location: 'Capitol Hill' },
  { product: 'Ice (7lb)', current: 12, threshold: 20, location: 'Main Street' },
]

// Top selling items
export const sampleTopSelling = [
  { name: 'Regular Unleaded (87)', quantity: 987, revenue: 4230.00, category: 'Fuel' },
  { name: 'Coca-Cola 20oz', quantity: 48, revenue: 109.92, category: 'Cold Beverages' },
  { name: 'Marlboro Red', quantity: 24, revenue: 228.00, category: 'Tobacco' },
  { name: 'Coffee - Medium', quantity: 42, revenue: 104.58, category: 'Hot Beverages' },
  { name: 'Aquafina Water', quantity: 36, revenue: 71.64, category: 'Cold Beverages' },
]

// Staff/employee data
export const sampleEmployees = [
  { id: 'emp-1', name: 'Sarah Johnson', role: 'Store Manager', location: 'Main Street', shift: 'Morning', hours_this_week: 40 },
  { id: 'emp-2', name: 'Mike Chen', role: 'Assistant Manager', location: 'Main Street', shift: 'Evening', hours_this_week: 38 },
  { id: 'emp-3', name: 'Jessica Williams', role: 'Cashier', location: 'Capitol Hill', shift: 'Morning', hours_this_week: 32 },
  { id: 'emp-4', name: 'David Rodriguez', role: 'Cashier', location: 'Main Street', shift: 'Night', hours_this_week: 40 },
  { id: 'emp-5', name: 'Emily Park', role: 'Cashier', location: 'Capitol Hill', shift: 'Evening', hours_this_week: 28 },
]

// Helper function to get all sample data
export function getSampleStoreData() {
  return {
    store: sampleStore,
    locations: sampleLocations,
    categories: sampleCategories,
    products: sampleProducts,
    metrics: sampleMetrics,
    hourlySales: sampleHourlySales,
    weeklySales: sampleWeeklySales,
    categoryBreakdown: sampleCategoryBreakdown,
    paymentTypes: samplePaymentTypes,
    ageVerification: sampleAgeVerificationStats,
    fuelPriceHistory: sampleFuelPriceHistory,
    lowStockAlerts: sampleLowStockAlerts,
    topSelling: sampleTopSelling,
    employees: sampleEmployees,
  }
}
