'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users,
  Phone,
  TrendingUp,
  Target,
  Award,
  Search,
  Download,
  Eye,
  UserCheck,
  DollarSign,
  Presentation
} from 'lucide-react'
import Link from 'next/link'
import { getHeadOfSalesReps, getHeadOfSalesTeamMetrics } from '@/app/actions/head-of-sales'
import { useImpersonationRefresh } from '@/lib/hooks/use-impersonation-refresh'

interface SalesRep {
  id: string
  firstName?: string
  lastName?: string
  avatar?: string
  metrics: {
    totalCalls: number
    totalPitches: number
    totalSales: number
    noShowCount: number
    showUpRate: number
    closingRate: number
    averageScore: number
    thisMonthCalls: number
    thisMonthClosings: number
  }
  performance: {
    trend: 'up' | 'down' | 'stable'
    score: number
    rank: number
  }
}

interface TeamMetrics {
  totalReps: number
  totalCalls: number
  totalPitches: number
  totalSales: number
  averageClosingRate: number
  noShowCount: number
  showUpRate: number
  topPerformer: string
  callTypes: {
    sales: { count: number; closingRate: number }
    discovery: { count: number }
    demo: { count: number }
    'follow-up': { count: number }
  }
}

type TimeRange = 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'thisYear'

export default function HeadOfSalesPage() {
  const { user, isLoaded } = useUser()
  const [userData, setUserData] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('performance')
  const [timeRange, setTimeRange] = useState<TimeRange>('thisMonth')
  const [salesReps, setSalesReps] = useState<SalesRep[]>([])
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return

      try {
        const response = await fetch(`/api/users/by-clerk-id/${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setUserData(data)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    if (isLoaded && user) {
      fetchUserData()
    }
  }, [user, isLoaded])

  const fetchHeadOfSalesData = useCallback(async () => {
    try {
      setLoading(true)
      const [repsData, metricsData] = await Promise.all([
        getHeadOfSalesReps(timeRange),
        getHeadOfSalesTeamMetrics(timeRange),
      ])
      setSalesReps(repsData)
      setTeamMetrics(metricsData)
    } catch (error) {
      console.error('Error fetching head of sales data:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    if (user) {
      fetchHeadOfSalesData()
    }
  }, [user, fetchHeadOfSalesData])

  // Refresh data when impersonation changes
  useImpersonationRefresh(fetchHeadOfSalesData)

  // Check if user has head_of_sales or manager role
  const hasAccess = userData?.role === 'head_of_sales' ||
    userData?.role === 'manager' ||
    userData?.role === 'admin' ||
    userData?.isAdmin ||
    userData?.isSuperAdmin

  if (userData && !hasAccess) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Accès refusé
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            Cette page est réservée aux Head of Sales et Managers
          </p>
        </div>
      </div>
    )
  }

  const filteredAndSortedReps = salesReps
    .filter(rep =>
      `${rep.firstName || ''} ${rep.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.performance.score - a.performance.score
        case 'calls':
          return b.metrics.totalCalls - a.metrics.totalCalls
        case 'closingRate':
          return b.metrics.closingRate - a.metrics.closingRate
        case 'alphabetical':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-64 rounded bg-gray-200 dark:bg-zinc-700"></div>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded bg-gray-200 dark:bg-zinc-700"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Head of Sales
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mt-1">
            Performance de l&apos;équipe de vente et analytics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-40 border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisWeek">Cette semaine</SelectItem>
              <SelectItem value="thisMonth">Ce mois</SelectItem>
              <SelectItem value="thisQuarter">Ce trimestre</SelectItem>
              <SelectItem value="thisYear">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/dashboard/head-of-sales/calls">
            <Button variant="outline" size="sm" className="border-gray-300 dark:border-zinc-600 px-4 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800">
              <Eye className="h-4 w-4 mr-2" />
              Détail des appels
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="border-gray-300 dark:border-zinc-600 px-4 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {teamMetrics && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950 dark:text-white">Équipe</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{teamMetrics.totalReps}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">commerciaux actifs</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950 dark:text-white">Appels</CardTitle>
              <Phone className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{teamMetrics.totalCalls}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">appels analysés</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950 dark:text-white">Pitches</CardTitle>
              <Presentation className="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{teamMetrics.totalPitches}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">pitches effectués</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950 dark:text-white">Ventes</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{teamMetrics.totalSales}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{teamMetrics.averageClosingRate}% closing</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950 dark:text-white">Show-up</CardTitle>
              <UserCheck className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{teamMetrics.showUpRate}%</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{teamMetrics.noShowCount} no-shows</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950 dark:text-white">Top performer</CardTitle>
              <Award className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate">{teamMetrics.topPerformer}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">meilleur score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Call Types Overview */}
      {teamMetrics && (
        <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-950 dark:text-white">Répartition par type d&apos;appel</CardTitle>
            <CardDescription className="text-gray-800 dark:text-gray-300">
              Performance par catégorie d&apos;appel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ventes</h3>
                  <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                    {teamMetrics.callTypes.sales.count}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-300">
                    {teamMetrics.callTypes.sales.closingRate}% closing
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Découverte</h3>
                  <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                    {teamMetrics.callTypes.discovery.count}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-300">appels</p>
                </div>
              </div>
              <div className="text-center">
                <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Démo</h3>
                  <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                    {teamMetrics.callTypes.demo.count}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-300">appels</p>
                </div>
              </div>
              <div className="text-center">
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Suivi</h3>
                  <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                    {teamMetrics.callTypes['follow-up'].count}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-300">appels</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Reps Table */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-gray-950 dark:text-white">Performance des commerciaux</CardTitle>
              <CardDescription className="text-gray-800 dark:text-gray-300">
                Détail individuel des performances
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-600 dark:text-gray-400" />
                <Input
                  placeholder="Rechercher un commercial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 pl-10 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48 border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700">
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="calls">Nombre d&apos;appels</SelectItem>
                  <SelectItem value="closingRate">Taux de closing</SelectItem>
                  <SelectItem value="alphabetical">Alphabétique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedReps.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucun commercial trouvé</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Aucune donnée disponible pour cette période.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-700 text-left text-xs uppercase tracking-wide text-gray-700 dark:text-gray-300">
                    <th className="py-3 px-4 font-medium">Commercial</th>
                    <th className="py-3 px-4 font-medium">Appels</th>
                    <th className="py-3 px-4 font-medium">Pitches</th>
                    <th className="py-3 px-4 font-medium">Ventes</th>
                    <th className="py-3 px-4 font-medium">Closing</th>
                    <th className="py-3 px-4 font-medium">Show-up</th>
                    <th className="py-3 px-4 font-medium">Score</th>
                    <th className="py-3 px-4 font-medium">Rang</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedReps.map((rep) => (
                    <tr
                      key={rep.id}
                      className="border-b border-gray-100 dark:border-zinc-800 transition hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/head-of-sales/${rep.id}`} className="group">
                          <div className="flex items-center space-x-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 group-hover:border-blue-200 dark:group-hover:border-blue-700 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              {rep.firstName?.[0] || 'N'}{rep.lastName?.[0] || 'N'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{rep.firstName || 'Unknown'} {rep.lastName || 'User'}</p>
                              <div className="flex items-center space-x-1">
                                {rep.performance.trend === 'up' && (
                                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                                )}
                                {rep.performance.trend === 'down' && (
                                  <TrendingUp className="h-3 w-3 rotate-180 text-rose-500" />
                                )}
                                {rep.performance.trend === 'stable' && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900 dark:text-white">{rep.metrics.totalCalls}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900 dark:text-white">{rep.metrics.totalPitches}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                          {rep.metrics.totalSales}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={rep.metrics.closingRate >= 20 ? "default" : "secondary"}
                          className={rep.metrics.closingRate >= 20 ? "border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-gray-200"}
                        >
                          {rep.metrics.closingRate}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={rep.metrics.showUpRate >= 80 ? "default" : "secondary"}
                          className={rep.metrics.showUpRate >= 80 ? "border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300" : "border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300"}
                        >
                          {rep.metrics.showUpRate}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-12 rounded-full bg-gray-200 dark:bg-zinc-700">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${rep.performance.score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{rep.performance.score}/100</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={rep.performance.rank <= 3 ? "default" : "secondary"}
                          className={
                            rep.performance.rank === 1 ? "border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300" :
                            rep.performance.rank <= 3 ? "border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300" : "border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-gray-200"
                          }
                        >
                          #{rep.performance.rank}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
