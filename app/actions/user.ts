'use server'

import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

export async function createUser(data: {
  organizationId: string
  email: string
  firstName: string
  lastName: string
  role: 'owner' | 'admin' | 'manager' | 'sales_rep' | 'viewer'
  avatar?: string
}) {
  try {
    await dbConnect()
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() })
    if (existingUser) {
      throw new Error('User with this email already exists')
    }
    
    const user = new User({
      organizationId: data.organizationId,
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      avatar: data.avatar,
      isActive: true,
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
          refreshInterval: 300
        }
      }
    })
    
    await user.save()
    return JSON.parse(JSON.stringify(user))
  } catch (error) {
    console.error('Error creating user:', error)
    if (error instanceof Error) {
      throw new Error(error.message)
    }
    throw new Error('Failed to create user')
  }
}

export async function getUser(userId: string) {
  try {
    await dbConnect()
    const user = await User.findById(userId).populate('organizationId').lean()
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return JSON.parse(JSON.stringify(user))
  } catch (error) {
    console.error('Error fetching user:', error)
    throw new Error('Failed to fetch user')
  }
}

export async function getUserByEmail(email: string) {
  try {
    await dbConnect()
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('organizationId')
      .lean()
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return JSON.parse(JSON.stringify(user))
  } catch (error) {
    console.error('Error fetching user by email:', error)
    throw new Error('Failed to fetch user')
  }
}

export async function updateUser(userId: string, data: {
  firstName?: string
  lastName?: string
  avatar?: string
  role?: 'owner' | 'admin' | 'manager' | 'sales_rep' | 'viewer'
  isActive?: boolean
}) {
  try {
    await dbConnect()
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true }
    ).lean()
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return JSON.parse(JSON.stringify(user))
  } catch (error) {
    console.error('Error updating user:', error)
    throw new Error('Failed to update user')
  }
}

export async function updateUserPreferences(userId: string, preferences: {
  theme?: 'light' | 'dark' | 'system'
  notifications?: {
    email?: boolean
    inApp?: boolean
    callSummaries?: boolean
    weeklyReports?: boolean
  }
  dashboard?: {
    defaultView?: 'overview' | 'calls' | 'ranking' | 'analytics'
    refreshInterval?: number
  }
}) {
  try {
    await dbConnect()
    
    const updateFields: any = {}
    
    if (preferences.theme) {
      updateFields['preferences.theme'] = preferences.theme
    }
    
    if (preferences.notifications) {
      Object.keys(preferences.notifications).forEach(key => {
        updateFields[`preferences.notifications.${key}`] = preferences.notifications![key as keyof typeof preferences.notifications]
      })
    }
    
    if (preferences.dashboard) {
      Object.keys(preferences.dashboard).forEach(key => {
        updateFields[`preferences.dashboard.${key}`] = preferences.dashboard![key as keyof typeof preferences.dashboard]
      })
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).lean()
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return JSON.parse(JSON.stringify(user))
  } catch (error) {
    console.error('Error updating user preferences:', error)
    throw new Error('Failed to update user preferences')
  }
}

export async function updateLastLogin(userId: string) {
  try {
    await dbConnect()
    
    await User.findByIdAndUpdate(userId, {
      $set: { lastLoginAt: new Date() }
    })
    
    return true
  } catch (error) {
    console.error('Error updating last login:', error)
    throw new Error('Failed to update last login')
  }
}

export async function deactivateUser(userId: string) {
  try {
    await dbConnect()
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    ).lean()
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return JSON.parse(JSON.stringify(user))
  } catch (error) {
    console.error('Error deactivating user:', error)
    throw new Error('Failed to deactivate user')
  }
}