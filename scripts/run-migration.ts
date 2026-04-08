import { createClient } from '@supabase/supabase-js'

// Load env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runMigration() {
  console.log('Running migration: add physical_location columns...')

  const sql = `
    -- Add physical_location to inventory_snapshots
    ALTER TABLE inventory_snapshots
    ADD COLUMN IF NOT EXISTS physical_location TEXT;

    -- Add physical_location to sales_receipts
    ALTER TABLE sales_receipts
    ADD COLUMN IF NOT EXISTS physical_location TEXT;

    -- Add physical_location to sale_line_items (for per-item location tracking)
    ALTER TABLE sale_line_items
    ADD COLUMN IF NOT EXISTS physical_location TEXT;

    -- Create indexes for filtering
    CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_physical_location
    ON inventory_snapshots(physical_location);

    CREATE INDEX IF NOT EXISTS idx_sales_receipts_physical_location
    ON sales_receipts(physical_location);
  `

  const { error } = await supabase.rpc('exec_sql', { sql })

  if (error) {
    console.error('Migration failed:', error)

    // Try running raw SQL directly
    console.log('Trying alternative method...')

    const statements = [
      `ALTER TABLE inventory_snapshots ADD COLUMN IF NOT EXISTS physical_location TEXT;`,
      `ALTER TABLE sales_receipts ADD COLUMN IF NOT EXISTS physical_location TEXT;`,
      `ALTER TABLE sale_line_items ADD COLUMN IF NOT EXISTS physical_location TEXT;`,
      `CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_physical_location ON inventory_snapshots(physical_location);`,
      `CREATE INDEX IF NOT EXISTS idx_sales_receipts_physical_location ON sales_receipts(physical_location);`,
    ]

    for (const statement of statements) {
      const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement })
      if (stmtError) {
        // Try direct query
        const { error: directError } = await supabase.from('_exec_sql').select('*').eq('sql', statement)
        if (directError) {
          console.log(`Note: ${stmtError.message}`)
        }
      }
    }
  } else {
    console.log('Migration completed successfully!')
  }
}

runMigration().catch(console.error)
