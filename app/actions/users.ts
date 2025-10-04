'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

interface PaginatedUsersResponse {
  users: any[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface GetAllUsersParams {
  page?: number
  limit?: number
}

async function getAuthorizedUser() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { db } = await connectToDatabase()
  const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })

  if (!currentUser) {
    throw new Error('User not found')
  }

  return { db, currentUser }
}

export async function getAllUsers({ page = 1, limit = 10 }: GetAllUsersParams = {}): Promise<PaginatedUsersResponse> {
  const { db, currentUser } = await getAuthorizedUser()

  // Check if user has super admin permissions to view all users across organizations
  if (!currentUser.isSuperAdmin) {
    throw new Error('Insufficient permissions. Super admin access required.')
  }

  const skip = (page - 1) * limit

  try {
    // Get total count for pagination
    const total = await db.collection<User>(COLLECTIONS.USERS).countDocuments()

    // Get paginated users
    const users = await db.collection<User>(COLLECTIONS.USERS)
      .find(
        {},
        {
          projection: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1,
            isAdmin: 1,
            isSuperAdmin: 1,
            isActive: 1,
            hasCompletedSignup: 1,
            avatar: 1,
            organizationId: 1,
            createdAt: 1,
            lastLoginAt: 1
          }
        }
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalPages = Math.ceil(total / limit)

    const response: PaginatedUsersResponse = {
      users: JSON.parse(JSON.stringify(users)),
      total,
      page,
      limit,
      totalPages
    }

    return response
  } catch (error) {
    console.error('Error fetching all users:', error)
    throw new Error('Failed to fetch users')
  }
}

export async function getTeamMembers(): Promise<any[]> {
  const { db, currentUser } = await getAuthorizedUser()

  // Check if user has admin permissions to view team members
  if (!['admin', 'owner', 'head_of_sales'].includes(currentUser.role)) {
    throw new Error('Insufficient permissions. Admin access required.')
  }

  try {
    const teamMembers = await db.collection<User>(COLLECTIONS.USERS)
      .find(
        { organizationId: currentUser.organizationId },
        {
          projection: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1,
            isAdmin: 1,
            isActive: 1,
            hasCompletedSignup: 1,
            avatar: 1,
            createdAt: 1,
            lastLoginAt: 1
          }
        }
      )
      .sort({ createdAt: -1 })
      .toArray()

    return JSON.parse(JSON.stringify(teamMembers))
  } catch (error) {
    console.error('Error fetching team members:', error)
    throw new Error('Failed to fetch team members')
  }
}

export async function getCurrentUserProfile(): Promise<any> {
  const { db, currentUser } = await getAuthorizedUser()

  try {
    const userProfile = await db.collection<User>(COLLECTIONS.USERS)
      .findOne(
        { clerkId: currentUser.clerkId },
        {
          projection: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            role: 1,
            isAdmin: 1,
            isSuperAdmin: 1,
            isActive: 1,
            avatar: 1,
            organizationId: 1,
            permissions: 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      )

    if (!userProfile) {
      throw new Error('User profile not found')
    }

    return JSON.parse(JSON.stringify(userProfile))
  } catch (error) {
    console.error('Error fetching user profile:', error)
    throw new Error('Failed to fetch user profile')
  }
}

export async function updateUserProfile(updates: { firstName?: string; lastName?: string }): Promise<any> {
  const { db, currentUser } = await getAuthorizedUser()

  try {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    }

    const result = await db.collection<User>(COLLECTIONS.USERS).findOneAndUpdate(
      { clerkId: currentUser.clerkId },
      { $set: updateData },
      {
        returnDocument: 'after',
        projection: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          role: 1,
          isAdmin: 1,
          isSuperAdmin: 1,
          isActive: 1,
          avatar: 1,
          organizationId: 1,
          permissions: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    )

    if (!result) {
      throw new Error('Failed to update user profile')
    }

    return JSON.parse(JSON.stringify(result))
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw new Error('Failed to update user profile')
  }
}