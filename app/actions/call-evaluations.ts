'use server'

import { auth } from '@clerk/nextjs/server'
import { ObjectId } from 'mongodb'
import connectToDatabase from '@/lib/mongodb'
import { CallEvaluation, CallType, User, COLLECTIONS } from '@/lib/types'
import { buildCallEvaluationsFilter, hasAdminAccess } from '@/lib/access-control'

const ALLOWED_ROLES = ['head_of_sales', 'admin', 'manager'] as const

type AllowedRole = (typeof ALLOWED_ROLES)[number]

type TimeRange = 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'thisYear'

interface CallDetailResponse {
  _id: string
  callId: string
  salesRep: {
    id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  callType: string
  evaluationDate: string
  duration: number
  outcome: string
  totalScore: number
  weightedScore: number
  scores: Array<{
    criteriaId: string
    criteriaName: string
    score: number | boolean | string
    weight?: number
    maxScore?: number
  }>
  notes: string
  nextSteps: string[]
  recording?: any
}

interface CallEvaluationsResult {
  calls: CallDetailResponse[]
  pagination: {
    page: number
    limit: number
    total: number
  }
  salesReps: Array<{ id: string; name: string }>
  callTypes: string[]
}

function resolveStartDate(timeRange: TimeRange): Date {
  const now = new Date()

  switch (timeRange) {
    case 'thisWeek':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    case 'thisQuarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), quarter * 3, 1)
    }
    case 'thisYear':
      return new Date(now.getFullYear(), 0, 1)
    case 'thisMonth':
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}

function toScoresArray(scores: CallEvaluation['scores']): CallDetailResponse['scores'] {
  if (Array.isArray(scores)) {
    return scores as CallDetailResponse['scores']
  }

  if (scores && typeof scores === 'object') {
    return Object.entries(scores).map(([criteriaName, score]) => ({
      criteriaId: criteriaName,
      criteriaName,
      score,
      weight: typeof score === 'number' ? 1 : undefined
    }))
  }

  return []
}

function normalizeNextSteps(nextSteps: CallEvaluation['nextSteps']): string[] {
  if (Array.isArray(nextSteps)) {
    return nextSteps as string[]
  }

  if (typeof nextSteps === 'string') {
    return [nextSteps]
  }

  return []
}

export async function getCallEvaluationsForHeadOfSales(
  timeRange: TimeRange = 'thisMonth',
  page = 1,
  limit = 100
): Promise<CallEvaluationsResult> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { db } = await connectToDatabase()

  const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

  if (!currentUser) {
    throw new Error('User not found')
  }

  // Check permissions: Allow admins, super admins, and specific roles
  if (!hasAdminAccess(currentUser) && !ALLOWED_ROLES.includes(currentUser.role as AllowedRole)) {
    throw new Error('Insufficient permissions')
  }

  const startDate = resolveStartDate(timeRange)

  // Build access filter based on user permissions
  const accessFilter = buildCallEvaluationsFilter(currentUser)

  const filter = {
    ...accessFilter,
    evaluationDate: { $gte: startDate }
  }

  console.log(`Call evaluations filter applied: ${JSON.stringify(filter)}`)

  const evaluationsCollection = db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS)
  const total = await evaluationsCollection.countDocuments(filter)

  const evaluations = await evaluationsCollection
    .find(filter)
    .sort({ evaluationDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()

  const uniqueSalesRepIds = Array.from(new Set(evaluations.map(e => e.salesRepId).filter(Boolean)))

  const objectIdSalesRepIds = uniqueSalesRepIds.filter(id => ObjectId.isValid(id))
  const clerkIdSalesRepIds = uniqueSalesRepIds.filter(id => !ObjectId.isValid(id))

  const usersCollection = db.collection<User>(COLLECTIONS.USERS)

  const [salesRepsByObjectId, salesRepsByClerkId] = await Promise.all([
    objectIdSalesRepIds.length > 0
      ? usersCollection.find({ _id: { $in: objectIdSalesRepIds.map(id => new ObjectId(id)) } }, { projection: { firstName: 1, lastName: 1, avatar: 1 } }).toArray()
      : Promise.resolve([]),
    clerkIdSalesRepIds.length > 0
      ? usersCollection.find({ clerkId: { $in: clerkIdSalesRepIds } }, { projection: { firstName: 1, lastName: 1, avatar: 1, clerkId: 1 } }).toArray()
      : Promise.resolve([])
  ])

  const salesRepMap = new Map<string, Pick<User, 'firstName' | 'lastName' | 'avatar'>>()

  salesRepsByObjectId.forEach(rep => {
    if (rep._id) {
      salesRepMap.set(rep._id.toString(), rep)
    }
  })

  salesRepsByClerkId.forEach(rep => {
    if (rep.clerkId) {
      salesRepMap.set(rep.clerkId, rep)
    }
  })

  const calls: CallDetailResponse[] = evaluations.map(evaluation => {
    const repInfo = salesRepMap.get(evaluation.salesRepId) || {
      firstName: 'Commercial',
      lastName: 'Supprimé'
    }

    return {
      _id: evaluation._id?.toString() || evaluation.callId || '',
      callId: evaluation.callId,
      salesRep: {
        id: evaluation.salesRepId,
        firstName: repInfo.firstName || 'Commercial',
        lastName: repInfo.lastName || 'Inconnu',
        avatar: repInfo.avatar as string | undefined
      },
      callType: evaluation.callType,
      evaluationDate: evaluation.evaluationDate instanceof Date
        ? evaluation.evaluationDate.toISOString()
        : new Date(evaluation.evaluationDate).toISOString(),
      duration: evaluation.duration || 0,
      outcome: evaluation.outcome,
      totalScore: evaluation.totalScore || 0,
      weightedScore: evaluation.weightedScore || 0,
      scores: toScoresArray(evaluation.scores),
      notes: evaluation.notes || '',
      nextSteps: normalizeNextSteps(evaluation.nextSteps),
      recording: (evaluation as any).recording
    }
  })

  const [salesRepsForFilters, callTypes] = await Promise.all([
    usersCollection
      .find({
        organizationId: currentUser.organizationId,
        role: { $in: ['sales_rep', 'manager'] },
        isActive: true
      }, { projection: { firstName: 1, lastName: 1 } })
      .toArray(),
    db.collection<CallType>(COLLECTIONS.CALL_TYPES)
      .find({
        organizationId: currentUser.organizationId,
        isActive: true
      }, { projection: { code: 1 } })
      .toArray()
  ])

  const response: CallEvaluationsResult = {
    calls,
    pagination: {
      page,
      limit,
      total
    },
    salesReps: salesRepsForFilters.map(rep => ({
      id: rep._id?.toString() || rep.clerkId || '',
      name: `${rep.firstName || ''} ${rep.lastName || ''}`.trim()
    })),
    callTypes: Array.from(new Set(callTypes.map(ct => ct.code))).filter(Boolean) as string[]
  }

  return JSON.parse(JSON.stringify(response))
}
