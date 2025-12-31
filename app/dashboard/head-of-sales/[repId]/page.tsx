'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronLeft,
  Phone,
  Target,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  UserX,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Presentation,
  DollarSign,
} from 'lucide-react'
import { getSalesRepProfile, SalesRepProfileResponse } from '@/app/actions/head-of-sales'

type TimeRange = 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'thisYear'

function LoadingSpinner() {
  return (
    <div className="p-6 flex min-h-[400px] items-center justify-center text-gray-800">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Chargement du profil...</span>
    </div>
  )
}

function NotFound() {
  return (
    <div className="p-6 flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Commercial non trouvé</h2>
        <p className="text-gray-600 mb-4">Ce profil n&apos;existe pas ou vous n&apos;avez pas accès.</p>
        <Link href="/dashboard/head-of-sales">
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'blue'
}: {
  icon: any
  label: string
  value: string | number
  subValue?: string
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal'
}) {
  const colorClasses = {
    blue: 'from-blue-50 to-cyan-50 text-blue-600',
    green: 'from-green-50 to-emerald-50 text-green-600',
    amber: 'from-amber-50 to-orange-50 text-amber-600',
    red: 'from-red-50 to-rose-50 text-red-600',
    purple: 'from-purple-50 to-pink-50 text-purple-600',
    teal: 'from-teal-50 to-cyan-50 text-teal-600',
  }

  return (
    <Card className={`border-0 bg-gradient-to-br ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-white rounded-full shadow-sm">
            <Icon className={`h-4 w-4 ${colorClasses[color].split(' ')[2]}`} />
          </div>
          <p className="text-xs font-medium text-gray-700">{label}</p>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subValue && <p className="text-xs text-gray-600 mt-1">{subValue}</p>}
      </CardContent>
    </Card>
  )
}

export default function SalesRepProfilePage() {
  const params = useParams()
  const repId = params.repId as string

  const [profile, setProfile] = useState<SalesRepProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('thisMonth')

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const data = await getSalesRepProfile(repId, timeRange)
        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    if (repId) {
      fetchProfile()
    }
  }, [repId, timeRange])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!profile) {
    return <NotFound />
  }

  const initials = `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`.toUpperCase()

  return (
    <div className="p-6 space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/head-of-sales">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Head of Sales
            </Button>
          </Link>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 text-sm font-semibold">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-sm text-gray-600">{profile.email}</p>
            </div>
          </div>
        </div>
        <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
          <SelectTrigger className="w-40 border-gray-300 bg-white hover:bg-gray-50">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thisWeek">Cette semaine</SelectItem>
            <SelectItem value="thisMonth">Ce mois</SelectItem>
            <SelectItem value="thisQuarter">Ce trimestre</SelectItem>
            <SelectItem value="thisYear">Cette année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <MetricCard
          icon={Phone}
          label="Nombre d'appels"
          value={profile.metrics.totalCalls}
          color="blue"
        />
        <MetricCard
          icon={Target}
          label="Taux de conversion"
          value={`${profile.metrics.conversionRate}%`}
          subValue={`${profile.metrics.totalSales} ventes`}
          color="green"
        />
        <MetricCard
          icon={UserX}
          label="No-shows"
          value={profile.metrics.noShowCount}
          subValue={`${profile.metrics.showUpRate}% présence`}
          color={profile.metrics.noShowCount > 5 ? 'red' : 'amber'}
        />
        <MetricCard
          icon={Star}
          label="Note moyenne"
          value={`${profile.metrics.averageScore}/100`}
          color={profile.metrics.averageScore >= 70 ? 'green' : profile.metrics.averageScore >= 50 ? 'amber' : 'red'}
        />
        <MetricCard
          icon={Clock}
          label="Durée moyenne"
          value={`${profile.metrics.averageDuration} min`}
          color="purple"
        />
        <MetricCard
          icon={Presentation}
          label="Pitches"
          value={profile.metrics.totalPitches}
          color="teal"
        />
      </div>

      {/* Objections Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-950">Gestion des Objections</CardTitle>
            <CardDescription className="text-gray-600">
              Taux de maîtrise: {profile.objections.masteringRate}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 rounded-lg bg-gray-50">
                <p className="text-2xl font-bold text-gray-900">{profile.objections.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-2xl font-bold text-green-700">{profile.objections.mastered}</p>
                </div>
                <p className="text-xs text-green-600">Maîtrisées</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50">
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <p className="text-2xl font-bold text-red-700">{profile.objections.notMastered}</p>
                </div>
                <p className="text-xs text-red-600">Non maîtrisées</p>
              </div>
            </div>

            {profile.objections.details.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Par type d&apos;objection</p>
                {profile.objections.details.map((obj, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-sm text-gray-700">{obj.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{obj.resolved}/{obj.count}</span>
                      <Badge
                        variant="outline"
                        className={obj.resolved >= obj.count * 0.7
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {obj.count > 0 ? Math.round((obj.resolved / obj.count) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Aucune objection enregistrée</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-950">Évolution mensuelle</CardTitle>
            <CardDescription className="text-gray-600">
              Performance sur les 6 derniers mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.monthlyTrend.map((month, index) => {
                const prevMonth = profile.monthlyTrend[index - 1]
                const trend = prevMonth
                  ? month.conversionRate > prevMonth.conversionRate ? 'up'
                  : month.conversionRate < prevMonth.conversionRate ? 'down'
                  : 'stable'
                  : 'stable'

                return (
                  <div key={month.month} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{month.month}</p>
                      <p className="text-xs text-gray-500">{month.calls} appels · {month.sales} ventes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          month.conversionRate >= 20
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : month.conversionRate >= 10
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }
                      >
                        {Math.round(month.conversionRate)}%
                      </Badge>
                      {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-950">Appels récents</CardTitle>
          <CardDescription className="text-gray-600">
            Les 10 derniers appels analysés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile.recentCalls.length > 0 ? (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-gray-700">Titre</TableHead>
                    <TableHead className="text-gray-700">Date</TableHead>
                    <TableHead className="text-gray-700 text-right">Durée</TableHead>
                    <TableHead className="text-gray-700 text-right">Score</TableHead>
                    <TableHead className="text-gray-700">Résultat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.recentCalls.map((call) => (
                    <TableRow key={call.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">{call.title}</TableCell>
                      <TableCell className="text-gray-600">
                        {new Date(call.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">{call.duration} min</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            call.score >= 70
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : call.score >= 50
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {call.score}/100
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            call.outcome === 'Vente'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : call.outcome === 'No-show'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        >
                          {call.outcome}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Aucun appel enregistré pour cette période</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
