'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Users, TrendingUp, Phone, Award, ArrowUpRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getDashboardMetrics } from '@/app/actions/dashboard-metrics'
import { getRecentCallAnalyses } from '@/app/actions/call-analysis'
import { getTopPerformers } from '@/app/actions/sales-reps'
import { useSession } from 'next-auth/react'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Loading...</span>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<{
    metrics: any
    recentCalls: any[]
    topPerformers: any[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.user?.organizationId) return

      try {
        setLoading(true)
        setError(null)

        const [metrics, recentCalls, topPerformers] = await Promise.all([
          getDashboardMetrics(session.user.organizationId),
          getRecentCallAnalyses(session.user.organizationId, 3),
          getTopPerformers(session.user.organizationId, 3)
        ])

        setDashboardData({
          metrics,
          recentCalls,
          topPerformers
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [session?.user?.organizationId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Welcome back! Here's your sales overview.</p>
          </div>
        </div>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Welcome back! Here's your sales overview.</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  const { metrics, recentCalls, topPerformers } = dashboardData || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Welcome back, {session?.user?.name?.split(' ')[0]}! Here's your sales overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalCalls?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversionRate?.toFixed(1) || '0'}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.totalRevenue?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+18%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.teamPerformance || '0'}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Call Analysis</CardTitle>
                <CardDescription>AI-powered insights from your recent calls</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/call-analysis">
                  View All <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCalls && recentCalls.length > 0 ? recentCalls.map((call: any) => (
                <div key={call._id} className={`flex items-center justify-between p-4 rounded-lg ${
                  call.sentiment === 'positive' ? 'bg-green-50 dark:bg-green-900/20' :
                  call.sentiment === 'negative' ? 'bg-red-50 dark:bg-red-900/20' :
                  'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <div>
                    <p className={`font-medium ${
                      call.sentiment === 'positive' ? 'text-green-800 dark:text-green-300' :
                      call.sentiment === 'negative' ? 'text-red-800 dark:text-red-300' :
                      'text-blue-800 dark:text-blue-300'
                    }`}>
                      {call.sentiment === 'positive' ? 'Positive' : 
                       call.sentiment === 'negative' ? 'Negative' : 'Neutral'} Sentiment
                    </p>
                    <p className={`text-sm ${
                      call.sentiment === 'positive' ? 'text-green-600 dark:text-green-400' :
                      call.sentiment === 'negative' ? 'text-red-600 dark:text-red-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      Call with {call.client}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      call.sentiment === 'positive' ? 'text-green-800 dark:text-green-300' :
                      call.sentiment === 'negative' ? 'text-red-800 dark:text-red-300' :
                      'text-blue-800 dark:text-blue-300'
                    }`}>
                      {call.score}%
                    </p>
                    <p className={`text-xs ${
                      call.sentiment === 'positive' ? 'text-green-600 dark:text-green-400' :
                      call.sentiment === 'negative' ? 'text-red-600 dark:text-red-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      Score
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No recent call analyses available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sales Ranking</CardTitle>
                <CardDescription>Top performers this month</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/sales-ranking">
                  View All <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers && topPerformers.length > 0 ? topPerformers.map((rep: any, index: number) => (
                <div key={rep._id} className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                  index === 1 ? 'bg-gray-50 dark:bg-gray-800' :
                  'bg-orange-50 dark:bg-orange-900/20'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`text-white rounded-full w-8 h-8 flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-500' :
                      'bg-orange-500'
                    }`}>
                      {rep.rank}
                    </div>
                    <div>
                      <p className="font-medium">{rep.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rep.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      index === 0 ? 'text-yellow-700 dark:text-yellow-300' :
                      index === 2 ? 'text-orange-700 dark:text-orange-300' : ''
                    }`}>
                      ${rep.totalRevenue?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{rep.dealsClosedQTD || 0} deals</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No sales representatives available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your sales team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20">
              <Award className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="font-medium">Sarah Johnson closed a $5,000 deal</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Johnson Corp - Enterprise package</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium">Mike Chen completed call analysis</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">TechStart Inc - 45 min call, positive sentiment</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">4 hours ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <p className="font-medium">Lisa Rodriguez improved conversion rate</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">From 18% to 25% this week</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}