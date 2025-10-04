'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { ObjectId } from 'mongodb'
import connectToDatabase from '@/lib/mongodb'
import { CallType, User, COLLECTIONS } from '@/lib/types'

interface CallTypeFormData {
  name: string
  code: string
  description: string
  order?: number
  color?: string
  isActive?: boolean
  metrics: {
    targetClosingRate: number
    avgDuration: number
    followUpDays?: number
    followUpRequired?: boolean
  }
  evaluationCriteria: Array<{
    name: string
    description: string
    weight: number
    type: 'boolean' | 'scale' | 'percentage' | 'text'
    scaleMax?: number
  }>
}

const ALLOWED_ROLES = ['admin', 'head_of_sales', 'manager'] as const

type AllowedRole = (typeof ALLOWED_ROLES)[number]

async function getCurrentUser(): Promise<User> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { db } = await connectToDatabase()
  const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

  if (!currentUser) {
    throw new Error('User not found')
  }

  return currentUser
}

function ensureRole(user: User, allowedRoles: readonly AllowedRole[]) {
  if (!allowedRoles.includes(user.role as AllowedRole)) {
    throw new Error('Insufficient permissions')
  }
}

function addComputedFields(callType: CallType) {
  const followUpRequired = callType.metrics.followUpDays > 0

  return {
    ...callType,
    metrics: {
      ...callType.metrics,
      followUpRequired
    }
  }
}

export async function getCallTypesForCurrentUser() {
  const currentUser = await getCurrentUser()
  const { db } = await connectToDatabase()

  const callTypes = await db.collection<CallType>(COLLECTIONS.CALL_TYPES)
    .find({ organizationId: currentUser.organizationId })
    .sort({ order: 1 })
    .toArray()

  return JSON.parse(JSON.stringify(callTypes.map(addComputedFields)))
}

export async function createCallType(formData: CallTypeFormData) {
  const currentUser = await getCurrentUser()
  ensureRole(currentUser, ALLOWED_ROLES)

  const { db } = await connectToDatabase()

  if (!formData.name || !formData.code || !formData.description) {
    throw new Error('Name, code, and description are required')
  }

  const existingCallType = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).findOne({
    organizationId: currentUser.organizationId,
    code: formData.code.toUpperCase()
  })

  if (existingCallType) {
    throw new Error('Call type code already exists')
  }

  const lastCallType = await db.collection<CallType>(COLLECTIONS.CALL_TYPES)
    .findOne(
      { organizationId: currentUser.organizationId },
      { sort: { order: -1 } }
    )

  const followUpDays = formData.metrics.followUpDays ?? (formData.metrics.followUpRequired ? 3 : 0)

  const callType: Omit<CallType, '_id'> = {
    organizationId: currentUser.organizationId,
    name: formData.name,
    code: formData.code.toUpperCase(),
    description: formData.description,
    order: formData.order ?? (lastCallType ? lastCallType.order + 1 : 1),
    color: formData.color || '#3B82F6',
    isActive: formData.isActive ?? true,
    metrics: {
      targetClosingRate: formData.metrics.targetClosingRate,
      avgDuration: formData.metrics.avgDuration,
      followUpDays
    },
    criteria: formData.evaluationCriteria || [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const result = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).insertOne(callType)
  const savedCallType = await db.collection<CallType>(COLLECTIONS.CALL_TYPES)
    .findOne({ _id: result.insertedId })

  revalidatePath('/dashboard/settings/call-types')

  return JSON.parse(JSON.stringify(savedCallType ? addComputedFields(savedCallType) : null))
}

export async function updateCallType(callTypeId: string, formData: Partial<CallTypeFormData>) {
  const currentUser = await getCurrentUser()
  ensureRole(currentUser, ALLOWED_ROLES)

  const { db } = await connectToDatabase()

  if (!ObjectId.isValid(callTypeId)) {
    throw new Error('Invalid call type id')
  }

  const existing = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).findOne({
    _id: new ObjectId(callTypeId),
    organizationId: currentUser.organizationId
  })

  if (!existing) {
    throw new Error('Call type not found')
  }

  if (formData.code && formData.code.toUpperCase() !== existing.code) {
    const duplicate = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).findOne({
      organizationId: currentUser.organizationId,
      code: formData.code.toUpperCase(),
      _id: { $ne: new ObjectId(callTypeId) }
    })

    if (duplicate) {
      throw new Error('Call type code already exists')
    }
  }

  const followUpDays = formData.metrics?.followUpDays ?? (formData.metrics?.followUpRequired !== undefined
    ? (formData.metrics.followUpRequired ? Math.max(existing.metrics.followUpDays || 0, 3) : 0)
    : existing.metrics.followUpDays)

  const updated = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).findOneAndUpdate(
    { _id: new ObjectId(callTypeId) },
    {
      $set: {
        name: formData.name ?? existing.name,
        code: formData.code ? formData.code.toUpperCase() : existing.code,
        description: formData.description ?? existing.description,
        color: formData.color ?? existing.color,
        isActive: formData.isActive ?? existing.isActive,
        metrics: {
          targetClosingRate: formData.metrics?.targetClosingRate ?? existing.metrics.targetClosingRate,
          avgDuration: formData.metrics?.avgDuration ?? existing.metrics.avgDuration,
          followUpDays
        },
        criteria: formData.evaluationCriteria ?? existing.criteria,
        updatedAt: new Date()
      }
    },
    { returnDocument: 'after' }
  )

  revalidatePath('/dashboard/settings/call-types')

  return JSON.parse(JSON.stringify(updated ? addComputedFields(updated) : null))
}

export async function deleteCallType(callTypeId: string) {
  const currentUser = await getCurrentUser()
  ensureRole(currentUser, ALLOWED_ROLES)

  const { db } = await connectToDatabase()

  if (!ObjectId.isValid(callTypeId)) {
    throw new Error('Invalid call type id')
  }

  const result = await db.collection<CallType>(COLLECTIONS.CALL_TYPES).deleteOne({
    _id: new ObjectId(callTypeId),
    organizationId: currentUser.organizationId
  })

  if (result.deletedCount === 0) {
    throw new Error('Call type not found')
  }

  revalidatePath('/dashboard/settings/call-types')

  return { success: true }
}
