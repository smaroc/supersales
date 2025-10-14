'use server'

import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { Organization, User, AnalysisConfiguration, COLLECTIONS } from '@/lib/types'
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
 * Get the active analysis configuration for the user's organization
 * Returns custom config if set, otherwise returns defaults
 */
export async function getAnalysisPrompt(): Promise<string | { prompt: string; model: string }> {
  try {
    const { userId } = await auth()
    if (!userId) {
      // Return default if not authenticated
      return { prompt: DEFAULT_ANALYSIS_PROMPT, model: 'gpt-4o' }
    }

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return { prompt: DEFAULT_ANALYSIS_PROMPT, model: 'gpt-4o' }
    }

    // Get active analysis configuration for the organization
    const config = await db.collection<AnalysisConfiguration>(COLLECTIONS.ANALYSIS_CONFIGURATIONS).findOne({
      organizationId: currentUser.organizationId,
      isActive: true
    })

    if (!config) {
      // No config found, return defaults
      return { prompt: DEFAULT_ANALYSIS_PROMPT, model: 'gpt-4o' }
    }

    // Return the active configuration
    return {
      prompt: config.prompt,
      model: config.model
    }
  } catch (error) {
    console.error('Error fetching analysis configuration:', error)
    return { prompt: DEFAULT_ANALYSIS_PROMPT, model: 'gpt-4o' }
  }
}

/**
 * Update the analysis configuration for the user's organization
 * Only super admins can update the configuration
 */
export async function updateAnalysisPrompt(prompt: string, model?: string): Promise<{ success: boolean; message: string }> {
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
      return { success: false, message: 'Only super admins can update the analysis configuration' }
    }

    // Get existing configuration
    const existingConfig = await db.collection<AnalysisConfiguration>(COLLECTIONS.ANALYSIS_CONFIGURATIONS).findOne({
      organizationId: currentUser.organizationId,
      isActive: true
    })

    if (existingConfig) {
      // Update existing configuration
      await db.collection<AnalysisConfiguration>(COLLECTIONS.ANALYSIS_CONFIGURATIONS).updateOne(
        { _id: existingConfig._id },
        {
          $set: {
            prompt,
            model: model || existingConfig.model,
            version: existingConfig.version + 1,
            updatedAt: new Date()
          }
        }
      )
    } else {
      // Create new configuration
      const newConfig: Omit<AnalysisConfiguration, '_id'> = {
        organizationId: currentUser.organizationId,
        prompt,
        model: model || 'gpt-4o',
        isActive: true,
        version: 1,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await db.collection<AnalysisConfiguration>(COLLECTIONS.ANALYSIS_CONFIGURATIONS).insertOne(newConfig)
    }

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return { success: true, message: 'AI configuration updated successfully' }
  } catch (error) {
    console.error('Error updating analysis configuration:', error)
    return { success: false, message: 'Failed to update AI configuration' }
  }
}

/**
 * Reset the analysis configuration to default
 * Only super admins can reset the configuration
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
      return { success: false, message: 'Only super admins can reset the AI configuration' }
    }

    // Delete all configurations for this organization (will fall back to defaults)
    await db.collection<AnalysisConfiguration>(COLLECTIONS.ANALYSIS_CONFIGURATIONS).deleteMany({
      organizationId: currentUser.organizationId
    })

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return { success: true, message: 'AI configuration reset to default successfully' }
  } catch (error) {
    console.error('Error resetting analysis configuration:', error)
    return { success: false, message: 'Failed to reset AI configuration' }
  }
}