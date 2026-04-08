import { NextRequest, NextResponse } from 'next/server'
import { runRiskScoringAndAlertGeneration } from '@/app/actions/alert-generation'

// API key authentication for cron jobs
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.RISK_SCORING_API_KEY

  if (!expectedKey) {
    console.warn('RISK_SCORING_API_KEY not set, allowing request')
    return true
  }

  return apiKey === expectedKey
}

/**
 * POST /api/risk-scoring
 *
 * Run risk scoring and alert generation for all stores
 * Can be called via cron job or manually
 *
 * Headers:
 * - x-api-key: API key for authentication (optional if not configured)
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   details: {
 *     storesProcessed: number,
 *     totalAlertsCreated: number,
 *     stockoutAlerts: number,
 *     deadInventoryAlerts: number,
 *     shrinkAlerts: number
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Run the risk scoring and alert generation
    const result = await runRiskScoringAndAlertGeneration()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in risk scoring API:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {
          storesProcessed: 0,
          totalAlertsCreated: 0,
          stockoutAlerts: 0,
          deadInventoryAlerts: 0,
          shrinkAlerts: 0,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/risk-scoring
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'risk-scoring',
    timestamp: new Date().toISOString(),
  })
}
