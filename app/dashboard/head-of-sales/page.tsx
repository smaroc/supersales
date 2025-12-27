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

  // Check if user has head_of_sales role
  if (userData && userData.role !== 'head_of_sales' && userData.role !== 'admin' && !userData.isAdmin && !userData.isSuperAdmin) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Accès refusé
          </h2>
          <p className="text-gray-700 mt-2">
            Cette page est réservée aux Head of Sales
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
          <div className="mb-4 h-8 w-64 rounded bg-gray-200"></div>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded bg-gray-200"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Head of Sales
          </h1>
          <p className="text-gray-700 mt-1">
            Performance de l&apos;équipe de vente et analytics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-40 border-gray-300 bg-white hover:bg-gray-50">
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
            <Button variant="outline" size="sm" className="border-gray-300 px-4 text-gray-800 hover:bg-gray-50">
              <Eye className="h-4 w-4 mr-2" />
              Détail des appels
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="border-gray-300 px-4 text-gray-800 hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {teamMetrics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Équipe</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{teamMetrics.totalReps}</div>
              <p className="text-xs text-gray-600">commerciaux actifs</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Appels</CardTitle>
              <Phone className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{teamMetrics.totalCalls}</div>
              <p className="text-xs text-gray-600">appels analysés</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Pitches</CardTitle>
              <Presentation className="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{teamMetrics.totalPitches}</div>
              <p className="text-xs text-gray-600">pitches effectués</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Ventes</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{teamMetrics.totalSales}</div>
              <p className="text-xs text-gray-600">{teamMetrics.averageClosingRate}% closing</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Show-up</CardTitle>
              <UserCheck className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{teamMetrics.showUpRate}%</div>
              <p className="text-xs text-gray-600">{teamMetrics.noShowCount} no-shows</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Top performer</CardTitle>
              <Award className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-gray-800 truncate">{teamMetrics.topPerformer}</div>
              <p className="text-xs text-gray-600">meilleur score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Call Types Overview */}
      {teamMetrics && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-950">Répartition par type d&apos;appel</CardTitle>
            <CardDescription className="text-gray-800">
              Performance par catégorie d&apos;appel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <h3 className="text-lg font-semibold text-gray-900">Ventes</h3>
                  <p className="text-2xl font-semibold text-green-600">
                    {teamMetrics.callTypes.sales.count}
                  </p>
                  <p className="text-sm text-gray-800">
                    {teamMetrics.callTypes.sales.closingRate}% closing
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <h3 className="text-lg font-semibold text-gray-900">Découverte</h3>
                  <p className="text-2xl font-semibold text-blue-600">
                    {teamMetrics.callTypes.discovery.count}
                  </p>
                  <p className="text-sm text-gray-800">appels</p>
                </div>
              </div>
              <div className="text-center">
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                  <h3 className="text-lg font-semibold text-gray-900">Démo</h3>
                  <p className="text-2xl font-semibold text-purple-600">
                    {teamMetrics.callTypes.demo.count}
                  </p>
                  <p className="text-sm text-gray-800">appels</p>
                </div>
              </div>
              <div className="text-center">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-lg font-semibold text-gray-900">Suivi</h3>
                  <p className="text-2xl font-semibold text-amber-600">
                    {teamMetrics.callTypes['follow-up'].count}
                  </p>
                  <p className="text-sm text-gray-800">appels</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Reps Table */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-950">Performance des commerciaux</CardTitle>
              <CardDescription className="text-gray-800">
                Détail individuel des performances
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-600" />
                <Input
                  placeholder="Rechercher un commercial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 border-gray-300 bg-white pl-10 text-gray-900 placeholder:text-gray-600"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 border-gray-300 bg-white hover:bg-gray-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun commercial trouvé</h3>
              <p className="text-gray-600">
                Aucune donnée disponible pour cette période.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-700">
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
                      className="border-b border-gray-100 transition hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                            {rep.firstName?.[0] || 'N'}{rep.lastName?.[0] || 'N'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{rep.firstName || 'Unknown'} {rep.lastName || 'User'}</p>
                            <div className="flex items-center space-x-1">
                              {rep.performance.trend === 'up' && (
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                              )}
                              {rep.performance.trend === 'down' && (
                                <TrendingUp className="h-3 w-3 rotate-180 text-rose-500" />
                              )}
                              {rep.performance.trend === 'stable' && (
                                <span className="text-xs text-gray-500">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{rep.metrics.totalCalls}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{rep.metrics.totalPitches}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                          {rep.metrics.totalSales}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={rep.metrics.closingRate >= 20 ? "default" : "secondary"}
                          className={rep.metrics.closingRate >= 20 ? "border border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-300 bg-gray-50 text-gray-800"}
                        >
                          {rep.metrics.closingRate}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={rep.metrics.showUpRate >= 80 ? "default" : "secondary"}
                          className={rep.metrics.showUpRate >= 80 ? "border border-teal-300 bg-teal-50 text-teal-700" : "border-orange-300 bg-orange-50 text-orange-700"}
                        >
                          {rep.metrics.showUpRate}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-12 rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${rep.performance.score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{rep.performance.score}/100</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={rep.performance.rank <= 3 ? "default" : "secondary"}
                          className={
                            rep.performance.rank === 1 ? "border border-amber-300 bg-amber-50 text-amber-700" :
                            rep.performance.rank <= 3 ? "border border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 bg-gray-50 text-gray-800"
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
