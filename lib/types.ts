import { ObjectId } from 'mongodb'

// User Types
export interface User {
  _id?: ObjectId
  clerkId: string
  organizationId: ObjectId
  email: string
  firstName: string
  lastName: string
  role: 'owner' | 'admin' | 'manager' | 'head_of_sales' | 'sales_rep' | 'viewer'
  isAdmin: boolean // Simple admin flag for user management
  avatar?: string
  isActive: boolean
  lastLoginAt?: Date
  permissions: {
    canViewAllData: boolean
    canManageUsers: boolean
    canManageSettings: boolean
    canExportData: boolean
    canDeleteData: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: {
      email: boolean
      inApp: boolean
      callSummaries: boolean
      weeklyReports: boolean
    }
    dashboard: {
      defaultView: 'overview' | 'calls' | 'ranking' | 'analytics'
      refreshInterval: number
    }
  }
  createdAt: Date
  updatedAt: Date
}

// Organization Types
export interface Organization {
  _id?: ObjectId
  name: string
  domain: string
  industry: string
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  subscription: {
    plan: 'free' | 'basic' | 'professional' | 'enterprise'
    status: 'active' | 'inactive' | 'trial' | 'cancelled'
    startDate?: Date
    endDate?: Date
  }
  settings: {
    timezone: string
    currency: string
    dateFormat: string
    callRecording: boolean
    autoAnalysis: boolean
  }
  callInsights: Array<{
    name: string
    description: string
    keywords: string[]
    weightage: number
    category: 'positive' | 'negative' | 'opportunity'
  }>
  createdAt: Date
  updatedAt: Date
}

// Call Types
export interface CallType {
  _id?: ObjectId
  organizationId: ObjectId
  name: string
  code: string
  description: string
  order: number
  color: string
  isActive: boolean
  metrics: {
    targetClosingRate: number
    avgDuration: number
    followUpDays: number
  }
  criteria: Array<{
    name: string
    description: string
    weight: number
    type: 'boolean' | 'scale' | 'percentage'
    scaleMax?: number
  }>
  createdAt: Date
  updatedAt: Date
}

// Call Evaluation Types
export interface CallEvaluation {
  _id?: ObjectId
  organizationId: ObjectId
  callId: string
  salesRepId: string
  evaluatorId: ObjectId
  callTypeId: string
  callType: string
  evaluationDate: Date
  duration: number
  outcome: 'qualified' | 'not_qualified' | 'follow_up' | 'closed_won' | 'closed_lost'
  scores: Record<string, number | boolean>
  totalScore: number
  weightedScore: number
  notes?: string
  nextSteps?: string
  followUpDate?: Date
  createdAt: Date
  updatedAt: Date
}

// Call Record Types
export interface CallRecord {
  _id?: ObjectId
  organizationId: ObjectId
  salesRepId: string
  salesRepName: string
  source: 'fathom' | 'fireflies' | 'zoom' | 'manual'
  // Platform-specific external IDs
  fathomCallId?: string
  firefliesCallId?: string
  zoomCallId?: string
  title: string
  scheduledStartTime: Date
  scheduledEndTime: Date
  actualDuration: number
  scheduledDuration: number
  transcript?: string
  recordingUrl?: string
  shareUrl?: string
  invitees: Array<{
    email: string
    name: string
    isExternal: boolean
  }>
  hasExternalInvitees: boolean
  metadata?: Record<string, any>
  status: 'pending' | 'processing' | 'evaluated' | 'archived'
  evaluationId?: string
  createdAt: Date
  updatedAt: Date
}

// Integration Types
export interface Integration {
  _id?: ObjectId
  organizationId: ObjectId
  platform: 'zoom' | 'fathom' | 'fireflies'
  name: string
  isActive: boolean
  configuration: Record<string, string>
  lastSyncAt?: Date
  syncStatus: 'idle' | 'syncing' | 'error'
  syncError?: string
  createdAt: Date
  updatedAt: Date
}

// Sales Representative Performance Types
export interface SalesRepresentative {
  _id?: ObjectId
  userId: ObjectId
  organizationId: ObjectId
  metrics: {
    totalCalls: number
    totalPitches: number
    r1Calls: number
    r2Calls: number
    r3Calls: number
    r1ClosingRate: number
    r2ClosingRate: number
    overallClosingRate: number
    thisMonthCalls: number
    thisMonthClosings: number
    totalRevenue: number
    dealsClosedQTD: number
  }
  performance: {
    trend: 'up' | 'down' | 'stable'
    score: number
    rank: number
  }
  lastUpdated: Date
  createdAt: Date
  updatedAt: Date
}

// Dashboard Metrics Types
export interface DashboardMetrics {
  _id?: ObjectId
  organizationId: ObjectId
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  date: Date
  metrics: {
    totalCalls: number
    totalRevenue: number
    conversionRate: number
    teamPerformance: number
    avgCallDuration: number
    qualifiedLeads: number
    closedDeals: number
  }
  breakdown: {
    byCallType: Record<string, number>
    bySalesRep: Record<string, number>
    byOutcome: Record<string, number>
  }
  createdAt: Date
  updatedAt: Date
}

// Database Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  CALL_TYPES: 'calltypes',
  CALL_EVALUATIONS: 'callevaluations',
  CALL_RECORDS: 'callrecords',
  INTEGRATIONS: 'integrations',
  SALES_REPRESENTATIVES: 'salesrepresentatives',
  DASHBOARD_METRICS: 'dashboardmetrics'
} as const

// Utility Types
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]

export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Filter Types
export interface CallEvaluationFilters {
  salesRepId?: string
  callType?: string
  outcome?: string
  dateFrom?: Date
  dateTo?: Date
  minScore?: number
  maxScore?: number
}

export interface UserFilters {
  role?: string
  isActive?: boolean
  organizationId?: ObjectId
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  error: string
  code?: string
  details?: any
}