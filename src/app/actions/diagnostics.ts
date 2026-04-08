'use server'

import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase'

export async function diagnoseSupabaseConnection(): Promise<{
  env: { url: boolean; anonKey: boolean; serviceKey: boolean }
  database: { connected: boolean; tables: Record<string, boolean>; error?: string }
  auth: { working: boolean; canCreateUser: boolean; error?: string }
  user?: { id: string; email?: string } | null
}> {
  const results = {
    env: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    database: { connected: false, tables: {} as Record<string, boolean>, error: undefined as string | undefined },
    auth: { working: false, canCreateUser: false, error: undefined as string | undefined },
    user: null,
  }

  try {
    const supabase = createServiceClient()

    // Test database connection
    const { data: tablesRaw, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    const tables = tablesRaw as { table_name: string }[] | null

    if (tablesError) {
      results.database.error = tablesError.message
    } else {
      results.database.connected = true
      const tableList = tables?.map(t => t.table_name) || []
      results.database.tables = {
        profiles: tableList.includes('profiles'),
        stores: tableList.includes('stores'),
        auth_users: tableList.includes('users'), // auth schema
      }
    }

    // Test auth with service role
    try {
      // Try to list users (requires service role)
      const { data: users, error: userError } = await supabase.auth.admin.listUsers()

      if (userError) {
        results.auth.error = userError.message
        if (userError.message?.includes('Database')) {
          results.auth.error += ' (Auth tables may not exist - visit Supabase Dashboard → Authentication → Users to initialize)'
        }
      } else {
        results.auth.working = true
        // Also test if we can create users
        try {
          const { error: createError } = await supabase.auth.admin.createUser({
            email: 'test-init@example.com',
            password: 'Test123!',
          })
          if (createError?.message?.includes('already registered')) {
            results.auth.canCreateUser = true
          } else if (createError?.message?.includes('Database error')) {
            results.auth.canCreateUser = false
            results.auth.error = 'Auth schema not initialized. Go to Supabase Dashboard → Authentication → Users'
          } else {
            results.auth.canCreateUser = !createError
          }
        } catch {
          results.auth.canCreateUser = false
        }
      }
    } catch (authErr) {
      results.auth.error = authErr instanceof Error ? authErr.message : 'Auth service error'
    }

  } catch (err) {
    results.database.error = err instanceof Error ? err.message : 'Unknown error'
  }

  return results
}

export async function createAuthTables(): Promise<{ success: boolean; message: string }> {
  const supabase = createServiceClient()

  try {
    // Check if profiles table exists
    const { error } = await supabase.from('profiles').select('count').limit(1)

    if (error?.message?.includes('does not exist')) {
      return {
        success: false,
        message: 'Database tables not created. Please go to Supabase SQL Editor and run the schema.sql file from the project.',
      }
    }

    return {
      success: true,
      message: 'Database tables exist. Auth issue may be with Supabase Auth service configuration.',
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error checking tables',
    }
  }
}