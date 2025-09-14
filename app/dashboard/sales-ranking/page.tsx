import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  User, 
  DollarSign,
  Target,
  Award,
  Medal,
  Crown,
  Star,
  Calendar,
  Phone,
  Clock,
  Loader2
} from 'lucide-react'
import { getSalesReps } from '@/app/actions/sales-reps'

interface Goals {
  revenue: { target: number; current: number }
  deals: { target: number; current: number }
  calls: { target: number; current: number }
}

interface SalesRanking {
  _id: string
  rank: number
  name: string
  role: string
  avatar: string
  totalRevenue: number
  dealsClosedQTD: number
  conversionRate: number
  avgDealSize: number
  callsThisMonth: number
  trend: 'up' | 'down'
  trendValue: number
  goals: Goals
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-6 w-6 text-yellow-500" />
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />
    case 3:
      return <Award className="h-6 w-6 text-orange-500" />
    default:
      return <Trophy className="h-6 w-6 text-gray-400" />
  }
}

function getRankBadgeColor(rank: number) {
  switch (rank) {
    case 1:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 2:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    case 3:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }
}

function getProgressWidth(current: number, target: number) {
  return Math.min((current / target) * 100, 100)
}

function getProgressColor(current: number, target: number) {
  const percentage = (current / target) * 100
  if (percentage >= 90) return 'bg-green-500'
  if (percentage >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Loading sales rankings...</span>
    </div>
  )
}

async function SalesRankingContent() {
  const salesRankings: SalesRanking[] = await getSalesReps('')
  
  // Calculate totals
  const totalRevenue = salesRankings.reduce((sum, rep) => sum + rep.totalRevenue, 0)
  const totalDeals = salesRankings.reduce((sum, rep) => sum + rep.dealsClosedQTD, 0)
  const totalCalls = salesRankings.reduce((sum, rep) => sum + rep.callsThisMonth, 0)
  const avgConversion = salesRankings.length > 0 ? 
    (salesRankings.reduce((sum, rep) => sum + rep.conversionRate, 0) / salesRankings.length).toFixed(1) : '0'

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              <span className="text-green-600">+18%</span> vs last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Total Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDeals}</div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              <span className="text-green-600">+12%</span> vs last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-purple-600" />
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCalls}</div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Avg Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgConversion}%</div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              <span className="text-green-600">+3.2%</span> vs last quarter
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Leaderboard</CardTitle>
          <CardDescription>Current quarter performance rankings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {salesRankings.length > 0 ? salesRankings.map((rep) => (
              <div key={rep._id} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {getRankIcon(rep.rank)}
                      <Badge className={getRankBadgeColor(rep.rank)}>
                        #{rep.rank}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-semibold text-primary">
                        {rep.avatar}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{rep.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{rep.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rep.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      rep.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {rep.trend === 'up' ? '+' : ''}{rep.trendValue}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold">${rep.totalRevenue.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Deals Closed</div>
                    <div className="text-2xl font-bold">{rep.dealsClosedQTD}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Conversion Rate</div>
                    <div className="text-2xl font-bold">{rep.conversionRate}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Avg Deal Size</div>
                    <div className="text-2xl font-bold">${rep.avgDealSize.toLocaleString()}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Revenue Goal</span>
                      <span>{Math.round((rep.goals.revenue.current / rep.goals.revenue.target) * 100)}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getProgressColor(rep.goals.revenue.current, rep.goals.revenue.target)}`}
                        style={{ width: `${getProgressWidth(rep.goals.revenue.current, rep.goals.revenue.target)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <span>${rep.goals.revenue.current.toLocaleString()}</span>
                      <span>${rep.goals.revenue.target.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Deals Goal</span>
                        <span>{Math.round((rep.goals.deals.current / rep.goals.deals.target) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${getProgressColor(rep.goals.deals.current, rep.goals.deals.target)}`}
                          style={{ width: `${getProgressWidth(rep.goals.deals.current, rep.goals.deals.target)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <span>{rep.goals.deals.current}</span>
                        <span>{rep.goals.deals.target}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Calls Goal</span>
                        <span>{Math.round((rep.goals.calls.current / rep.goals.calls.target) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${getProgressColor(rep.goals.calls.current, rep.goals.calls.target)}`}
                          style={{ width: `${getProgressWidth(rep.goals.calls.current, rep.goals.calls.target)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <span>{rep.goals.calls.current}</span>
                        <span>{rep.goals.calls.target}</span>
                      </div>
                    </div>
                  </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>This month's standout achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesRankings.length > 0 && (
                <>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Crown className="h-8 w-8 text-yellow-600" />
                      <div>
                        <p className="font-medium">Highest Revenue</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{salesRankings[0]?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-700 dark:text-yellow-300">
                        ${salesRankings[0]?.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium">Best Conversion Rate</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {[...salesRankings].sort((a, b) => b.conversionRate - a.conversionRate)[0]?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700 dark:text-green-300">
                        {[...salesRankings].sort((a, b) => b.conversionRate - a.conversionRate)[0]?.conversionRate}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">Most Improved</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {[...salesRankings].sort((a, b) => b.trendValue - a.trendValue)[0]?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-700 dark:text-blue-300">
                        +{[...salesRankings].sort((a, b) => b.trendValue - a.trendValue)[0]?.trendValue}%
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Insights</CardTitle>
            <CardDescription>Key performance metrics and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Average Performance Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue per Rep</span>
                    <span className="text-sm font-medium">
                      ${salesRankings.length > 0 ? Math.round(totalRevenue / salesRankings.length).toLocaleString() : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Deals per Rep</span>
                    <span className="text-sm font-medium">
                      {salesRankings.length > 0 ? (totalDeals / salesRankings.length).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Calls per Rep</span>
                    <span className="text-sm font-medium">
                      {salesRankings.length > 0 ? (totalCalls / salesRankings.length).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Deal Size</span>
                    <span className="text-sm font-medium">
                      ${salesRankings.length > 0 ? 
                        Math.round(salesRankings.reduce((sum, rep) => sum + rep.avgDealSize, 0) / salesRankings.length).toLocaleString() : 
                        '0'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Goal Achievement</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">On track for revenue goal</span>
                    <span className="text-sm font-medium text-green-600">
                      {salesRankings.filter(rep => (rep.goals.revenue.current / rep.goals.revenue.target) >= 0.9).length}/{salesRankings.length} reps
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Exceeding call targets</span>
                    <span className="text-sm font-medium text-blue-600">
                      {salesRankings.filter(rep => (rep.goals.calls.current / rep.goals.calls.target) >= 1.0).length}/{salesRankings.length} reps
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Meeting deal quotas</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {salesRankings.filter(rep => (rep.goals.deals.current / rep.goals.deals.target) >= 1.0).length}/{salesRankings.length} reps
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function SalesRankingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Ranking</h1>
          <p className="text-gray-600 dark:text-gray-300">Track and compare team performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            This Quarter
          </Button>
          <Button variant="outline">
            Export Report
          </Button>
        </div>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <SalesRankingContent />
      </Suspense>
    </div>
  )
}