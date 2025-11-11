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
  Eye
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
    r1Calls: number
    r2Calls: number
    r3Calls: number
    r1ClosingRate: number
    r2ClosingRate: number
    overallClosingRate: number
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
  averageClosingRate: number
  topPerformer: string
  callTypes: {
    R1: { count: number; closingRate: number }
    R2: { count: number; closingRate: number }
    R3: { count: number; closingRate: number }
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
  if (userData && userData.role !== 'head_of_sales' && userData.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
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
          return b.metrics.overallClosingRate - a.metrics.overallClosingRate
        case 'alphabetical':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Équipe commerciale</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground text-gray-800" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{teamMetrics.totalReps}</div>
              <p className="text-xs text-muted-foreground">
                commerciaux actifs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Appels totaux</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground text-gray-800" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{teamMetrics.totalCalls}</div>
              <p className="text-xs text-muted-foreground">
                dont {teamMetrics.totalPitches} pitchs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Taux de closing</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground text-gray-800" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{teamMetrics.averageClosingRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                moyenne de l'équipe
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-950">Top performer</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground text-gray-800" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{teamMetrics.topPerformer}</div>
              <p className="text-xs text-muted-foreground">
                meilleure performance
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Call Types Overview */}
      {teamMetrics && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-950">Répartition par type d'appel</CardTitle>
            <CardDescription className="text-gray-800">
              Performance par catégorie d'appel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              {Object.entries(teamMetrics.callTypes).map(([type, data]) => (
                <div key={type} className="text-center">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-lg font-semibold text-gray-900">{type}</h3>
                    <p className="text-2xl font-semibold text-blue-600">
                      {data.count}
                    </p>
                    <p className="text-sm text-gray-800">
                      {data.closingRate.toFixed(1)}% closing
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Reps Table */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance des commerciaux</CardTitle>
              <CardDescription>
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
                  <SelectItem value="calls">Nombre d'appels</SelectItem>
                  <SelectItem value="closingRate">Taux de closing</SelectItem>
                  <SelectItem value="alphabetical">Alphabétique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-700">
                  <th className="py-3 px-4 font-medium">Commercial</th>
                  <th className="py-3 px-4 font-medium">Appels</th>
                  <th className="py-3 px-4 font-medium">Pitchs</th>
                  <th className="py-3 px-4 font-medium">R1</th>
                  <th className="py-3 px-4 font-medium">R2</th>
                  <th className="py-3 px-4 font-medium">% Closing R1</th>
                  <th className="py-3 px-4 font-medium">% Closing R2</th>
                  <th className="py-3 px-4 font-medium">Score</th>
                  <th className="py-3 px-4 font-medium">Rang</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedReps.map((rep, index) => (
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
                          <p className="font-medium">{rep.firstName || 'Unknown'} {rep.lastName || 'User'}</p>
                          <div className="flex items-center space-x-1">
                            {rep.performance.trend === 'up' && (
                              <TrendingUp className="h-3 w-3 text-emerald-300" />
                            )}
                            {rep.performance.trend === 'down' && (
                              <TrendingUp className="h-3 w-3 rotate-180 text-rose-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{rep.metrics.totalCalls}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{rep.metrics.totalPitches}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-800">
                        {rep.metrics.r1Calls}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-800">
                        {rep.metrics.r2Calls}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={rep.metrics.r1ClosingRate >= 15 ? "default" : "secondary"}
                        className={rep.metrics.r1ClosingRate >= 15 ? "border border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-300 bg-gray-50 text-gray-800"}
                      >
                        {rep.metrics.r1ClosingRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={rep.metrics.r2ClosingRate >= 25 ? "default" : "secondary"}
                        className={rep.metrics.r2ClosingRate >= 25 ? "border border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-300 bg-gray-50 text-gray-800"}
                      >
                        {rep.metrics.r2ClosingRate.toFixed(1)}%
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
                        <span className="text-sm font-medium">{rep.performance.score}/100</span>
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
        </CardContent>
      </Card>
    </div>
  )
}
