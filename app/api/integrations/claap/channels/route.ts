import { NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/app/actions/users'
import { Integration, COLLECTIONS } from '@/lib/types'
import { decrypt } from '@/lib/encryption'

export async function GET() {
  try {
    console.log('=== CLAAP CHANNELS API START ===')

    const { db, currentUser } = await getAuthorizedUser()

    if (!currentUser) {
      console.log('[Claap Channels] ERROR: No user found')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('[Claap Channels] Current user (respects impersonation):', {
      mongoId: currentUser._id?.toString(),
      email: currentUser.email,
      name: `${currentUser.firstName} ${currentUser.lastName}`
    })

    // Get Claap integration for this user
    console.log('[Claap Channels] Searching for Claap integration with userId:', currentUser._id?.toString())
    const integration = await db.collection<Integration>(COLLECTIONS.INTEGRATIONS).findOne({
      userId: currentUser._id,
      platform: 'claap',
      isActive: true
    })

    if (!integration) {
      console.log('[Claap Channels] ✗ No Claap integration found for user')
      return NextResponse.json(
        { error: 'Claap integration not configured' },
        { status: 400 }
      )
    }

    console.log('[Claap Channels] ✓ Found Claap integration:', {
      integrationId: integration._id?.toString(),
      hasApiKey: !!integration.configuration?.apiKey
    })

    if (!integration.configuration?.apiKey) {
      console.log('[Claap Channels] ✗ Integration exists but no API key configured')
      return NextResponse.json(
        { error: 'Claap integration not configured' },
        { status: 400 }
      )
    }

    // Decrypt API key
    console.log('[Claap Channels] Decrypting API key...')
    const apiKey = decrypt(integration.configuration.apiKey)
    console.log('[Claap Channels] API key decrypted successfully, length:', apiKey.length)

    // Fetch recordings from Claap API to extract channels
    console.log('[Claap Channels] Fetching recordings from Claap API...')
    const response = await fetch('https://api.claap.io/v1/recordings', {
      headers: {
        'X-Claap-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    console.log('[Claap Channels] Claap API response status:', response.status, response.statusText)

    if (!response.ok) {
      console.error('[Claap Channels] ✗ Claap API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('[Claap Channels] Error body:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch recordings from Claap', details: response.statusText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[Claap Channels] ✓ Claap API response received')
    console.log('[Claap Channels] Full response JSON:', JSON.stringify(data, null, 2))
    console.log('[Claap Channels] Response type:', Array.isArray(data) ? 'array' : 'object')
    console.log('[Claap Channels] Response keys:', Object.keys(data))

    // Extract unique channels from recordings
    const channelsMap = new Map<string, { id: string; name: string }>()

    if (Array.isArray(data)) {
      // Handle array response
      console.log('[Claap Channels] Processing array of', data.length, 'recordings')
      for (const recording of data) {
        if (recording.channel?.id && recording.channel?.name) {
          channelsMap.set(recording.channel.id, {
            id: recording.channel.id,
            name: recording.channel.name
          })
          console.log('[Claap Channels] Found channel:', recording.channel.name, `(${recording.channel.id})`)
        }
      }
    } else if (data.recordings && Array.isArray(data.recordings)) {
      // Handle paginated response
      console.log('[Claap Channels] Processing paginated response with', data.recordings.length, 'recordings')
      for (const recording of data.recordings) {
        if (recording.channel?.id && recording.channel?.name) {
          channelsMap.set(recording.channel.id, {
            id: recording.channel.id,
            name: recording.channel.name
          })
          console.log('[Claap Channels] Found channel:', recording.channel.name, `(${recording.channel.id})`)
        }
      }
    } else {
      console.log('[Claap Channels] ⚠ Unexpected response format - no recordings found')
    }

    const channels = Array.from(channelsMap.values())
    console.log('[Claap Channels] ✓ Extracted', channels.length, 'unique channels')

    const result = {
      success: true,
      channels,
      totalRecordings: Array.isArray(data) ? data.length : data.recordings?.length || 0
    }

    console.log('[Claap Channels] Returning result:', JSON.stringify(result, null, 2))
    console.log('=== CLAAP CHANNELS API END ===')

    return NextResponse.json(result)

  } catch (error) {
    console.error('=== CLAAP CHANNELS API ERROR ===')
    console.error('[Claap Channels] ✗ Unexpected error:', error)
    console.error('[Claap Channels] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('[Claap Channels] Error message:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('[Claap Channels] Stack trace:', error.stack)
    }
    console.error('=== CLAAP CHANNELS API ERROR END ===')

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
