'use server'

import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'

const IMPERSONATION_COOKIE_NAME = 'impersonated_user_id'

export interface ImpersonationState {
  impersonatedUserId: string | null
  impersonatedUser: {
    _id: string
    email: string
    firstName: string
    lastName: string
    organizationId: string
  } | null
}

export async function getImpersonationState(): Promise<ImpersonationState> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

    if (!currentUser) {
      throw new Error('User not found')
    }

    // Only SuperAdmin can impersonate
    if (!currentUser.isSuperAdmin) {
      return { impersonatedUserId: null, impersonatedUser: null }
    }

    const cookieStore = await cookies()
    const impersonatedUserId = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value

    if (!impersonatedUserId) {
      return { impersonatedUserId: null, impersonatedUser: null }
    }

    // Fetch the impersonated user
    const impersonatedUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(impersonatedUserId)
    })

    if (!impersonatedUser) {
      // Clear invalid cookie
      cookieStore.delete(IMPERSONATION_COOKIE_NAME)
      return { impersonatedUserId: null, impersonatedUser: null }
    }

    return {
      impersonatedUserId: impersonatedUserId,
      impersonatedUser: {
        _id: impersonatedUser._id?.toString() || '',
        email: impersonatedUser.email,
        firstName: impersonatedUser.firstName,
        lastName: impersonatedUser.lastName,
        organizationId: impersonatedUser.organizationId?.toString() || ''
      }
    }
  } catch (error) {
    console.error('Error fetching impersonation state:', error)
    return { impersonatedUserId: null, impersonatedUser: null }
  }
}

export async function setImpersonation(impersonatedUserId: string | null): Promise<{
  success: boolean
  message: string
  impersonatedUser?: {
    _id: string
    email: string
    firstName: string
    lastName: string
  }
  error?: string
}> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' }
    }

    const { db } = await connectToDatabase()
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

    if (!currentUser) {
      return { success: false, message: 'User not found', error: 'User not found' }
    }

    // Only SuperAdmin can impersonate
    if (!currentUser.isSuperAdmin) {
      return { success: false, message: 'Insufficient permissions', error: 'Insufficient permissions' }
    }

    const cookieStore = await cookies()

    if (!impersonatedUserId || impersonatedUserId === '') {
      // Clear impersonation
      cookieStore.delete(IMPERSONATION_COOKIE_NAME)
      revalidatePath('/', 'layout')
      return { success: true, message: 'Impersonation cleared' }
    }

    // Validate the user exists
    if (!ObjectId.isValid(impersonatedUserId)) {
      return { success: false, message: 'Invalid user ID', error: 'Invalid user ID' }
    }

    const targetUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(impersonatedUserId)
    })

    if (!targetUser) {
      return { success: false, message: 'User not found', error: 'User not found' }
    }

    // Prevent impersonating another SuperAdmin
    if (targetUser.isSuperAdmin && targetUser._id?.toString() !== currentUser._id?.toString()) {
      return {
        success: false,
        message: 'Cannot impersonate another SuperAdmin',
        error: 'Cannot impersonate another SuperAdmin'
      }
    }

    // Set impersonation cookie (expires in 24 hours)
    cookieStore.set(IMPERSONATION_COOKIE_NAME, impersonatedUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    revalidatePath('/', 'layout')

    return {
      success: true,
      message: 'Impersonation set',
      impersonatedUser: {
        _id: targetUser._id?.toString() || '',
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName
      }
    }
  } catch (error) {
    console.error('Error setting impersonation:', error)
    return {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function clearImpersonation(): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

    if (!currentUser) {
      throw new Error('User not found')
    }

    // Only SuperAdmin can clear impersonation
    if (!currentUser.isSuperAdmin) {
      throw new Error('Insufficient permissions')
    }

    const cookieStore = await cookies()
    cookieStore.delete(IMPERSONATION_COOKIE_NAME)
    revalidatePath('/', 'layout')

    return { success: true, message: 'Impersonation cleared' }
  } catch (error) {
    console.error('Error clearing impersonation:', error)
    throw error
  }
}

