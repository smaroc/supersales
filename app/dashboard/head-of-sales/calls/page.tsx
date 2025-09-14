'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Phone, 
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  User,
  Target,
  BarChart3
} from 'lucide-react'

interface CallDetail {
  _id: string
  callId: string
  salesRep: {
    id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  callType: string
  evaluationDate: string
  duration: number
  outcome: 'closed_won' | 'closed_lost' | 'follow_up_required' | 'no_show' | 'cancelled'
  totalScore: number
  weightedScore: number
  scores: {
    criteriaId: string
    criteriaName: string
    score: number | boolean | string
    maxScore?: number
    weight: number
  }[]
  notes: string
  nextSteps: string[]
  recording?: {
    url?: string
    duration: number
  }
}

interface CallFilters {
  salesRep: string
  callType: string
  outcome: string
  dateRange: string
  search: string
}

export default function CallsTablePage() {
  const { data: session } = useSession()
  const [calls, setCalls] = useState<CallDetail[]>([])
  const [filteredCalls, setFilteredCalls] = useState<CallDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<CallDetail | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // Filters and sorting
  const [filters, setFilters] = useState<CallFilters>({
    salesRep: '',
    callType: '',
    outcome: '',
    dateRange: 'thisMonth',
    search: ''
  })
  const [sortBy, setSortBy] = useState('evaluationDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Available filter options
  const [salesReps, setSalesReps] = useState<{id: string, name: string}[]>([])
  const [callTypes, setCallTypes] = useState<string[]>([])

  // Check permissions
  if (!['head_of_sales', 'admin', 'manager'].includes(session?.user?.role || '')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Accès refusé</h2>
          <p className="text-gray-500 mt-2">Vous n'avez pas les permissions pour voir les détails des appels</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchCalls()
  }, [filters.dateRange])

  useEffect(() => {
    applyFilters()
  }, [calls, filters, sortBy, sortOrder])

  const fetchCalls = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/call-evaluations?timeRange=${filters.dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setCalls(data.calls)
        setSalesReps(data.salesReps)
        setCallTypes(data.callTypes)
      }
    } catch (error) {
      console.error('Error fetching calls:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...calls]

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(call => 
        `${call.salesRep.firstName} ${call.salesRep.lastName}`.toLowerCase().includes(filters.search.toLowerCase()) ||
        call.callType.toLowerCase().includes(filters.search.toLowerCase()) ||
        call.notes.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    // Apply dropdown filters
    if (filters.salesRep) {
      filtered = filtered.filter(call => call.salesRep.id === filters.salesRep)
    }
    if (filters.callType) {
      filtered = filtered.filter(call => call.callType === filters.callType)
    }
    if (filters.outcome) {
      filtered = filtered.filter(call => call.outcome === filters.outcome)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'salesRep':
          aValue = `${a.salesRep.firstName} ${a.salesRep.lastName}`
          bValue = `${b.salesRep.firstName} ${b.salesRep.lastName}`
          break
        case 'duration':
          aValue = a.duration
          bValue = b.duration
          break
        case 'weightedScore':
          aValue = a.weightedScore
          bValue = b.weightedScore
          break
        case 'evaluationDate':
        default:
          aValue = new Date(a.evaluationDate)
          bValue = new Date(b.evaluationDate)
          break
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    setFilteredCalls(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}min`
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'closed_won': return 'bg-green-100 text-green-800'
      case 'closed_lost': return 'bg-red-100 text-red-800'
      case 'follow_up_required': return 'bg-yellow-100 text-yellow-800'
      case 'no_show': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOutcomeLabel = (outcome: string) => {
    switch (outcome) {
      case 'closed_won': return 'Gagné'
      case 'closed_lost': return 'Perdu'
      case 'follow_up_required': return 'Suivi requis'
      case 'no_show': return 'Absent'
      case 'cancelled': return 'Annulé'
      default: return outcome
    }
  }

  const exportToCSV = () => {
    const csvData = filteredCalls.map(call => ({
      Date: new Date(call.evaluationDate).toLocaleDateString('fr-FR'),
      Commercial: `${call.salesRep.firstName} ${call.salesRep.lastName}`,
      'Type d\'appel': call.callType,
      'Durée (min)': call.duration,
      Résultat: getOutcomeLabel(call.outcome),
      'Score global': call.weightedScore,
      Notes: call.notes
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `appels-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Pagination
  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCalls = filteredCalls.slice(startIndex, startIndex + itemsPerPage)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Phone className="h-6 w-6" />
            <span>Détail des appels</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {filteredCalls.length} appels trouvés
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
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
          <Button variant="outline" onClick={exportToCSV} disabled={filteredCalls.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtres</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.salesRep || "all"} onValueChange={(value) => setFilters({...filters, salesRep: value === "all" ? "" : value})}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les commerciaux" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les commerciaux</SelectItem>
                {salesReps.map(rep => (
                  <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.callType || "all"} onValueChange={(value) => setFilters({...filters, callType: value === "all" ? "" : value})}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {callTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.outcome || "all"} onValueChange={(value) => setFilters({...filters, outcome: value === "all" ? "" : value})}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les résultats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les résultats</SelectItem>
                <SelectItem value="closed_won">Gagné</SelectItem>
                <SelectItem value="closed_lost">Perdu</SelectItem>
                <SelectItem value="follow_up_required">Suivi requis</SelectItem>
                <SelectItem value="no_show">Absent</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field)
              setSortOrder(order as 'asc' | 'desc')
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evaluationDate-desc">Date (récent → ancien)</SelectItem>
                <SelectItem value="evaluationDate-asc">Date (ancien → récent)</SelectItem>
                <SelectItem value="salesRep-asc">Commercial (A → Z)</SelectItem>
                <SelectItem value="salesRep-desc">Commercial (Z → A)</SelectItem>
                <SelectItem value="duration-desc">Durée (↓)</SelectItem>
                <SelectItem value="duration-asc">Durée (↑)</SelectItem>
                <SelectItem value="weightedScore-desc">Score (↓)</SelectItem>
                <SelectItem value="weightedScore-asc">Score (↑)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Commercial</th>
                  <th className="text-left py-3 px-4 font-medium">Type d'appel</th>
                  <th className="text-left py-3 px-4 font-medium">Durée</th>
                  <th className="text-left py-3 px-4 font-medium">Résultat</th>
                  <th className="text-left py-3 px-4 font-medium">Score global</th>
                  <th className="text-left py-3 px-4 font-medium">Critères</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCalls.map((call) => (
                  <tr 
                    key={call._id} 
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(call.evaluationDate).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {call.salesRep.firstName[0]}{call.salesRep.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{call.salesRep.firstName} {call.salesRep.lastName}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="font-medium">
                        {call.callType}
                      </Badge>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{formatDuration(call.duration)}</span>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <Badge className={getOutcomeColor(call.outcome)}>
                        {getOutcomeLabel(call.outcome)}
                      </Badge>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{call.weightedScore.toFixed(1)}/100</span>
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${call.weightedScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {call.scores.filter(s => typeof s.score === 'boolean' ? s.score : (typeof s.score === 'number' && s.score > (s.maxScore ? s.maxScore * 0.7 : 7))).length}/{call.scores.length}
                        </span>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCall(call)
                          setShowDetailModal(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Affichage {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredCalls.length)} sur {filteredCalls.length} appels
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <span className="flex items-center px-3 text-sm">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Detail Modal */}
      {showDetailModal && selectedCall && (
        <CallDetailModal 
          call={selectedCall}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  )
}

// Call Detail Modal Component
function CallDetailModal({ call, onClose }: { call: CallDetail, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center space-x-2">
              <Phone className="h-6 w-6" />
              <span>Détail de l'appel</span>
            </h2>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Call Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Commercial</label>
                  <p className="font-medium">{call.salesRep.firstName} {call.salesRep.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type d'appel</label>
                  <p><Badge variant="outline">{call.callType}</Badge></p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p>{new Date(call.evaluationDate).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Durée</label>
                  <p className="font-medium">{call.duration} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Résultat</label>
                  <p>
                    <Badge className={getOutcomeColor(call.outcome)}>
                      {getOutcomeLabel(call.outcome)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Score global</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">{call.weightedScore.toFixed(1)}/100</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${call.weightedScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Criteria Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Respect des critères</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {call.scores.map((score, index) => (
                    <div key={index} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{score.criteriaName}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Poids: {score.weight}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {typeof score.score === 'boolean' ? (
                          <Badge variant={score.score ? "default" : "secondary"}>
                            {score.score ? 'Oui' : 'Non'}
                          </Badge>
                        ) : typeof score.score === 'number' ? (
                          <>
                            <span className="font-medium">{score.score}/{score.maxScore || 10}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${(score.score / (score.maxScore || 10)) * 100}%` }}
                              ></div>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-600">{score.score}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes and Next Steps */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{call.notes || 'Aucune note'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prochaines étapes</CardTitle>
              </CardHeader>
              <CardContent>
                {call.nextSteps.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {call.nextSteps.map((step, index) => (
                      <li key={index} className="text-sm">{step}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Aucune étape définie</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function getOutcomeColor(outcome: string) {
  switch (outcome) {
    case 'closed_won': return 'bg-green-100 text-green-800'
    case 'closed_lost': return 'bg-red-100 text-red-800'
    case 'follow_up_required': return 'bg-yellow-100 text-yellow-800'
    case 'no_show': return 'bg-gray-100 text-gray-800'
    case 'cancelled': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getOutcomeLabel(outcome: string) {
  switch (outcome) {
    case 'closed_won': return 'Gagné'
    case 'closed_lost': return 'Perdu'
    case 'follow_up_required': return 'Suivi requis'
    case 'no_show': return 'Absent'
    case 'cancelled': return 'Annulé'
    default: return outcome
  }
}