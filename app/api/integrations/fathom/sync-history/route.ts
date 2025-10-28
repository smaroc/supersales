import { NextRequest, NextResponse } from 'next/server'
import { syncFathomHistory } from '@/app/actions/integrations'

export async function POST(request: NextRequest) {
  console.log('[API] Starting Fathom history sync...')

  try {
    // Get limit from request body (default to 50)
    const body = await request.json().catch(() => ({}))
    const limit = body.limit || 50

    console.log('[API] Syncing with limit:', limit)

    // Use the server action which handles authentication, fetching, and AI analysis
    const result = await syncFathomHistory(limit)

    if (!result.success) {
      console.error('[API] Sync failed:', result.message)
      return NextResponse.json(
        {
          error: result.message,
          errors: result.errors
        },
        { status: 400 }
      )
    }

    console.log('[API] Sync completed successfully:', {
      imported: result.imported,
      skipped: result.skipped,
      total: result.total
    })

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      total: result.total,
      message: result.message,
      errors: result.errors
    })
  } catch (error: any) {
    console.error('[API] Unexpected error during sync:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync Fathom history' },
      { status: 500 }
    )
  }
}
