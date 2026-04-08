import { NextRequest, NextResponse } from 'next/server'
import { createDemoAccount } from '@/app/actions/demo-setup'

export async function POST(request: NextRequest) {
  try {
    const result = await createDemoAccount()

    return NextResponse.json(result, {
      status: result.success ? 200 : 500
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also allow GET for easy browser testing
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to create demo account',
    endpoint: '/api/demo/setup'
  })
}
