export class ClaapService {
  private apiKey: string
  private baseUrl: string = 'https://api.claap.io/v1'

  constructor(config?: {
    apiKey?: string
  }) {
    this.apiKey = config?.apiKey || ''
    console.log('[ClaapService] Constructor - config received:', {
      hasConfig: !!config,
      hasApiKey: !!config?.apiKey,
      apiKeyLength: config?.apiKey?.length || 0,
      apiKeyPrefix: config?.apiKey?.substring(0, 4) || 'none'
    })
    console.log('[ClaapService] Constructor - apiKey set:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      apiKeyPrefix: this.apiKey?.substring(0, 4) || 'none'
    })
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log('[ClaapService] Starting connection test...')
    console.log('[ClaapService] Base URL:', this.baseUrl)
    console.log('[ClaapService] API Key present:', !!this.apiKey)
    console.log('[ClaapService] API Key length:', this.apiKey?.length || 0)

    try {
      if (!this.apiKey) {
        console.log('[ClaapService] Connection test failed - No API key provided')
        return {
          success: false,
          message: 'API Key is required'
        }
      }

      // Test by listing recordings (simple GET request)
      console.log('[ClaapService] Making test API call to /claaps endpoint...')
      const response = await this.makeApiCall('/claaps?limit=1', 'GET')

      console.log('[ClaapService] Connection test successful!')
      console.log('[ClaapService] Response:', JSON.stringify(response, null, 2))

      return {
        success: true,
        message: 'Connection successful - API key is valid',
        details: {
          apiVersion: 'v1'
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Connection failed'
      const status = error.cause?.status

      console.error('[ClaapService] Connection test failed!')
      console.error('[ClaapService] Error status:', status)
      console.error('[ClaapService] Error message:', errorMessage)
      console.error('[ClaapService] Full error:', error)

      let friendlyMessage = errorMessage
      if (status === 401 || status === 403) {
        friendlyMessage = 'Invalid API key - please check your credentials'
        console.error('[ClaapService] Authentication failed - invalid credentials')
      } else if (status === 429) {
        friendlyMessage = 'Rate limit exceeded - please try again later'
        console.error('[ClaapService] Rate limit exceeded')
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

  // Note: Webhook creation is not supported programmatically by Claap API
  // Users must manually create webhooks in Claap dashboard

  async getRecording(recordingId: string): Promise<any> {
    console.log('[ClaapService] Fetching recording:', recordingId)

    if (!this.apiKey) {
      console.error('[ClaapService] API key not initialized')
      throw new Error('Claap API key not provided')
    }

    try {
      const response = await this.makeApiCall(
        `/claaps/${recordingId}`,
        'GET'
      )

      console.log('[ClaapService] Successfully fetched recording:', recordingId)

      return response
    } catch (error: any) {
      console.error('[ClaapService] Error fetching recording:', recordingId, error)
      throw error
    }
  }

  async getRecordingTranscript(recordingId: string): Promise<any> {
    console.log('[ClaapService] Fetching transcript for recording:', recordingId)

    if (!this.apiKey) {
      console.error('[ClaapService] API key not initialized')
      throw new Error('Claap API key not provided')
    }

    try {
      const response = await this.makeApiCall(
        `/claaps/${recordingId}/transcript`,
        'GET'
      )

      console.log('[ClaapService] Successfully fetched transcript for recording:', recordingId)

      return response
    } catch (error: any) {
      console.error('[ClaapService] Error fetching transcript for recording:', recordingId, error)
      throw error
    }
  }

  async listRecordings(limit: number = 50): Promise<any[]> {
    console.log('[ClaapService] Fetching recordings...')
    console.log('[ClaapService] Limit:', limit)

    if (!this.apiKey) {
      console.error('[ClaapService] API key not initialized')
      throw new Error('Claap API key not provided')
    }

    try {
      const response = await this.makeApiCall(
        `/claaps?limit=${limit}`,
        'GET'
      )

      console.log('[ClaapService] Successfully fetched recordings')
      const recordings = response.claaps || response.data || []
      console.log('[ClaapService] Recordings count:', recordings.length)

      return recordings
    } catch (error: any) {
      console.error('[ClaapService] Error fetching recordings:', error)
      throw error
    }
  }

  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`

    console.log(`[ClaapService] API Call - ${method} ${url}`)
    console.log(`[ClaapService] API Key being used:`, {
      exists: !!this.apiKey,
      length: this.apiKey?.length || 0,
      prefix: this.apiKey?.substring(0, 10) || 'none',
      fullKey: this.apiKey // TEMPORARY - for debugging only
    })

    const options: RequestInit = {
      method,
      headers: {
        'X-Claap-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    }

    console.log(`[ClaapService] Full request options:`, {
      method: options.method,
      headers: options.headers,
      url
    })

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
      console.log(`[ClaapService] Request body:`, body)
    }

    const response = await fetch(url, options)

    console.log(`[ClaapService] Response status: ${response.status} ${response.statusText}`)
    console.log(`[ClaapService] Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[ClaapService] Error response body:`, errorText)

      let error: any
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || 'API request failed' }
      }

      const apiError = new Error(`Claap API error: ${error.message || response.statusText}`)
      ;(apiError as any).cause = { status: response.status, details: error }
      throw apiError
    }

    const responseData = await response.json()
    console.log(`[ClaapService] Response data:`, JSON.stringify(responseData, null, 2))

    return responseData
  }
}
