'use server'

import dbConnect from '@/lib/mongodb'
import Organization from '@/models/Organization'
import User from '@/models/User'

export async function createOrganization(data: {
  name: string
  domain: string
  industry: string
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
}) {
  try {
    await dbConnect()
    
    const organization = new Organization({
      name: data.name,
      domain: data.domain.toLowerCase(),
      industry: data.industry,
      size: data.size,
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
      callInsights: []
    })
    
    await organization.save()
    return JSON.parse(JSON.stringify(organization))
  } catch (error) {
    console.error('Error creating organization:', error)
    throw new Error('Failed to create organization')
  }
}

export async function getOrganization(organizationId: string) {
  try {
    await dbConnect()
    const organization = await Organization.findById(organizationId).lean()
    
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
    await dbConnect()
    
    const organization = await Organization.findByIdAndUpdate(
      organizationId,
      { $set: { settings } },
      { new: true }
    ).lean()
    
    if (!organization) {
      throw new Error('Organization not found')
    }
    
    return JSON.parse(JSON.stringify(organization))
  } catch (error) {
    console.error('Error updating organization settings:', error)
    throw new Error('Failed to update organization settings')
  }
}

export async function addCallInsight(organizationId: string, insight: {
  name: string
  description: string
  keywords: string[]
  weightage: number
  category: 'positive' | 'negative' | 'neutral' | 'objection' | 'opportunity'
}) {
  try {
    await dbConnect()
    
    const organization = await Organization.findByIdAndUpdate(
      organizationId,
      { $push: { callInsights: insight } },
      { new: true }
    ).lean()
    
    if (!organization) {
      throw new Error('Organization not found')
    }
    
    return JSON.parse(JSON.stringify(organization))
  } catch (error) {
    console.error('Error adding call insight:', error)
    throw new Error('Failed to add call insight')
  }
}

export async function updateCallInsight(organizationId: string, insightId: string, insight: {
  name?: string
  description?: string
  keywords?: string[]
  weightage?: number
  category?: 'positive' | 'negative' | 'neutral' | 'objection' | 'opportunity'
}) {
  try {
    await dbConnect()
    
    const updateFields: any = {}
    Object.keys(insight).forEach(key => {
      updateFields[`callInsights.$.${key}`] = insight[key as keyof typeof insight]
    })
    
    const organization = await Organization.findOneAndUpdate(
      { _id: organizationId, 'callInsights._id': insightId },
      { $set: updateFields },
      { new: true }
    ).lean()
    
    if (!organization) {
      throw new Error('Organization or insight not found')
    }
    
    return JSON.parse(JSON.stringify(organization))
  } catch (error) {
    console.error('Error updating call insight:', error)
    throw new Error('Failed to update call insight')
  }
}

export async function removeCallInsight(organizationId: string, insightId: string) {
  try {
    await dbConnect()
    
    const organization = await Organization.findByIdAndUpdate(
      organizationId,
      { $pull: { callInsights: { _id: insightId } } },
      { new: true }
    ).lean()
    
    if (!organization) {
      throw new Error('Organization not found')
    }
    
    return JSON.parse(JSON.stringify(organization))
  } catch (error) {
    console.error('Error removing call insight:', error)
    throw new Error('Failed to remove call insight')
  }
}

export async function getOrganizationUsers(organizationId: string) {
  try {
    await dbConnect()
    
    const users = await User.find({ organizationId })
      .select('-permissions')
      .lean()
    
    return JSON.parse(JSON.stringify(users))
  } catch (error) {
    console.error('Error fetching organization users:', error)
    throw new Error('Failed to fetch organization users')
  }
}