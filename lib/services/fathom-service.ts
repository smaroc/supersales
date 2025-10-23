import crypto from 'crypto'
import { Fathom } from 'fathom-typescript'

export class FathomService {
  private apiKey: string
  private baseUrl: string = 'https://api.fathom.ai/external/v1'
  private sdk: Fathom | null = null

  constructor(config?: {
    apiKey?: string
    webhookSecret?: string
  }) {
    this.apiKey = config?.apiKey || ''

    // Initialize SDK with API key authentication
    if (this.apiKey) {
      console.log('[FathomService] Initializing with API key')
      this.sdk = new Fathom({
        security: {
          apiKeyAuth: this.apiKey
        }
      })
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log('[FathomService] Starting connection test...')
    console.log('[FathomService] Base URL:', this.baseUrl)
    console.log('[FathomService] API Key present:', !!this.apiKey)
    console.log('[FathomService] API Key length:', this.apiKey?.length || 0)

    try {
      if (!this.apiKey) {
        console.log('[FathomService] Connection test failed - No API key provided')
        return {
          success: false,
          message: 'API Key is required'
        }
      }

      // Test by listing meetings (limit to 1 for connection test)
      console.log('[FathomService] Making test API call to /meetings endpoint...')
      const response = await this.makeApiCall('/meetings?limit=1', 'GET')

      console.log('[FathomService] Connection test successful!')
      console.log('[FathomService] Response:', JSON.stringify(response, null, 2))
      console.log('[FathomService] Meetings found:', response.meetings?.length || 0)

      return {
        success: true,
        message: 'Connection successful - API key is valid',
        details: {
          meetingsFound: response.meetings?.length || 0,
          apiVersion: 'v1'
        }
      }
    } catch (error: any) {
      const errorMessage = error.cause?.details?.message || error.message || 'Connection failed'
      const status = error.cause?.status

      console.error('[FathomService] Connection test failed!')
      console.error('[FathomService] Error status:', status)
      console.error('[FathomService] Error message:', errorMessage)
      console.error('[FathomService] Full error:', error)

      let friendlyMessage = errorMessage
      if (status === 401 || status === 403) {
        friendlyMessage = 'Invalid API key - please check your credentials'
        console.error('[FathomService] Authentication failed - invalid credentials')
      } else if (status === 429) {
        friendlyMessage = 'Rate limit exceeded - please try again later'
        console.error('[FathomService] Rate limit exceeded')
      }

      return {
        success: false,
        message: friendlyMessage,
        details: {
          status,
          error: errorMessage
        }
      }
    }
  }

  async createWebhook(webhookUrl: string): Promise<{ id: string; secret: string }> {
    console.log('[FathomService] Creating webhook...')
    console.log('[FathomService] Webhook URL:', webhookUrl)

    if (!this.sdk) {
      console.error('[FathomService] SDK not initialized')
      throw new Error('Fathom SDK not initialized. Please provide an API key.')
    }

    try {
      const webhook = await this.sdk.createWebhook({
        destinationUrl: webhookUrl,
        includeTranscript: true,
        includeActionItems: true,
        includeSummary: true,
        includeCrmMatches: false,
        triggeredFor: ['my_recordings', 'shared_external_recordings']
      })

      if (!webhook) {
        throw new Error('Webhook creation returned no data')
      }

      console.log('[FathomService] Webhook created successfully')
      console.log('[FathomService] Webhook ID:', webhook.id)
      console.log('[FathomService] Webhook has secret:', !!webhook.secret)

      return {
        id: webhook.id,
        secret: webhook.secret || ''
      }
    } catch (error: any) {
      console.error('[FathomService] Error creating webhook:', error)
      throw new Error(`Failed to create webhook: ${error.message}`)
    }
  }

  async getHistoricalMeetings(maxMeetings: number = 50): Promise<any[]> {
    console.log('[FathomService] Fetching historical meetings using SDK...')
    console.log('[FathomService] Max meetings to fetch:', maxMeetings)

    if (!this.sdk) {
      console.error('[FathomService] SDK not initialized')
      throw new Error('Fathom SDK not initialized. Please provide an API key.')
    }

    try {
      // Fetch meetings using the SDK - it returns a PageIterator
      const pageIterator = await this.sdk.listMeetings({
        // You can add filters here:
        // calendarInvitees: ['user@example.com'],
        // meetingType: 'external',
      })

      // Collect meetings from the iterator
      const allMeetings: any[] = []

      for await (const page of pageIterator) {
        if (page?.result?.items) {
          allMeetings.push(...page.result.items)
          console.log('[FathomService] Fetched page with', page.result.items.length, 'meetings')

          // Stop if we've reached the max
          if (allMeetings.length >= maxMeetings) {
            break
          }
        }
      }

      // Trim to max meetings
      const meetings = allMeetings.slice(0, maxMeetings)

      console.log('[FathomService] Successfully fetched', meetings.length, 'meetings')

      return meetings
    } catch (error: any) {
      console.error('[FathomService] Error fetching historical meetings:', error)
      throw error
    }
  }

  async getCalls(limit: number = 50, offset: number = 0): Promise<any[]> {
    const data = await this.makeApiCall(
      `/calls?limit=${limit}&offset=${offset}`,
      'GET'
    )

    return data.calls || []
  }

  async getCallDetails(callId: string): Promise<any> {
    return await this.makeApiCall(`/calls/${callId}`, 'GET')
  }

  async getCallTranscript(callId: string): Promise<string> {
    const transcript = await this.makeApiCall(`/calls/${callId}/transcript`, 'GET')
    
    // Fathom returns transcript in structured format
    if (Array.isArray(transcript.segments)) {
      return transcript.segments
        .map((segment: any) => `${segment.speaker}: ${segment.text}`)
        .join('\n')
    }

    return transcript.text || ''
  }

  async getCallSummary(callId: string): Promise<any> {
    return await this.makeApiCall(`/calls/${callId}/summary`, 'GET')
  }

  async getCallHighlights(callId: string): Promise<any[]> {
    const data = await this.makeApiCall(`/calls/${callId}/highlights`, 'GET')
    return data.highlights || []
  }

  async syncRecentCalls(since?: Date): Promise<any[]> {
    let params = 'limit=100'
    if (since) {
      params += `&since=${since.toISOString()}`
    }

    const calls = await this.getCalls(100)
    const transcriptions = []

    for (const call of calls) {
      try {
        const [transcript, summary, highlights] = await Promise.all([
          this.getCallTranscript(call.id),
          this.getCallSummary(call.id).catch(() => null),
          this.getCallHighlights(call.id).catch(() => [])
        ])

        transcriptions.push({
          externalId: call.id,
          title: call.title || `Fathom Call ${call.id}`,
          duration: call.duration,
          transcript,
          participants: call.participants || [],
          insights: {
            summary: summary?.summary || '',
            actionItems: summary?.action_items || [],
            keyTopics: highlights.map((h: any) => h.topic).filter(Boolean),
            questions: summary?.questions || []
          },
          recordedAt: call.created_at,
          metadata: call
        })
      } catch (error) {
        console.error(`Error syncing Fathom call ${call.id}:`, error)
      }
    }

    return transcriptions
  }

  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`

    console.log(`[FathomService] API Call - ${method} ${url}`)
    console.log(`[FathomService] Request headers:`, {
      'X-Api-Key': `${this.apiKey.substring(0, 10)}...`,
      'Content-Type': 'application/json'
    })

    const options: RequestInit = {
      method,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    }

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
      console.log(`[FathomService] Request body:`, body)
    }

    const response = await fetch(url, options)

    console.log(`[FathomService] Response status: ${response.status} ${response.statusText}`)
    console.log(`[FathomService] Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[FathomService] Error response body:`, errorText)

      let error: any
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || 'API request failed' }
      }

      const apiError = new Error(`Fathom API error: ${error.message || response.statusText}`)
      ;(apiError as any).cause = { status: response.status, details: error }
      throw apiError
    }

    const responseData = await response.json()
    console.log(`[FathomService] Response data:`, JSON.stringify(responseData, null, 2))

    return responseData
  }

  static verifyWebhookSignature(body: string, signature: string, webhookSecret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')
    
    return `sha256=${expectedSignature}` === signature
  }
}