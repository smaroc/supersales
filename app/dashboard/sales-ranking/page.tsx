'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Loader2,
  CheckCircle2,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
import { getSalesRanking } from '@/app/actions/sales-reps'

interface SalesRanking {
  _id: string
  rank: number
  name: string
  role: string
  avatar: string
  totalRevenue: number
  dealsClosedQTD: number
  overallClosingRate: number
  totalObjections: number
  objectionsResolved: number
  objectionsHandlingRate: number
  totalCalls: number
  thisMonthCalls: number
  thisMonthClosings: number
  trend: 'up' | 'down'
  trendValue: number
}

type SortField = 'rank' | 'name' | 'totalRevenue' | 'overallClosingRate' | 'objectionsHandlingRate' | 'trendValue'
type SortOrder = 'asc' | 'desc' | null

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-4 w-4 text-yellow-600" />
    case 2:
      return <Medal className="h-4 w-4 text-gray-500" />
    case 3:
      return <Award className="h-4 w-4 text-orange-600" />
    default:
      return <Trophy className="h-4 w-4 text-gray-400" />
  }
}

function LoadingSpinner() {
  return (
    <div className="p-6 flex min-h-[400px] items-center justify-center text-gray-800">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Chargement du classement...</span>
    </div>
  )
}

function SalesRankingContent() {
  const [salesRankings, setSalesRankings] = useState<SalesRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [trendFilter, setTrendFilter] = useState<'all' | 'up' | 'down'>('all')
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSalesRanking()
        setSalesRankings(data)
      } catch (error) {
        console.error('Error fetching sales ranking:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, trendFilter])

  if (loading) {
    return <LoadingSpinner />
  }

  // Calculate totals
  const totalRevenue = salesRankings.reduce((sum, rep) => sum + rep.totalRevenue, 0)
  const totalDeals = salesRankings.reduce((sum, rep) => sum + rep.dealsClosedQTD, 0)
  const totalCalls = salesRankings.reduce((sum, rep) => sum + rep.totalCalls, 0)
  const avgClosingRate = salesRankings.length > 0 ?
    (salesRankings.reduce((sum, rep) => sum + rep.overallClosingRate, 0) / salesRankings.length).toFixed(1) : '0'
  const totalObjections = salesRankings.reduce((sum, rep) => sum + rep.totalObjections, 0)
  const totalObjectionsResolved = salesRankings.reduce((sum, rep) => sum + rep.objectionsResolved, 0)

  // Filter data
  let filteredData = salesRankings.filter((rep) => {
    const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTrend = trendFilter === 'all' || rep.trend === trendFilter
    return matchesSearch && matchesTrend
  })

  // Sort data
  if (sortOrder) {
    filteredData = [...filteredData].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'rank':
          comparison = a.rank - b.rank
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'totalRevenue':
          comparison = a.totalRevenue - b.totalRevenue
          break
        case 'overallClosingRate':
          comparison = a.overallClosingRate - b.overallClosingRate
          break
        case 'objectionsHandlingRate':
          comparison = a.objectionsHandlingRate - b.objectionsHandlingRate
          break
        case 'trendValue':
          comparison = a.trendValue - b.trendValue
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else if (sortOrder === 'desc') {
        setSortOrder(null)
      } else {
        setSortOrder('asc')
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 -ml-3 hover:bg-gray-100 text-xs h-8 font-medium"
    >
      {children}
      {sortField === field && sortOrder === 'desc' && <ArrowDown className="h-3 w-3" />}
      {sortField === field && sortOrder === 'asc' && <ArrowUp className="h-3 w-3" />}
      {(sortField !== field || !sortOrder) && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
    </Button>
  )

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs font-medium text-gray-700">CA Total</p>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} €</div>
            <p className="text-xs text-gray-600 mt-1">{totalDeals} ventes conclues</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xs font-medium text-gray-700">Appels totaux</p>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalCalls}</div>
            <p className="text-xs text-gray-600 mt-1">Tous les commerciaux</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <Star className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-xs font-medium text-gray-700">Taux closing moyen</p>
            </div>
            <div className="text-2xl font-bold text-gray-900">{avgClosingRate}%</div>
            <p className="text-xs text-gray-600 mt-1">Performance globale</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-xs font-medium text-gray-700">Objections traitées</p>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalObjectionsResolved}/{totalObjections}</div>
            <p className="text-xs text-gray-600 mt-1">
              {totalObjections > 0 ? Math.round((totalObjectionsResolved / totalObjections) * 100) : 0}% de réussite
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-gray-950">Classement des Commerciaux</CardTitle>
          <CardDescription className="text-gray-600">
            {filteredData.length} commercial{filteredData.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4">
            <div className="flex flex-1 items-center space-x-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Rechercher par nom ou rôle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-gray-950 pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-500"
                />
              </div>
              <Select value={trendFilter} onValueChange={(value: 'all' | 'up' | 'down') => setTrendFilter(value)}>
                <SelectTrigger className="w-[160px] border-gray-300 text-gray-900">
                  <Filter className="mr-2 h-4 w-4 text-gray-500" />
                  <SelectValue placeholder="Tendance" />
                </SelectTrigger>
                <SelectContent className="text-gray-900">
                  <SelectItem value="all">Toutes tendances</SelectItem>
                  <SelectItem value="up">En hausse</SelectItem>
                  <SelectItem value="down">En baisse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>

          {/* Table */}
          {filteredData.length > 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gray-50">
                    <TableHead className="w-20">
                      <SortButton field="rank">Rang</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton field="name">Commercial</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="totalRevenue">CA Total</SortButton>
                    </TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">
                      <SortButton field="overallClosingRate">Closing</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="objectionsHandlingRate">Objections</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="trendValue">Tendance</SortButton>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((rep) => (
                    <TableRow key={rep._id} className="hover:bg-gray-50 border-b border-gray-100">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRankIcon(rep.rank)}
                          <span className="font-medium text-gray-900">#{rep.rank}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 text-xs font-semibold shrink-0">
                            {rep.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">{rep.name}</div>
                            <div className="text-xs text-gray-500 truncate">{rep.totalCalls} appels · {rep.role}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold text-gray-900 text-sm">{rep.totalRevenue.toLocaleString()} €</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm text-gray-900">{rep.dealsClosedQTD}</div>
                        <div className="text-xs text-gray-500">ce mois: {rep.thisMonthClosings}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`${
                            rep.overallClosingRate >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
                            rep.overallClosingRate >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          } text-xs px-2 py-0.5`}
                        >
                          {rep.overallClosingRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`${
                            rep.objectionsHandlingRate >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
                            rep.objectionsHandlingRate >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          } text-xs px-2 py-0.5`}
                        >
                          {rep.objectionsHandlingRate}%
                        </Badge>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {rep.objectionsResolved}/{rep.totalObjections}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`${
                            rep.trend === 'up' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                          } text-xs px-2 py-0.5`}
                        >
                          {rep.trend === 'up' ? (
                            <TrendingUp className="h-3 w-3 inline mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 inline mr-1" />
                          )}
                          {rep.trendValue}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">Aucun commercial disponible</p>
              <p className="text-sm text-gray-600 mt-1">Les données apparaîtront dès que des appels seront enregistrés</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} sur {totalPages} • {filteredData.length} résultat{filteredData.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Lignes:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}>
                      <SelectTrigger className="w-16 border-gray-300 text-gray-950 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-gray-950">
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="text-gray-700 h-8"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="text-gray-700 h-8"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default function SalesRankingPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classement des Ventes</h1>
        <p className="text-sm text-gray-600 mt-1">Suivez et comparez les performances de l&apos;équipe</p>
      </div>

      <SalesRankingContent />
    </div>
  )
}
