'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Loader2,
  CheckCircle2
} from 'lucide-react'
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  User,
  Chip,
} from "@heroui/react"
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

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-600" />
    case 2:
      return <Medal className="h-5 w-5 text-gray-700" />
    case 3:
      return <Award className="h-5 w-5 text-orange-600" />
    default:
      return <Trophy className="h-5 w-5 text-gray-700" />
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

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <DollarSign className="h-5 w-5 text-green-600" />
              Chiffre d&apos;affaires total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">{totalRevenue.toLocaleString()} €</div>
            <p className="mt-1 text-sm text-gray-800">
              {totalDeals} ventes conclues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Target className="h-5 w-5 text-blue-600" />
              Appels totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">{totalCalls}</div>
            <p className="mt-1 text-sm text-gray-800">
              Tous les commerciaux
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Star className="h-5 w-5 text-amber-600" />
              Taux de closing moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">{avgClosingRate}%</div>
            <p className="mt-1 text-sm text-gray-800">
              Performance globale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              Objections traitées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">
              {totalObjectionsResolved}/{totalObjections}
            </div>
            <p className="mt-1 text-sm text-gray-800">
              {totalObjections > 0 ? Math.round((totalObjectionsResolved / totalObjections) * 100) : 0}% de réussite
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-950">Classement des Commerciaux</CardTitle>
          <CardDescription className="text-gray-800">Performance détaillée par commercial</CardDescription>
        </CardHeader>
        <CardContent>
          {salesRankings.length > 0 ? (
            <Table aria-label="Sales ranking table">
              <TableHeader>
                <TableColumn>RANG</TableColumn>
                <TableColumn>COMMERCIAL</TableColumn>
                <TableColumn align="end">CA TOTAL</TableColumn>
                <TableColumn align="end">VENTES</TableColumn>
                <TableColumn align="end">TAUX CLOSING</TableColumn>
                <TableColumn align="end">OBJECTIONS</TableColumn>
                <TableColumn align="end">TAUX TRAITEMENT</TableColumn>
                <TableColumn align="end">TENDANCE</TableColumn>
              </TableHeader>
              <TableBody items={salesRankings}>
                {(rep) => (
                  <TableRow key={rep._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRankIcon(rep.rank)}
                        <Chip 
                          size="sm" 
                          variant="flat"
                          className={getRankBadgeColor(rep.rank)}
                        >
                          #{rep.rank}
                        </Chip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <User className="text-gray-900"
                        name={rep.name}
                        description={`${rep.totalCalls} appels · ${rep.role}`}
                        avatarProps={{
                          name: rep.avatar,
                          classNames: {
                            base: "bg-gradient-to-br from-blue-500 text-gray-900 to-purple-600",
                            name: "text-white font-bold text-sm"
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{rep.totalRevenue.toLocaleString()} €</div>
                        <div className="text-xs text-gray-500">{rep.dealsClosedQTD} deals</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="text-base font-semibold text-gray-900">{rep.dealsClosedQTD}</div>
                        <div className="text-xs text-gray-500">ce mois: {rep.thisMonthClosings}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <Chip
                          size="lg"
                          variant="flat"
                          color={rep.overallClosingRate >= 70 ? "success" : rep.overallClosingRate >= 50 ? "warning" : "danger"}
                        >
                          {rep.overallClosingRate}%
                        </Chip>
                        <div className="text-xs text-gray-500 mt-1">
                          {rep.dealsClosedQTD}/{rep.totalCalls}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {rep.objectionsResolved}/{rep.totalObjections}
                        </div>
                        <div className="text-xs text-gray-500">rencontrées</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <Chip
                          size="lg"
                          variant="flat"
                          color={rep.objectionsHandlingRate >= 70 ? "success" : rep.objectionsHandlingRate >= 50 ? "warning" : "danger"}
                        >
                          {rep.objectionsHandlingRate}%
                        </Chip>
                        <div className="text-xs text-gray-500 mt-1">
                          {rep.totalObjections > 0 ? 'réussies' : 'aucune'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={rep.trend === 'up' ? 'success' : 'danger'}
                          startContent={rep.trend === 'up' ? 
                            <TrendingUp className="h-3.5 w-3.5" /> : 
                            <TrendingDown className="h-3.5 w-3.5" />
                          }
                        >
                          {rep.trend === 'up' ? '↗' : '↘'} {rep.trendValue}%
                        </Chip>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">Aucun commercial disponible</p>
              <p className="text-sm text-gray-600 mt-1">Les données apparaîtront dès que des appels seront enregistrés</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-950">Meilleurs Performances</CardTitle>
            <CardDescription className="text-gray-800">Les champions de l&apos;équipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesRankings.length > 0 && (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-4">
                    <div className="flex items-center gap-3">
                      <Crown className="h-7 w-7 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Meilleur CA</p>
                        <p className="text-xs text-gray-800">{salesRankings[0]?.name}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-yellow-700">
                      {salesRankings[0]?.totalRevenue.toLocaleString()} €
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <Target className="h-7 w-7 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Meilleur Taux de Closing</p>
                        <p className="text-xs text-gray-800">
                          {[...salesRankings].sort((a, b) => b.overallClosingRate - a.overallClosingRate)[0]?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-green-700">
                      {[...salesRankings].sort((a, b) => b.overallClosingRate - a.overallClosingRate)[0]?.overallClosingRate}%
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-violet-50 p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-7 w-7 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Meilleur Traitement d&apos;Objections</p>
                        <p className="text-xs text-gray-800">
                          {[...salesRankings].sort((a, b) => b.objectionsHandlingRate - a.objectionsHandlingRate)[0]?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-purple-700">
                      {[...salesRankings].sort((a, b) => b.objectionsHandlingRate - a.objectionsHandlingRate)[0]?.objectionsHandlingRate}%
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-950">Statistiques d&apos;Équipe</CardTitle>
            <CardDescription className="text-gray-800">Métriques moyennes de performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Moyennes par Commercial</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">CA par commercial</span>
                    <span className="text-sm font-medium text-gray-900">
                      {salesRankings.length > 0 ? Math.round(totalRevenue / salesRankings.length).toLocaleString() : '0'} €
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Ventes par commercial</span>
                    <span className="text-sm font-medium text-gray-900">
                      {salesRankings.length > 0 ? (totalDeals / salesRankings.length).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Appels par commercial</span>
                    <span className="text-sm font-medium text-gray-900">
                      {salesRankings.length > 0 ? (totalCalls / salesRankings.length).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Objections par commercial</span>
                    <span className="text-sm font-medium text-gray-900">
                      {salesRankings.length > 0 ? (totalObjections / salesRankings.length).toFixed(1) : '0'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Performance Globale</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Commerciaux avec +70% closing</span>
                    <span className="text-sm font-medium text-green-700">
                      {salesRankings.filter(rep => rep.overallClosingRate >= 70).length}/{salesRankings.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Commerciaux avec +70% objections</span>
                    <span className="text-sm font-medium text-purple-700">
                      {salesRankings.filter(rep => rep.objectionsHandlingRate >= 70).length}/{salesRankings.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Tendance positive ce mois</span>
                    <span className="text-sm font-medium text-blue-700">
                      {salesRankings.filter(rep => rep.trend === 'up').length}/{salesRankings.length}
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classement des Ventes</h1>
          <p className="text-gray-800">Suivez et comparez les performances de l&apos;équipe</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Ce Trimestre
          </Button>
          <Button variant="outline">
            Exporter le Rapport
          </Button>
        </div>
      </div>

      <SalesRankingContent />
    </div>
  )
}
