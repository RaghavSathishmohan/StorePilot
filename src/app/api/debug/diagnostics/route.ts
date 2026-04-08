import { NextResponse } from 'next/server'
import { diagnoseSupabaseConnection, createAuthTables } from '@/app/actions/diagnostics'

export async function GET() {
  const diagnostics = await diagnoseSupabaseConnection()
  const tablesCheck = await createAuthTables()

  return NextResponse.json({
    ...diagnostics,
    tablesCheck,
    recommendations: getRecommendations(diagnostics, tablesCheck),
  })
}

function getRecommendations(
  diagnostics: any,
  tablesCheck: any
): string[] {
  const recs: string[] = []

  if (!diagnostics.env.url || !diagnostics.env.anonKey) {
    recs.push('❌ Missing environment variables in .env.local')
  }

  if (!diagnostics.database.connected) {
    recs.push('❌ Cannot connect to database - check if Supabase project is paused')
  }

  if (!diagnostics.database.tables.profiles) {
    recs.push('❌ Database tables not created')
    recs.push('   → Go to Supabase SQL Editor')
    recs.push('   → Run the schema.sql file from the project')
  }

  if (!diagnostics.auth.working) {
    recs.push('❌ Auth service not working')
    if (diagnostics.auth.error?.includes('Database')) {
      recs.push('   → Auth tables missing in database')
      recs.push('   → This happens when using a fresh Supabase project')
      recs.push('   → Solution: Go to Authentication → Users in Supabase dashboard')
      recs.push('   → This initializes the auth schema')
    }
  }

  if (diagnostics.auth.working && !diagnostics.auth.canCreateUser) {
    recs.push('❌ Auth service running but cannot create users')
    recs.push('   → Go to Supabase Dashboard → Authentication → Users')
    recs.push('   → This triggers the auth schema initialization')
  }

  if (recs.length === 0) {
    recs.push('✅ All systems working!')
  }

  return recs
}
