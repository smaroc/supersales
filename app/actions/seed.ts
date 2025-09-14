'use server'

import dbConnect from '@/lib/mongodb'
import CallAnalysis from '@/models/CallAnalysis'
import SalesRepresentative from '@/models/SalesRepresentative'
import DashboardMetrics from '@/models/DashboardMetrics'
import { revalidatePath } from 'next/cache'

const sampleCallAnalyses = [
  {
    client: 'Johnson Corp',
    representative: 'Sarah Johnson',
    duration: '45 min',
    date: new Date('2024-01-15'),
    sentiment: 'positive',
    score: 92,
    topics: ['Pricing', 'Implementation', 'Timeline'],
    outcome: 'Follow-up scheduled',
    keyMoments: [
      { time: '5:23', type: 'objection', text: 'Concerns about implementation timeline' },
      { time: '12:45', type: 'positive', text: 'Expressed interest in premium features' },
      { time: '28:12', type: 'decision', text: 'Requested detailed proposal' }
    ]
  },
  {
    client: 'TechStart Inc',
    representative: 'Mike Chen',
    duration: '32 min',
    date: new Date('2024-01-14'),
    sentiment: 'neutral',
    score: 78,
    topics: ['Budget', 'Features', 'Competition'],
    outcome: 'Proposal sent',
    keyMoments: [
      { time: '8:15', type: 'question', text: 'Asked about competitor comparison' },
      { time: '18:30', type: 'positive', text: 'Liked our unique features' },
      { time: '25:45', type: 'concern', text: 'Budget constraints mentioned' }
    ]
  },
  {
    client: 'Global Solutions',
    representative: 'Lisa Rodriguez',
    duration: '28 min',
    date: new Date('2024-01-13'),
    sentiment: 'negative',
    score: 54,
    topics: ['Pricing', 'Support', 'Contract'],
    outcome: 'No follow-up',
    keyMoments: [
      { time: '3:12', type: 'objection', text: 'Price too high for their budget' },
      { time: '15:20', type: 'negative', text: 'Unsatisfied with support response time' },
      { time: '22:30', type: 'end', text: 'Decided to continue with current solution' }
    ]
  }
]

const sampleSalesReps = [
  {
    name: 'Sarah Johnson',
    role: 'Senior Sales Rep',
    avatar: 'SJ',
    totalRevenue: 45231,
    dealsClosedQTD: 23,
    conversionRate: 34.5,
    avgDealSize: 1966,
    callsThisMonth: 67,
    trend: 'up',
    trendValue: 12.3,
    goals: {
      revenue: { target: 50000, current: 45231 },
      deals: { target: 25, current: 23 },
      calls: { target: 70, current: 67 }
    }
  },
  {
    name: 'Mike Chen',
    role: 'Sales Rep',
    avatar: 'MC',
    totalRevenue: 38920,
    dealsClosedQTD: 18,
    conversionRate: 28.9,
    avgDealSize: 2162,
    callsThisMonth: 52,
    trend: 'up',
    trendValue: 8.7,
    goals: {
      revenue: { target: 40000, current: 38920 },
      deals: { target: 20, current: 18 },
      calls: { target: 60, current: 52 }
    }
  },
  {
    name: 'Lisa Rodriguez',
    role: 'Junior Sales Rep',
    avatar: 'LR',
    totalRevenue: 29540,
    dealsClosedQTD: 15,
    conversionRate: 25.8,
    avgDealSize: 1969,
    callsThisMonth: 48,
    trend: 'up',
    trendValue: 15.2,
    goals: {
      revenue: { target: 30000, current: 29540 },
      deals: { target: 15, current: 15 },
      calls: { target: 50, current: 48 }
    }
  },
  {
    name: 'David Kim',
    role: 'Sales Rep',
    avatar: 'DK',
    totalRevenue: 24680,
    dealsClosedQTD: 12,
    conversionRate: 22.4,
    avgDealSize: 2057,
    callsThisMonth: 41,
    trend: 'down',
    trendValue: -3.1,
    goals: {
      revenue: { target: 35000, current: 24680 },
      deals: { target: 18, current: 12 },
      calls: { target: 55, current: 41 }
    }
  },
  {
    name: 'Emily Zhang',
    role: 'Junior Sales Rep',
    avatar: 'EZ',
    totalRevenue: 21340,
    dealsClosedQTD: 11,
    conversionRate: 26.7,
    avgDealSize: 1940,
    callsThisMonth: 44,
    trend: 'up',
    trendValue: 6.8,
    goals: {
      revenue: { target: 25000, current: 21340 },
      deals: { target: 12, current: 11 },
      calls: { target: 45, current: 44 }
    }
  }
]

const sampleDashboardMetrics = {
  totalCalls: 1234,
  conversionRate: 23.5,
  totalRevenue: 45231,
  teamPerformance: 85,
  period: 'monthly',
  date: new Date()
}

export async function seedDatabase() {
  try {
    await dbConnect()
    
    // Clear existing data
    await CallAnalysis.deleteMany({})
    await SalesRepresentative.deleteMany({})
    await DashboardMetrics.deleteMany({})
    
    // Insert sample data
    await CallAnalysis.insertMany(sampleCallAnalyses)
    await SalesRepresentative.insertMany(sampleSalesReps)
    await DashboardMetrics.create(sampleDashboardMetrics)
    
    // Revalidate all pages that display this data
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/call-analysis')
    revalidatePath('/dashboard/sales-ranking')
    
    return {
      success: true,
      message: 'Database seeded successfully',
      data: {
        callAnalyses: sampleCallAnalyses.length,
        salesReps: sampleSalesReps.length,
        dashboardMetrics: 1
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error)
    throw new Error('Failed to seed database')
  }
}