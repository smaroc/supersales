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
  isSuperAdmin: boolean // Super admin with elevated privileges
  avatar?: string
  isActive: boolean
  isDeleted?: boolean // Soft delete flag
  deletedAt?: Date // When user was deleted
  deletedBy?: ObjectId // Who deleted the user
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
  customAnalysisCriteria?: Array<{
    id: string
    title: string
    description: string
    createdAt: Date
  }>
  autoRunCustomCriteria?: boolean
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
  userId: string
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
  userId: string
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
    type: 'boolean' | 'scale' | 'percentage' | 'text'
    scaleMax?: number
  }>
  createdAt: Date
  updatedAt: Date
}

// Call Evaluation Types
export interface CallEvaluation {
  _id?: ObjectId
  organizationId: ObjectId
  userId: string
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
  userId: ObjectId
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

// System Configuration Types (for OAuth apps, etc.)
export interface SystemConfig {
  _id?: ObjectId
  key: string // e.g., 'fathom_oauth_app'
  config: Record<string, string> // encrypted values
  isActive: boolean
  createdBy: string // User ID who created
  createdAt: Date
  updatedAt: Date
}

// Integration Types
export interface Integration {
  _id?: ObjectId
  organizationId: ObjectId
  userId: ObjectId
  platform: 'zoom' | 'fathom' | 'fireflies'
  name: string
  isActive: boolean
  configuration: Record<string, string>
  webhookUrl?: string
  webhookId?: string // External webhook ID (e.g., from Fathom)
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
  createdByUserId: string
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
  userId: string
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

// Analysis Configuration Types
export interface AnalysisConfiguration {
  _id?: ObjectId
  organizationId: ObjectId
  prompt: string
  model: string // GPT model to use (e.g., 'gpt-4o', 'gpt-4o-mini', etc.)
  isActive: boolean
  version: number
  createdBy: string // User ID who created this config
  createdAt: Date
  updatedAt: Date
}

// OpenAI Call Analysis Types
export interface CallAnalysis {
  _id?: ObjectId
  organizationId: ObjectId
  userId: string
  callRecordId: ObjectId
  salesRepId: string
  closeur: string
  prospect: string
  dureeAppel: string
  venteEffectuee: boolean
  temps_de_parole_closeur: number
  temps_de_parole_client: number
  resume_de_lappel: string
  objections_lead?: Array<{
    objection: string
    timestamp?: string
    type_objection?: string
    traitement?: string
    resolue: boolean
    commentaire?: string
  }>
  lead_scoring?: {
    score_global?: number
    qualite?: string
    criteres_evaluation?: any
    recommandation?: string
  }
  evaluationCompetences: Array<{
    etapeProcessus: string
    evaluation: number
    temps_passe: number
    temps_passe_mm_ss: string
    timestamps: string
    commentaire: string
    validation: boolean
  }>
  noteGlobale: {
    total: number
    sur100: string
  }
  resumeForces: Array<{
    pointFort: string
  }>
  axesAmelioration: Array<{
    axeAmelioration: string
    suggestion: string
    exemple_issu_de_lappel: string
    alternative: string
  }>
  commentairesSupplementaires: {
    feedbackGeneral: string
    prochainesEtapes: string
  }
  notesAdditionnelles: {
    timestampsImportants: string[]
    ressourcesRecommandees: string[]
  }
  customCriteriaResults?: Array<{
    criteriaId: string
    criteriaTitle: string
    analysis: string
    score?: number
    highlights?: string[]
    analyzedAt: Date
  }>
  rawAnalysisResponse?: string
  analysisStatus: 'pending' | 'completed' | 'failed'
  analysisError?: string
  isPublic?: boolean
  shareToken?: string
  sharedAt?: Date
  sharedBy?: string
  createdAt: Date
  updatedAt: Date
}

// Invitation Types
export interface Invitation {
  _id?: ObjectId
  organizationId: ObjectId
  invitedBy: ObjectId
  email: string
  firstName: string
  lastName: string
  role: 'owner' | 'admin' | 'manager' | 'head_of_sales' | 'sales_rep' | 'viewer'
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: Date
  acceptedAt?: Date
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
  CALL_ANALYSIS: 'callanalysis',
  ANALYSIS_CONFIGURATIONS: 'analysisconfigurations',
  INTEGRATIONS: 'integrations',
  SALES_REPRESENTATIVES: 'salesrepresentatives',
  DASHBOARD_METRICS: 'dashboardmetrics',
  SYSTEM_CONFIGS: 'systemconfigs',
  INVITATIONS: 'invitations',
  DESAMIANTAGE_PROJECTS: 'desamiantageprojects',
  ASBESTOS_MATERIALS: 'asbestosmaterials',
  WORK_RATE_CONFIGS: 'workrateconfigs',
  EQUIPMENT_TEMPLATES: 'equipmenttemplates'
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