import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, Integration, CallRecord, COLLECTIONS } from '@/lib/types'
import { decrypt } from '@/lib/encryption'
import { FathomService } from '@/lib/services/fathom-service'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  console.log('[sync-history] Starting Fathom historical sync...')

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      console.error('[sync-history] Unauthorized - no user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[sync-history] User authenticated:', userId)

    // Get user from database
    const { db } = await connectToDatabase()
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

    if (!user) {
      console.error('[sync-history] User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('[sync-history] User found:', user.email || user.clerkId)

    // Get Fathom integration
    const integration = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOne({
      userId: user._id,
      platform: 'fathom',
      isActive: true
    })

    if (!integration) {
      console.error('[sync-history] No active Fathom integration found')
      return NextResponse.json({ error: 'Fathom integration not configured' }, { status: 400 })
    }

    console.log('[sync-history] Fathom integration found')

    // Decrypt API key
    const apiKey = integration.configuration?.apiKey
      ? decrypt(integration.configuration.apiKey)
      : null

    if (!apiKey) {
      console.error('[sync-history] No API key found in integration')
      return NextResponse.json({ error: 'API key not configured' }, { status: 400 })
    }

    console.log('[sync-history] API key decrypted successfully')

    // Get limit from request body (default to 50)
    const body = await request.json().catch(() => ({}))
    const limit = body.limit || 50

    console.log('[sync-history] Fetching up to', limit, 'meetings')

    // Initialize Fathom service and fetch meetings
    const fathomService = new FathomService({ apiKey })
    const meetings = await fathomService.getHistoricalMeetings(limit)

    console.log('[sync-history] Found', meetings.length, 'meetings')

    // Process and save meetings as CallRecords
    const importedRecords = []
    const skippedRecords = []

    for (const meeting of meetings) {
      try {
        // Check if this meeting already exists
        const existingRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
          externalId: meeting.id,
          source: 'fathom'
        })

        if (existingRecord) {
          console.log('[sync-history] Skipping existing meeting:', meeting.id)
          skippedRecords.push({ id: meeting.id, reason: 'already_exists' })
          continue
        }

        // Create CallRecord from meeting data
        const callRecord = {
          userId: user._id,
          organizationId: user.organizationId,
          source: 'fathom' as const,
          externalId: meeting.id,
          title: meeting.title || `Fathom Meeting ${meeting.id}`,
          duration: meeting.duration || 0,
          recordedAt: meeting.startTime ? new Date(meeting.startTime) : new Date(),
          participants: meeting.participants || [],
          transcript: meeting.transcript || '',
          status: 'pending' as const,
          metadata: {
            fathomData: meeting,
            importedFromHistory: true,
            importedAt: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const result = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).insertOne(callRecord as any)

        console.log('[sync-history] Imported meeting:', meeting.id)
        importedRecords.push({
          id: meeting.id,
          recordId: result.insertedId,
          title: callRecord.title
        })
      } catch (error: any) {
        console.error('[sync-history] Error importing meeting:', meeting.id, error)
        skippedRecords.push({ id: meeting.id, reason: error.message })
      }
    }

    console.log('[sync-history] Import complete:', importedRecords.length, 'imported,', skippedRecords.length, 'skipped')

    return NextResponse.json({
      success: true,
      imported: importedRecords.length,
      skipped: skippedRecords.length,
      total: meetings.length,
      records: importedRecords,
      skippedRecords
    })
  } catch (error: any) {
    console.error('[sync-history] Error during sync:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync historical meetings' },
      { status: 500 }
    )
  }
}
