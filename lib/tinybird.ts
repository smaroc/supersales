import { User } from './types'

const TINYBIRD_HOST = process.env.TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN

export interface TinybirdResponse<T> {
  data: T[]
  meta: { name: string; type: string }[]
  rows: number
  statistics: { elapsed: number; rows_read: number; bytes_read: number }
}

export interface TinybirdIngestResponse {
  successful_rows: number
  quarantined_rows: number
}

export class TinybirdClient {
  private baseUrl: string
  private token: string

  constructor() {
    if (!TINYBIRD_TOKEN) {
      throw new Error('TINYBIRD_TOKEN environment variable is required')
    }
    this.baseUrl = TINYBIRD_HOST
    this.token = TINYBIRD_TOKEN
  }

  /**
   * Query a Tinybird pipe endpoint
   */
  async query<T>(
    pipeName: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<TinybirdResponse<T>> {
    const url = new URL(`/v0/pipes/${pipeName}.json`, this.baseUrl)

    // Add non-undefined params to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      next: { revalidate: 0 }, // Disable caching for real-time data
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Tinybird query failed: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Ingest data into a Tinybird data source
   */
  async ingest(
    datasourceName: string,
    data: Record<string, unknown> | Record<string, unknown>[]
  ): Promise<TinybirdIngestResponse> {
    const url = new URL(`/v0/events`, this.baseUrl)
    url.searchParams.append('name', datasourceName)

    const rows = Array.isArray(data) ? data : [data]
    const ndjson = rows.map((row) => JSON.stringify(row)).join('\n')

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjson,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Tinybird ingest failed: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Build access control params based on user permissions
   * - SuperAdmin: no filter (sees all data)
   * - Admin: filter by organization
   * - Regular user: filter by organization AND sales_rep_id
   */
  buildAccessParams(user: User): Record<string, string | undefined> {
    // SuperAdmin: no filter
    if (user.isSuperAdmin) {
      return {}
    }

    // Admin: filter by organization only
    if (user.isAdmin) {
      return {
        organization_id: user.organizationId.toString(),
      }
    }

    // Regular user: filter by organization AND their own ID
    return {
      organization_id: user.organizationId.toString(),
      sales_rep_id: user._id?.toString(),
    }
  }

  /**
   * Query call records with pagination
   */
  async getCallRecords(
    user: User,
    options: {
      page?: number
      limit?: number
      source?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    } = {}
  ) {
    const accessParams = this.buildAccessParams(user)
    const { page = 1, limit = 50, source, status, dateFrom, dateTo } = options

    return this.query<{
      id: string
      organization_id: string
      sales_rep_id: string
      sales_rep_name: string
      source: string
      title: string
      transcript: string
      scheduled_start_time: string
      actual_duration: number
      status: string
      created_at: string
    }>('call_records_paginated', {
      ...accessParams,
      limit,
      offset: (page - 1) * limit,
      source,
      status,
      date_from: dateFrom,
      date_to: dateTo,
    })
  }

  /**
   * Get call records count for pagination
   */
  async getCallRecordsCount(
    user: User,
    options: {
      source?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    } = {}
  ) {
    const accessParams = this.buildAccessParams(user)
    const { source, status, dateFrom, dateTo } = options

    return this.query<{ total: number }>('call_records_count', {
      ...accessParams,
      source,
      status,
      date_from: dateFrom,
      date_to: dateTo,
    })
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(
    user: User,
    options: {
      typeOfCall?: string
      dateFrom?: string
      dateTo?: string
    } = {}
  ) {
    const accessParams = this.buildAccessParams(user)
    const { typeOfCall, dateFrom, dateTo } = options

    return this.query<{
      total_calls: number
      closed_deals: number
      conversion_rate: number
      total_revenue: number
      invoiced_revenue: number
      collected_revenue: number
      team_performance: number
      qualified_leads: number
      no_show_count: number
      pitch_count: number
    }>('dashboard_metrics', {
      ...accessParams,
      type_of_call: typeOfCall,
      date_from: dateFrom,
      date_to: dateTo,
    })
  }

  /**
   * Get dashboard chart data (daily aggregations)
   */
  async getDashboardChartData(
    user: User,
    options: {
      days?: number
      dateFrom?: string
      dateTo?: string
    } = {}
  ) {
    const accessParams = this.buildAccessParams(user)
    const { days, dateFrom, dateTo } = options

    return this.query<{
      date: string
      calls: number
      sales: number
      revenue: number
    }>('dashboard_chart_data', {
      ...accessParams,
      days,
      date_from: dateFrom,
      date_to: dateTo,
    })
  }

  /**
   * Get sales rep performance ranking
   */
  async getSalesRepPerformance(
    user: User,
    options: {
      typeOfCall?: string
      dateFrom?: string
      dateTo?: string
      limit?: number
    } = {}
  ) {
    const accessParams = this.buildAccessParams(user)
    // Only pass organization_id for ranking (admins see all reps)
    const params = user.isSuperAdmin
      ? {}
      : { organization_id: user.organizationId.toString() }

    const { typeOfCall, dateFrom, dateTo, limit = 50 } = options

    return this.query<{
      sales_rep_id: string
      sales_rep_name: string
      total_calls: number
      deals_won: number
      total_revenue: number
      avg_score: number
      win_rate: number
      no_show_count: number
      pitch_count: number
    }>('sales_rep_performance', {
      ...params,
      type_of_call: typeOfCall,
      date_from: dateFrom,
      date_to: dateTo,
      limit,
    })
  }

  /**
   * Get top objections
   */
  async getTopObjections(
    user: User,
    options: {
      dateFrom?: string
      dateTo?: string
      limit?: number
    } = {}
  ) {
    const accessParams = this.buildAccessParams(user)
    const { dateFrom, dateTo, limit = 10 } = options

    return this.query<{
      objection: string
      total_count: number
      resolved_count: number
      resolution_rate: number
      objection_type: string | null
    }>('top_objections', {
      ...accessParams,
      date_from: dateFrom,
      date_to: dateTo,
      limit,
    })
  }

  /**
   * Get weekly report stats
   */
  async getWeeklyReportStats(
    organizationId: string,
    weekStart: string,
    weekEnd: string,
    salesRepId?: string
  ) {
    return this.query<{
      sales_rep_id: string
      closeur: string
      total_calls: number
      sales_won: number
      sales_lost: number
      win_rate: number
      average_score: number
      no_show_count: number
      pitch_count: number
      strengths: string[]
      improvements: string[]
    }>('weekly_report_stats', {
      organization_id: organizationId,
      week_start: weekStart,
      week_end: weekEnd,
      sales_rep_id: salesRepId,
    })
  }

  /**
   * Get Head of Sales weekly report stats (team-wide)
   */
  async getHosWeeklyReportStats(
    organizationId: string,
    weekStart: string,
    weekEnd: string
  ) {
    return this.query<{
      stats: {
        total_calls: number
        total_sales: number
        win_rate: number
        no_show_count: number
        no_show_rate: number
        pitch_count: number
        pitch_rate: number
        average_score: number
      }
      top_closers: Array<[string, number, number]>  // [name, sales, win_rate]
      top_objections: Array<[string, number, number]>  // [objection, total, resolved_rate]
    }>('weekly_report_hos_stats', {
      organization_id: organizationId,
      week_start: weekStart,
      week_end: weekEnd,
    })
  }

  /**
   * Get call analyses with pagination
   */
  async getCallAnalyses(
    user: User,
    options: {
      page?: number
      limit?: number
      analysisStatus?: string
      typeOfCall?: string
      dateFrom?: string
      dateTo?: string
    } = {}
  ) {
    const accessParams = this.buildAccessParams(user)
    const { page = 1, limit = 50, analysisStatus, typeOfCall, dateFrom, dateTo } = options

    return this.query<{
      id: string
      organization_id: string
      call_record_id: string
      sales_rep_id: string
      type_of_call: string
      closeur: string
      prospect: string
      vente_effectuee: number
      deal_value: number | null
      note_globale_total: number
      analysis_status: string
      created_at: string
    }>('call_analysis_paginated', {
      ...accessParams,
      limit,
      offset: (page - 1) * limit,
      analysis_status: analysisStatus,
      type_of_call: typeOfCall,
      date_from: dateFrom,
      date_to: dateTo,
    })
  }

  /**
   * Get call evaluations with pagination
   */
  async getCallEvaluations(
    user: User,
    options: {
      page?: number
      limit?: number
      outcome?: string
      dateFrom?: string
      dateTo?: string
    } = {}
  ) {
    const accessParams = this.buildAccessParams(user)
    const { page = 1, limit = 50, outcome, dateFrom, dateTo } = options

    return this.query<{
      id: string
      organization_id: string
      call_id: string
      sales_rep_id: string
      call_type: string
      evaluation_date: string
      duration: number
      outcome: string
      deal_value: number | null
      total_score: number
      weighted_score: number
    }>('call_evaluations_paginated', {
      ...accessParams,
      limit,
      offset: (page - 1) * limit,
      outcome,
      date_from: dateFrom,
      date_to: dateTo,
    })
  }

  /**
   * Get public call analysis by share token
   */
  async getPublicCallAnalysis(shareToken: string) {
    return this.query<{
      id: string
      closeur: string
      prospect: string
      vente_effectuee: number
      deal_value: number | null
      note_globale_total: number
      partie_excellente: string | null
      partie_a_travailler: string | null
      created_at: string
    }>('call_analysis_public', {
      share_token: shareToken,
    })
  }
}

// Singleton instance
let tinybirdClient: TinybirdClient | null = null

export function getTinybirdClient(): TinybirdClient {
  if (!tinybirdClient) {
    tinybirdClient = new TinybirdClient()
  }
  return tinybirdClient
}

/**
 * Check if Tinybird is configured
 */
export function isTinybirdConfigured(): boolean {
  return !!process.env.TINYBIRD_TOKEN
}

/**
 * Check if Tinybird reads are enabled
 */
export function isTinybirdReadsEnabled(): boolean {
  return process.env.ENABLE_TINYBIRD_READS === 'true'
}

/**
 * Check if Tinybird dual-write is enabled
 */
export function isTinybirdDualWriteEnabled(): boolean {
  return process.env.ENABLE_TINYBIRD_DUAL_WRITE === 'true'
}
