import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const results = {
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    connection: false,
    error: null as string | null,
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.from('stores').select('count')

    if (error) {
      results.error = error.message
    } else {
      results.connection = true
    }
  } catch (err) {
    results.error = err instanceof Error ? err.message : 'Unknown error'
  }

  return NextResponse.json(results)
}
