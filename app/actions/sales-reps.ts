'use server'

import dbConnect from '@/lib/mongodb'
import SalesRepresentative from '@/models/SalesRepresentative'
import { revalidatePath } from 'next/cache'

export async function getSalesReps(organizationId: string) {
  try {
    // Return empty array if no organizationId is provided
    if (!organizationId || organizationId.trim() === '') {
      return []
    }

    await dbConnect()
    const salesReps = await SalesRepresentative.find({ organizationId })
      .sort({ totalRevenue: -1 })
      .lean()

    // Add ranking based on sorted order and convert to serializable format
    const rankedReps = salesReps.map((rep, index) => ({
      ...rep,
      rank: index + 1
    }))

    return JSON.parse(JSON.stringify(rankedReps))
  } catch (error) {
    console.error('Error fetching sales representatives:', error)
    return []
  }
}

export async function createSalesRep(data: {
  organizationId: string
  name: string
  role: string
  avatar: string
  totalRevenue?: number
  dealsClosedQTD?: number
  conversionRate?: number
  avgDealSize?: number
  callsThisMonth?: number
  trend?: 'up' | 'down'
  trendValue?: number
  goals: {
    revenue: { target: number; current: number }
    deals: { target: number; current: number }
    calls: { target: number; current: number }
  }
}) {
  try {
    await dbConnect()
    const salesRep = new SalesRepresentative(data)
    const savedRep = await salesRep.save()
    
    // Revalidate the pages that display this data
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/sales-ranking')
    
    return JSON.parse(JSON.stringify(savedRep))
  } catch (error) {
    console.error('Error creating sales representative:', error)
    throw new Error('Failed to create sales representative')
  }
}

export async function getTopPerformers(organizationId: string, limit: number = 3) {
  try {
    await dbConnect()
    const topReps = await SalesRepresentative.find({ organizationId })
      .sort({ totalRevenue: -1 })
      .limit(limit)
      .lean()
    
    // Add ranking
    const rankedReps = topReps.map((rep, index) => ({
      ...rep,
      rank: index + 1
    }))
    
    return JSON.parse(JSON.stringify(rankedReps))
  } catch (error) {
    console.error('Error fetching top performers:', error)
    throw new Error('Failed to fetch top performers')
  }
}

export async function updateSalesRepMetrics(id: string, updates: {
  totalRevenue?: number
  dealsClosedQTD?: number
  conversionRate?: number
  avgDealSize?: number
  callsThisMonth?: number
  goals?: {
    revenue?: { target?: number; current?: number }
    deals?: { target?: number; current?: number }
    calls?: { target?: number; current?: number }
  }
}) {
  try {
    await dbConnect()
    const updatedRep = await SalesRepresentative.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean()
    
    if (!updatedRep) {
      throw new Error('Sales representative not found')
    }
    
    // Revalidate the pages that display this data
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/sales-ranking')
    
    return JSON.parse(JSON.stringify(updatedRep))
  } catch (error) {
    console.error('Error updating sales representative:', error)
    throw new Error('Failed to update sales representative')
  }
}