'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import connectToDatabase from '@/lib/mongodb'
import { User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

const IMPERSONATION_COOKIE_NAME = 'impersonated_user_id'

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

export async function getAuthorizedUser() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { db } = await connectToDatabase()
  let dbUser = await (db.collection(COLLECTIONS.USERS) as any).findOne({ clerkId: userId })

  if (!dbUser) {
    // Fetch user data from Clerk
    const clerkUser = await currentUser()

    if (!clerkUser) {
      throw new Error('User not found in Clerk')
    }

    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress

    if (!primaryEmail) {
      throw new Error('No email address found for user')
    }

    // Check if user was invited (exists in DB with this email but no clerkId)
    const invitedUser = await (db.collection(COLLECTIONS.USERS) as any).findOne({
      email: primaryEmail.toLowerCase(),
      $or: [
        { clerkId: '' },
        { clerkId: { $exists: false } }
      ]
    })

    if (invitedUser) {
      // Update the invited user with Clerk ID
      console.log(`Linking invited user ${primaryEmail} to Clerk ID ${userId}`)

      await (db.collection(COLLECTIONS.USERS) as any).updateOne(
        { _id: invitedUser._id },
        {
          $set: {
            clerkId: userId,
            firstName: clerkUser.firstName || invitedUser.firstName,
            lastName: clerkUser.lastName || invitedUser.lastName,
            avatar: clerkUser.imageUrl || invitedUser.avatar,
            isActive: true,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
            hasCompletedSignup: true
          }
        }
      )

      dbUser = await (db.collection(COLLECTIONS.USERS) as any).findOne({ _id: invitedUser._id })

      console.log(`Successfully linked invited user ${primaryEmail} to Clerk ID ${userId}`)
    } else {
      // Create new user (not invited)
      console.log(`User ${userId} not found in database, creating from Clerk data`)

      const newUser: Omit<User, '_id'> = {
        clerkId: userId,
        email: primaryEmail.toLowerCase(),
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        role: 'sales_rep',
        isAdmin: false,
        isSuperAdmin: false,
        organizationId: new ObjectId(), // Default organization
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
        hasCompletedSignup: true,
        avatar: clerkUser.imageUrl || '',
        permissions: {
          canViewAllData: false,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: false,
          canDeleteData: false
        },
        preferences: {
          theme: 'system',
          notifications: {
            email: true,
            inApp: true,
            callSummaries: true,
            weeklyReports: true
          },
          dashboard: {
            defaultView: 'overview',
            refreshInterval: 30000
          }
        }
      }

      const result = await (db.collection(COLLECTIONS.USERS) as any).insertOne(newUser)
      dbUser = await (db.collection(COLLECTIONS.USERS) as any).findOne({ _id: result.insertedId })

      if (!dbUser) {
        throw new Error('Failed to create user')
      }

      console.log(`Created user ${userId} in database with data from Clerk`)
    }
  }

  if (!dbUser) {
    throw new Error('User not found')
  }

  // Check for impersonation (only if current user is SuperAdmin)
  const cookieStore = await cookies()
  const impersonatedUserId = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value

  if (impersonatedUserId && dbUser.isSuperAdmin && ObjectId.isValid(impersonatedUserId)) {
    const impersonatedUser = await (db.collection(COLLECTIONS.USERS) as any).findOne({
      _id: new ObjectId(impersonatedUserId)
    })

    if (impersonatedUser) {
      // Prevent impersonating another SuperAdmin
      if (!impersonatedUser.isSuperAdmin) {
        console.log(`SuperAdmin ${dbUser.email} impersonating user ${impersonatedUser.email}`)
        return { db, currentUser: impersonatedUser, actualUser: dbUser }
      }
    }
  }

  return { db, currentUser: dbUser }
}

export async function getAllUsersForSelector(): Promise<Array<{ _id: string; email: string; firstName: string; lastName: string }>> {
  const { db, currentUser, actualUser: returnedActualUser } = await getAuthorizedUser() as { db: any; currentUser: User; actualUser?: User }

  // Check if user has super admin permissions to view all users across organizations
  // Use actualUser if impersonating, otherwise use currentUser
  const actualUser = returnedActualUser || currentUser
  
  // Debug logging
  console.log('[getAllUsersForSelector] currentUser:', {
    email: currentUser.email,
    isSuperAdmin: currentUser.isSuperAdmin,
    isAdmin: currentUser.isAdmin,
    hasActualUser: !!returnedActualUser
  })
  console.log('[getAllUsersForSelector] actualUser:', {
    email: actualUser.email,
    isSuperAdmin: actualUser.isSuperAdmin,
    isAdmin: actualUser.isAdmin
  })
  
  if (!actualUser.isSuperAdmin) {
    console.error('[getAllUsersForSelector] Access denied:', {
      userEmail: actualUser.email,
      isSuperAdmin: actualUser.isSuperAdmin,
      isAdmin: actualUser.isAdmin
    })
    throw new Error('Insufficient permissions. Super admin access required.')
  }

  try {
    const users = await (db.collection(COLLECTIONS.USERS) as any)
      .find(
        { isSuperAdmin: false }, // Exclude other SuperAdmins
        {
          projection: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1
          }
        }
      )
      .sort({ email: 1 })
      .toArray()

    return JSON.parse(JSON.stringify(users.map((u: any) => ({
      _id: u._id?.toString() || '',
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName
    }))))
  } catch (error) {
    console.error('Error fetching users for selector:', error)
    throw new Error('Failed to fetch users')
  }
}

export async function getAllUsers({ page = 1, limit = 10 }: GetAllUsersParams = {}): Promise<PaginatedUsersResponse> {
  const { db, currentUser, actualUser: returnedActualUser } = await getAuthorizedUser() as { db: any; currentUser: User; actualUser?: User }

  // Check if user has super admin permissions to view all users across organizations
  // Use actualUser if impersonating, otherwise use currentUser
  const actualUser = returnedActualUser || currentUser
  if (!actualUser.isSuperAdmin) {
    throw new Error('Insufficient permissions. Super admin access required.')
  }

  const skip = (page - 1) * limit

  try {
    // Get total count for pagination
    const total = await (db.collection(COLLECTIONS.USERS) as any).countDocuments()

    // Get paginated users
    const users = await (db.collection(COLLECTIONS.USERS) as any)
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
    const teamMembers = await (db.collection(COLLECTIONS.USERS) as any)
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
    const userProfile = await (db.collection(COLLECTIONS.USERS) as any)
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

    const result = await (db.collection(COLLECTIONS.USERS) as any).findOneAndUpdate(
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

export async function deleteUser(userId: string, fromAllUsersTable: boolean = false): Promise<{ success: boolean; message: string }> {
  try {
    const { db, currentUser } = await getAuthorizedUser()

    // If deleting from "All Users" table, only super admins can do this
    if (fromAllUsersTable && !currentUser.isSuperAdmin) {
      throw new Error('Insufficient permissions. Super admin access required.')
    }

    // For team members deletion, regular admins can delete
    if (!fromAllUsersTable && !currentUser.isAdmin && !currentUser.isSuperAdmin) {
      throw new Error('Insufficient permissions. Admin access required.')
    }

    // Validate userId format
    if (!ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID format')
    }

    // Super admins can delete users from any organization
    // Regular admins can only delete users from their organization
    const query: any = { _id: new ObjectId(userId) }
    if (!currentUser.isSuperAdmin) {
      query.organizationId = currentUser.organizationId
    }

    const userToDelete = await (db.collection(COLLECTIONS.USERS) as any).findOne(query)

    if (!userToDelete) {
      throw new Error('User not found')
    }

    // Prevent users from deleting themselves
    if (userToDelete._id?.toString() === currentUser._id?.toString()) {
      throw new Error('You cannot delete yourself')
    }

    // Prevent admins from deleting super admins
    if (userToDelete.isSuperAdmin && !currentUser.isSuperAdmin) {
      throw new Error('Only super admins can delete super admin accounts')
    }

    // Permanent delete - remove user from database
    const deleteResult = await (db.collection(COLLECTIONS.USERS) as any).deleteOne({
      _id: new ObjectId(userId)
    })

    if (deleteResult.deletedCount === 0) {
      throw new Error('Failed to delete user')
    }

    console.log(`User ${userToDelete.email} permanently deleted by ${currentUser.email}`)

    return {
      success: true,
      message: 'User permanently deleted from database'
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}