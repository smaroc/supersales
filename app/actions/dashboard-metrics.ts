'use server'

import dbConnect from '@/lib/mongodb'
import DashboardMetrics from '@/models/DashboardMetrics'
import { revalidatePath } from 'next/cache'

export async function getDashboardMetrics(organizationId: string, period: string = 'monthly') {
  try {
    await dbConnect()
    const metrics = await DashboardMetrics.findOne({ organizationId, period })
      .sort({ createdAt: -1 })
      .lean()
    
    if (!metrics) {
      // Return default metrics if none found
      return {
        organizationId,
        totalCalls: 0,
        conversionRate: 0,
        totalRevenue: 0,
        teamPerformance: 0,
        period,
        date: new Date()
      }
    }
    
    return JSON.parse(JSON.stringify(metrics))
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    throw new Error('Failed to fetch dashboard metrics')
  }
}

export async function createDashboardMetrics(data: {
  organizationId: string
  totalCalls: number
  conversionRate: number
  totalRevenue: number
  teamPerformance: number
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  date?: Date
}) {
  try {
    await dbConnect()
    const metrics = new DashboardMetrics({
      ...data,
      date: data.date || new Date()
    })
    const savedMetrics = await metrics.save()
    
    // Revalidate the pages that display this data
    revalidatePath('/dashboard')
    
    return JSON.parse(JSON.stringify(savedMetrics))
  } catch (error) {
    console.error('Error creating dashboard metrics:', error)
    throw new Error('Failed to create dashboard metrics')
  }
}

export async function updateDashboardMetrics(
  organizationId: string,
  period: string = 'monthly',
  updates: {
    totalCalls?: number
    conversionRate?: number
    totalRevenue?: number
    teamPerformance?: number
  }
) {
  try {
    await dbConnect()
    const updatedMetrics = await DashboardMetrics.findOneAndUpdate(
      { organizationId, period },
      { $set: { ...updates, date: new Date() } },
      { new: true, upsert: true }
    ).lean()
    
    // Revalidate the pages that display this data
    revalidatePath('/dashboard')
    
    return JSON.parse(JSON.stringify(updatedMetrics))
  } catch (error) {
    console.error('Error updating dashboard metrics:', error)
    throw new Error('Failed to update dashboard metrics')
  }
}