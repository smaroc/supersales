import crypto from 'crypto'

export class FirefilesService {
  private apiKey: string
  private workspaceId: string
  private baseUrl: string = 'https://api.firefiles.ai/v1'

  constructor(config?: { apiKey?: string; workspaceId?: string }) {
    this.apiKey = config?.apiKey || ''
    this.workspaceId = config?.workspaceId || ''
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.apiKey || !this.workspaceId) {
        return {
          success: false,
          message: 'API Key and Workspace ID are required'
        }
      }

      // Test by getting workspace info
      const workspace = await this.makeApiCall(`/workspaces/${this.workspaceId}`, 'GET')

      return {
        success: true,
        message: 'Connection successful',
        details: {
          workspace: workspace.name,
          id: workspace.id
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

  async getRecordings(limit: number = 50, offset: number = 0): Promise<any[]> {
    const data = await this.makeApiCall(
      `/workspaces/${this.workspaceId}/recordings?limit=${limit}&offset=${offset}`,
      'GET'
    )

    return data.recordings || []
  }

  async getRecordingDetails(recordingId: string): Promise<any> {
    return await this.makeApiCall(
      `/workspaces/${this.workspaceId}/recordings/${recordingId}`,
      'GET'
    )
  }

  async getTranscript(recordingId: string): Promise<string> {
    const transcript = await this.makeApiCall(
      `/workspaces/${this.workspaceId}/recordings/${recordingId}/transcript`,
      'GET'
    )
    
    // Firefiles returns transcript with timestamps and speakers
    if (Array.isArray(transcript.utterances)) {
      return transcript.utterances
        .map((utterance: any) => `${utterance.speaker}: ${utterance.text}`)
        .join('\n')
    }

    return transcript.text || ''
  }

  async getAnalysis(recordingId: string): Promise<any> {
    return await this.makeApiCall(
      `/workspaces/${this.workspaceId}/recordings/${recordingId}/analysis`,
      'GET'
    )
  }

  async getInsights(recordingId: string): Promise<any> {
    return await this.makeApiCall(
      `/workspaces/${this.workspaceId}/recordings/${recordingId}/insights`,
      'GET'
    )
  }

  async syncRecentRecordings(since?: Date): Promise<any[]> {
    const recordings = await this.getRecordings(100)
    const transcriptions = []

    for (const recording of recordings) {
      try {
        // Skip if recording is older than 'since' date
        if (since && new Date(recording.created_at) < since) {
          continue
        }

        const [transcript, analysis, insights] = await Promise.all([
          this.getTranscript(recording.id),
          this.getAnalysis(recording.id).catch(() => null),
          this.getInsights(recording.id).catch(() => null)
        ])

        transcriptions.push({
          externalId: recording.id,
          title: recording.title || `Firefiles Recording ${recording.id}`,
          duration: recording.duration,
          transcript,
          participants: recording.participants || [],
          insights: {
            sentiment: analysis?.sentiment || 'neutral',
            confidence: analysis?.confidence || 0,
            keyTopics: insights?.topics || [],
            actionItems: insights?.action_items || [],
            questions: insights?.questions || [],
            followUps: insights?.follow_ups || []
          },
          recordedAt: recording.recorded_at || recording.created_at,
          metadata: recording
        })
      } catch (error) {
        console.error(`Error syncing Firefiles recording ${recording.id}:`, error)
      }
    }

    return transcriptions
  }

  async uploadRecording(file: File, metadata?: any): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }

    const response = await fetch(
      `${this.baseUrl}/workspaces/${this.workspaceId}/recordings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }))
      throw new Error(`Firefiles upload error: ${error.message || response.statusText}`)
    }

    return response.json()
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
      const apiError = new Error(`Firefiles API error: ${error.message || response.statusText}`)
      ;(apiError as any).cause = { status: response.status, details: error }
      throw apiError
    }

    return response.json()
  }

  static verifyWebhookSignature(body: string, signature: string, timestamp: string, apiKey: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(timestamp + body)
      .digest('hex')
    
    return `v1=${expectedSignature}` === signature
  }
}