import crypto from 'crypto'

export class FathomService {
  private apiKey: string
  private baseUrl: string = 'https://api.fathom.video/v1'

  constructor(config?: { apiKey?: string; webhookSecret?: string }) {
    this.apiKey = config?.apiKey || ''
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          message: 'API Key is required'
        }
      }

      // Test by getting user profile
      const profile = await this.makeApiCall('/profile', 'GET')

      return {
        success: true,
        message: 'Connection successful',
        details: {
          user: profile.email,
          workspace: profile.workspace_name
        }
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
        details: error.details
      }
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

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    }

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API request failed' }))
      const apiError = new Error(`Fathom API error: ${error.message || response.statusText}`)
      ;(apiError as any).cause = { status: response.status, details: error }
      throw apiError
    }

    return response.json()
  }

  static verifyWebhookSignature(body: string, signature: string, webhookSecret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')
    
    return `sha256=${expectedSignature}` === signature
  }
}