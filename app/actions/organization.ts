'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { Organization, User, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ANALYSIS_PROMPT } from '@/lib/constants/analysis-prompts'

export async function createOrganization(data: {
  name: string
  domain: string
  industry: string
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
}) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    const organization: Omit<Organization, '_id'> = {
      name: data.name,
      domain: data.domain.toLowerCase(),
      industry: data.industry,
      size: data.size,
      userId: userId,
      subscription: {
        plan: 'free',
        status: 'trial'
      },
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        callRecording: true,
        autoAnalysis: true
      },
      callInsights: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<Organization>(COLLECTIONS.ORGANIZATIONS).insertOne(organization)
    const savedOrganization = await db.collection<Organization>(COLLECTIONS.ORGANIZATIONS)
      .findOne({ _id: result.insertedId })

    return JSON.parse(JSON.stringify(savedOrganization))
  } catch (error) {
    console.error('Error creating organization:', error)
    throw new Error('Failed to create organization')
  }
}

export async function getOrganization(organizationId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    // Get current user to check permissions
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      throw new Error('User not found')
    }

    let filter: any = { _id: new ObjectId(organizationId) }
    if (!currentUser.isAdmin) {
      // Regular users can only see their own organization data
      filter.userId = userId
    }

    const organization = await db.collection<Organization>(COLLECTIONS.ORGANIZATIONS)
      .findOne(filter)

    if (!organization) {
      throw new Error('Organization not found')
    }

    return JSON.parse(JSON.stringify(organization))
  } catch (error) {
    console.error('Error fetching organization:', error)
    throw new Error('Failed to fetch organization')
  }
}

export async function updateOrganizationSettings(organizationId: string, settings: {
  timezone?: string
  currency?: string
  dateFormat?: string
  callRecording?: boolean
  autoAnalysis?: boolean
}) {
  try {
    const { db } = await connectToDatabase()

    // Create update object with proper nested field updates
    const updateObject: any = { updatedAt: new Date() }
    Object.keys(settings).forEach(key => {
      if (settings[key as keyof typeof settings] !== undefined) {
        updateObject[`settings.${key}`] = settings[key as keyof typeof settings]
      }
    })

    const organization = await db.collection<Organization>(COLLECTIONS.ORGANIZATIONS)
      .findOneAndUpdate(
        { _id: new ObjectId(organizationId) },
        { $set: updateObject },
        { returnDocument: 'after' }
      )

    if (!organization) {
      throw new Error('Organization not found')
    }

    return JSON.parse(JSON.stringify(organization))
  } catch (error) {
    console.error('Error updating organization settings:', error)
    throw new Error('Failed to update organization settings')
  }
}

// Advanced organization management functions - simplified for now
export async function addCallInsight(organizationId: string, insight: any) {
  try {
    const { db } = await connectToDatabase()
    // Implementation simplified - call insights feature can be enhanced later
    console.log('addCallInsight called but not implemented with native MongoDB yet')
    throw new Error('Feature not yet implemented')
  } catch (error) {
    console.error('Error adding call insight:', error)
    throw new Error('Failed to add call insight')
  }
}

export async function updateCallInsight(organizationId: string, insightId: string, insight: any) {
  try {
    const { db } = await connectToDatabase()
    // Implementation simplified - call insights feature can be enhanced later
    console.log('updateCallInsight called but not implemented with native MongoDB yet')
    throw new Error('Feature not yet implemented')
  } catch (error) {
    console.error('Error updating call insight:', error)
    throw new Error('Failed to update call insight')
  }
}

export async function removeCallInsight(organizationId: string, insightId: string) {
  try {
    const { db } = await connectToDatabase()
    // Implementation simplified - call insights feature can be enhanced later
    console.log('removeCallInsight called but not implemented with native MongoDB yet')
    throw new Error('Feature not yet implemented')
  } catch (error) {
    console.error('Error removing call insight:', error)
    throw new Error('Failed to remove call insight')
  }
}

export async function getOrganizationUsers(organizationId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    // Get current user to check permissions
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      throw new Error('User not found')
    }

    let filter: any = { organizationId: new ObjectId(organizationId) }
    if (!currentUser.isAdmin) {
      // Regular users can only see themselves
      filter.clerkId = userId
    }

    const users = await db.collection<User>(COLLECTIONS.USERS)
      .find(filter)
      .project({ permissions: 0 }) // Exclude permissions field
      .toArray()

    return JSON.parse(JSON.stringify(users))
  } catch (error) {
    console.error('Error fetching organization users:', error)
    throw new Error('Failed to fetch organization users')
  }
}

/**
 * Get the analysis prompt for the user's organization
 * Returns custom prompt if set, otherwise returns default prompt
 */
export async function getAnalysisPrompt(): Promise<string> {
  try {
    const { userId } = await auth()
    if (!userId) {
      // Return default prompt if not authenticated
      return DEFAULT_ANALYSIS_PROMPT
    }

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return DEFAULT_ANALYSIS_PROMPT
    }

    // Get organization
    const organization = await db.collection<Organization>(COLLECTIONS.ORGANIZATIONS).findOne({
      _id: currentUser.organizationId
    })

    if (!organization) {
      return DEFAULT_ANALYSIS_PROMPT
    }

    // Return custom prompt if set, otherwise default
    return organization.settings?.analysisPrompt || DEFAULT_ANALYSIS_PROMPT
  } catch (error) {
    console.error('Error fetching analysis prompt:', error)
    return DEFAULT_ANALYSIS_PROMPT
  }
}

/**
 * Update the analysis prompt for the user's organization
 * Only super admins can update the prompt
 */
export async function updateAnalysisPrompt(prompt: string): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: 'Unauthorized' }
    }

    const { db } = await connectToDatabase()

    // Get current user and verify super admin status
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return { success: false, message: 'User not found' }
    }

    if (!currentUser.isSuperAdmin) {
      return { success: false, message: 'Only super admins can update the analysis prompt' }
    }

    // Update organization settings
    const result = await db.collection<Organization>(COLLECTIONS.ORGANIZATIONS).updateOne(
      { _id: currentUser.organizationId },
      {
        $set: {
          'settings.analysisPrompt': prompt,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return { success: false, message: 'Organization not found' }
    }

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return { success: true, message: 'Analysis prompt updated successfully' }
  } catch (error) {
    console.error('Error updating analysis prompt:', error)
    return { success: false, message: 'Failed to update analysis prompt' }
  }
}

/**
 * Reset the analysis prompt to default
 * Only super admins can reset the prompt
 */
export async function resetAnalysisPrompt(): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: 'Unauthorized' }
    }

    const { db } = await connectToDatabase()

    // Get current user and verify super admin status
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return { success: false, message: 'User not found' }
    }

    if (!currentUser.isSuperAdmin) {
      return { success: false, message: 'Only super admins can reset the analysis prompt' }
    }

    // Remove custom prompt from organization settings (will fall back to default)
    await db.collection<Organization>(COLLECTIONS.ORGANIZATIONS).updateOne(
      { _id: currentUser.organizationId },
      {
        $unset: {
          'settings.analysisPrompt': ''
        },
        $set: {
          updatedAt: new Date()
        }
      }
    )

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return { success: true, message: 'Analysis prompt reset to default successfully' }
  } catch (error) {
    console.error('Error resetting analysis prompt:', error)
    return { success: false, message: 'Failed to reset analysis prompt' }
  }
}