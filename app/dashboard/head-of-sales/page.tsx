'use client'

import { useState, useEffect } from 'react'
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
  ChevronRight,
  Search,
  Filter,
  Download,
  Calendar,
  BarChart3,
  Eye
} from 'lucide-react'
import Link from 'next/link'

interface SalesRep {
  id: string
  firstName: string
  lastName: string
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

export default function HeadOfSalesPage() {
  const { user, isLoaded } = useUser()
  const [userData, setUserData] = useState<any>(null)
  const [salesReps, setSalesReps] = useState<SalesRep[]>([])
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('performance')
  const [timeRange, setTimeRange] = useState('thisMonth')

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

  // Check if user has head_of_sales role
  if (userData && userData.role !== 'head_of_sales' && userData.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Accès refusé
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Cette page est réservée aux Head of Sales
          </p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchSalesData()
  }, [timeRange])

  const fetchSalesData = async () => {
    setLoading(true)
    try {
      const [repsResponse, metricsResponse] = await Promise.all([
        fetch(`/api/sales-reps?timeRange=${timeRange}`),
        fetch(`/api/team-metrics?timeRange=${timeRange}`)
      ])

      if (repsResponse.ok && metricsResponse.ok) {
        const repsData = await repsResponse.json()
        const metricsData = await metricsResponse.json()
        setSalesReps(repsData)
        setTeamMetrics(metricsData)
      }
    } catch (error) {
      console.error('Error fetching sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedReps = salesReps
    .filter(rep => 
      `${rep.firstName} ${rep.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
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
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard Head of Sales
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Performance de l'équipe de vente et analytics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
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
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Détail des appels
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {teamMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Équipe commerciale</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMetrics.totalReps}</div>
              <p className="text-xs text-muted-foreground">
                commerciaux actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Appels totaux</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMetrics.totalCalls}</div>
              <p className="text-xs text-muted-foreground">
                dont {teamMetrics.totalPitches} pitchs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de closing</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMetrics.averageClosingRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                moyenne de l'équipe
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top performer</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMetrics.topPerformer}</div>
              <p className="text-xs text-muted-foreground">
                meilleure performance
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Call Types Overview */}
      {teamMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Répartition par type d'appel</CardTitle>
            <CardDescription>
              Performance par catégorie d'appel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              {Object.entries(teamMetrics.callTypes).map(([type, data]) => (
                <div key={type} className="text-center">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold">{type}</h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data.count}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
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
      <Card>
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher un commercial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
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
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Commercial</th>
                  <th className="text-left py-3 px-4">Appels</th>
                  <th className="text-left py-3 px-4">Pitchs</th>
                  <th className="text-left py-3 px-4">R1</th>
                  <th className="text-left py-3 px-4">R2</th>
                  <th className="text-left py-3 px-4">% Closing R1</th>
                  <th className="text-left py-3 px-4">% Closing R2</th>
                  <th className="text-left py-3 px-4">Score</th>
                  <th className="text-left py-3 px-4">Rang</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedReps.map((rep, index) => (
                  <tr 
                    key={rep.id} 
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {rep.firstName[0]}{rep.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">{rep.firstName} {rep.lastName}</p>
                          <div className="flex items-center space-x-1">
                            {rep.performance.trend === 'up' && (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            )}
                            {rep.performance.trend === 'down' && (
                              <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
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
                      <Badge variant="outline">{rep.metrics.r1Calls}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{rep.metrics.r2Calls}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={rep.metrics.r1ClosingRate >= 15 ? "default" : "secondary"}
                        className={rep.metrics.r1ClosingRate >= 15 ? "bg-green-100 text-green-800" : ""}
                      >
                        {rep.metrics.r1ClosingRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={rep.metrics.r2ClosingRate >= 25 ? "default" : "secondary"}
                        className={rep.metrics.r2ClosingRate >= 25 ? "bg-green-100 text-green-800" : ""}
                      >
                        {rep.metrics.r2ClosingRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
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
                          rep.performance.rank === 1 ? "bg-yellow-100 text-yellow-800" :
                          rep.performance.rank <= 3 ? "bg-blue-100 text-blue-800" : ""
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