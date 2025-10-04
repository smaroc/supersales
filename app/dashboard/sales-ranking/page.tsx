import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Award,
  Medal,
  Crown,
  Star,
  Calendar,
  Phone,
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
      return <Crown className="h-6 w-6 text-yellow-600" />
    case 2:
      return <Medal className="h-6 w-6 text-gray-700" />
    case 3:
      return <Award className="h-6 w-6 text-orange-600" />
    default:
      return <Trophy className="h-6 w-6 text-gray-700" />
  }
}

function getRankBadgeColor(rank: number) {
  switch (rank) {
    case 1:
      return 'border border-yellow-300 bg-yellow-100 text-yellow-800'
    case 2:
      return 'border border-gray-300 bg-gray-100 text-gray-800'
    case 3:
      return 'border border-orange-300 bg-orange-100 text-orange-800'
    default:
      return 'border border-blue-300 bg-blue-100 text-blue-800'
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
    <div className="flex min-h-[400px] items-center justify-center text-gray-800">
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <DollarSign className="h-5 w-5 text-green-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">${totalRevenue.toLocaleString()}</div>
            <p className="mt-1 text-sm text-gray-800">
              <span className="text-green-600">+18%</span> vs last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Target className="h-5 w-5 text-blue-600" />
              Total Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">{totalDeals}</div>
            <p className="mt-1 text-sm text-gray-800">
              <span className="text-green-600">+12%</span> vs last quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Phone className="h-5 w-5 text-gray-800" />
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">{totalCalls}</div>
            <p className="mt-1 text-sm text-gray-800">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Star className="h-5 w-5 text-amber-600" />
              Avg Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">{avgConversion}%</div>
            <p className="mt-1 text-sm text-gray-800">
              <span className="text-green-600">+3.2%</span> vs last quarter
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-950">Sales Leaderboard</CardTitle>
          <CardDescription className="text-gray-800">Current quarter performance rankings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {salesRankings.length > 0 ? salesRankings.map((rep) => (
              <div key={rep._id} className="space-y-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {getRankIcon(rep.rank)}
                      <Badge className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${getRankBadgeColor(rep.rank)}`}>
                        #{rep.rank}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-900">
                        {rep.avatar}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{rep.name}</h3>
                        <p className="text-sm text-gray-800">{rep.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-medium">
                    {rep.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={rep.trend === 'up' ? 'text-green-700' : 'text-red-700'}>
                      {rep.trend === 'up' ? '+' : ''}{rep.trendValue}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-6 md:grid-cols-4">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-gray-700">Total Revenue</div>
                    <div className="text-2xl font-semibold text-gray-900">${rep.totalRevenue.toLocaleString()}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-gray-700">Deals Closed</div>
                    <div className="text-2xl font-semibold text-gray-900">{rep.dealsClosedQTD}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-gray-700">Conversion Rate</div>
                    <div className="text-2xl font-semibold text-gray-900">{rep.conversionRate}%</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-gray-700">Avg Deal Size</div>
                    <div className="text-2xl font-semibold text-gray-900">${rep.avgDealSize.toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-800">Goals Progress</p>
                    <div className="space-y-4">
                      {Object.entries(rep.goals).map(([key, goal]) => (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-700">
                            <span>{key}</span>
                            <span>{Math.round((goal.current / goal.target) * 100)}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className={`h-full rounded-full ${getProgressColor(goal.current, goal.target)}`}
                              style={{ width: `${getProgressWidth(goal.current, goal.target)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-600">
                            <span>{goal.current}</span>
                            <span>{goal.target}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Calls this month</span>
                      <span className="font-semibold text-gray-900">{rep.callsThisMonth}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Average call length</span>
                      <span className="font-semibold text-gray-900">{Math.round(rep.callsThisMonth / 1.5)} min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Last activity</span>
                      <span className="font-semibold text-gray-900">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-gray-700">No sales representatives available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-950">Top Performers</CardTitle>
            <CardDescription className="text-gray-800">This month&apos;s standout achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesRankings.length > 0 && (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <Crown className="h-7 w-7 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Highest Revenue</p>
                        <p className="text-xs text-gray-800">{salesRankings[0]?.name}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-yellow-700">
                      ${salesRankings[0]?.totalRevenue.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <Target className="h-7 w-7 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Best Conversion Rate</p>
                        <p className="text-xs text-gray-800">
                          {[...salesRankings].sort((a, b) => b.conversionRate - a.conversionRate)[0]?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-green-700">
                      {[...salesRankings].sort((a, b) => b.conversionRate - a.conversionRate)[0]?.conversionRate}%
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-7 w-7 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Most Improved</p>
                        <p className="text-xs text-gray-800">
                          {[...salesRankings].sort((a, b) => b.trendValue - a.trendValue)[0]?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-blue-700">
                      +{[...salesRankings].sort((a, b) => b.trendValue - a.trendValue)[0]?.trendValue}%
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-950">Team Insights</CardTitle>
            <CardDescription className="text-gray-800">Key performance metrics and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Average Performance Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Revenue per Rep</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${salesRankings.length > 0 ? Math.round(totalRevenue / salesRankings.length).toLocaleString() : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Deals per Rep</span>
                    <span className="text-sm font-medium text-gray-900">
                      {salesRankings.length > 0 ? (totalDeals / salesRankings.length).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Calls per Rep</span>
                    <span className="text-sm font-medium text-gray-900">
                      {salesRankings.length > 0 ? (totalCalls / salesRankings.length).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Avg Deal Size</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${salesRankings.length > 0 ?
                        Math.round(salesRankings.reduce((sum, rep) => sum + rep.avgDealSize, 0) / salesRankings.length).toLocaleString() :
                        '0'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Goal Achievement</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">On track for revenue goal</span>
                    <span className="text-sm font-medium text-green-700">
                      {salesRankings.filter(rep => (rep.goals.revenue.current / rep.goals.revenue.target) >= 0.9).length}/{salesRankings.length} reps
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Exceeding call targets</span>
                    <span className="text-sm font-medium text-blue-700">
                      {salesRankings.filter(rep => (rep.goals.calls.current / rep.goals.calls.target) >= 1.0).length}/{salesRankings.length} reps
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Meeting deal quotas</span>
                    <span className="text-sm font-medium text-amber-700">
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
          <h1 className="text-3xl font-bold text-gray-900">Sales Ranking</h1>
          <p className="text-gray-800">Track and compare team performance</p>
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
