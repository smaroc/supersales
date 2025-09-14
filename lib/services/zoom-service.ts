import crypto from 'crypto'

export class ZoomService {
  private clientId: string
  private clientSecret: string
  private accessToken?: string

  constructor(config?: { clientId?: string; clientSecret?: string; accessToken?: string }) {
    this.clientId = config?.clientId || ''
    this.clientSecret = config?.clientSecret || ''
    this.accessToken = config?.accessToken
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.clientId || !this.clientSecret) {
        return {
          success: false,
          message: 'Client ID and Client Secret are required'
        }
      }

      // Test by getting user info
      const token = await this.getAccessToken()
      const userInfo = await this.makeApiCall('/users/me', 'GET', {}, token)

      return {
        success: true,
        message: 'Connection successful',
        details: {
          user: userInfo.email,
          account_id: userInfo.account_id
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

  async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    
    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get access token: ${error.error_description || error.error}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    return data.access_token
  }

  async getTranscript(meetingUuid: string): Promise<{ transcript: string; participants: any[] }> {
    try {
      const token = await this.getAccessToken()
      
      // Get meeting recordings
      const recordings = await this.makeApiCall(`/meetings/${meetingUuid}/recordings`, 'GET', {}, token)
      
      // Find transcript file
      const transcriptFile = recordings.recording_files.find((file: any) => 
        file.file_type === 'TRANSCRIPT' || file.recording_type === 'audio_transcript'
      )

      if (!transcriptFile) {
        throw new Error('Transcript file not found')
      }

      // Download transcript
      const transcriptResponse = await fetch(transcriptFile.download_url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!transcriptResponse.ok) {
        throw new Error('Failed to download transcript')
      }

      const transcript = await transcriptResponse.text()
      
      // Get participant information
      const participants = recordings.participants || []

      return {
        transcript,
        participants: participants.map((p: any) => ({
          name: p.name,
          email: p.email,
          duration: p.duration
        }))
      }
    } catch (error) {
      console.error('Error getting Zoom transcript:', error)
      throw error
    }
  }

  async getRecordings(from: Date, to: Date): Promise<any[]> {
    const token = await this.getAccessToken()
    const fromStr = from.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]
    
    const data = await this.makeApiCall(
      `/users/me/recordings?from=${fromStr}&to=${toStr}`,
      'GET',
      {},
      token
    )

    return data.meetings || []
  }

  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any,
    token?: string
  ): Promise<any> {
    const url = `https://api.zoom.us/v2${endpoint}`
    const accessToken = token || await this.getAccessToken()

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API request failed' }))
      const apiError = new Error(`Zoom API error: ${error.message || response.statusText}`)
      ;(apiError as any).cause = { status: response.status, details: error }
      throw apiError
    }

    return response.json()
  }

  static verifyWebhookSignature(body: string, signature: string, secretToken: string): boolean {
    const hash = crypto.createHmac('sha256', secretToken).update(body).digest('hex')
    return `v0=${hash}` === signature
  }
}