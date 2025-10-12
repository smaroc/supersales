'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Phone,
  Search,
  Filter,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Calendar,
  Eye,
} from 'lucide-react'
import { getCallRecordsWithAnalysisStatus, triggerManualAnalysis, CallRecordWithAnalysisStatus } from '@/app/actions/call-records'
import Link from 'next/link'

export default function CallRecordsPage() {
  const [callRecords, setCallRecords] = useState<CallRecordWithAnalysisStatus[]>([])
  const [filteredRecords, setFilteredRecords] = useState<CallRecordWithAnalysisStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [analysisFilter, setAnalysisFilter] = useState('all')
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCallRecords()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [callRecords, searchTerm, sourceFilter, analysisFilter])

  const fetchCallRecords = async () => {
    setLoading(true)
    try {
      const data = await getCallRecordsWithAnalysisStatus()
      setCallRecords(data)
    } catch (error) {
      console.error('Error fetching call records:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...callRecords]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.salesRepName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(record => record.source === sourceFilter)
    }

    // Analysis status filter
    if (analysisFilter === 'analyzed') {
      filtered = filtered.filter(record => record.hasAnalysis)
    } else if (analysisFilter === 'not-analyzed') {
      filtered = filtered.filter(record => !record.hasAnalysis)
    } else if (analysisFilter === 'pending') {
      filtered = filtered.filter(record => record.analysisStatus === 'pending')
    } else if (analysisFilter === 'failed') {
      filtered = filtered.filter(record => record.analysisStatus === 'failed')
    }

    setFilteredRecords(filtered)
  }

  const handleAnalyzeCall = async (callRecordId: string) => {
    setAnalyzingIds(prev => new Set(prev).add(callRecordId))
    try {
      await triggerManualAnalysis(callRecordId)
      // Refresh the list after analysis
      await fetchCallRecords()
    } catch (error) {
      console.error('Error analyzing call:', error)
      alert('Erreur lors de l\'analyse de l\'appel')
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev)
        next.delete(callRecordId)
        return next
      })
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}min`
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'fathom': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'fireflies': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'zoom': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'manual': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getAnalysisStatusBadge = (record: CallRecordWithAnalysisStatus) => {
    if (!record.hasAnalysis) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
          <XCircle className="h-3 w-3 mr-1" />
          Non analysé
        </Badge>
      )
    }

    if (record.analysisStatus === 'completed') {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Analysé
        </Badge>
      )
    }

    if (record.analysisStatus === 'pending') {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
          <Clock className="h-3 w-3 mr-1" />
          En cours
        </Badge>
      )
    }

    if (record.analysisStatus === 'failed') {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          Échoué
        </Badge>
      )
    }

    return null
  }

  const stats = {
    total: callRecords.length,
    analyzed: callRecords.filter(r => r.hasAnalysis && r.analysisStatus === 'completed').length,
    pending: callRecords.filter(r => r.analysisStatus === 'pending').length,
    notAnalyzed: callRecords.filter(r => !r.hasAnalysis).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-950">Gestion des enregistrements d&apos;appels</h1>
        <p className="text-sm text-gray-600 mt-1">
          Visualisez et gérez tous les enregistrements d&apos;appels et leur statut d&apos;analyse
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-950">{stats.total}</div>
            <p className="text-xs text-gray-600 mt-1">Enregistrements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Analysés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.analyzed}</div>
            <p className="text-xs text-gray-600 mt-1">Analyses complètes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-xs text-gray-600 mt-1">Analyses en attente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Non analysés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.notAnalyzed}</div>
            <p className="text-xs text-gray-600 mt-1">À analyser</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sources</SelectItem>
                <SelectItem value="fathom">Fathom</SelectItem>
                <SelectItem value="fireflies">Fireflies</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>

            <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut d'analyse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="analyzed">Analysés</SelectItem>
                <SelectItem value="not-analyzed">Non analysés</SelectItem>
                <SelectItem value="pending">En cours</SelectItem>
                <SelectItem value="failed">Échoués</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Call Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enregistrements d&apos;appels</CardTitle>
          <CardDescription>
            {filteredRecords.length} enregistrement{filteredRecords.length !== 1 ? 's' : ''} trouvé{filteredRecords.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Date</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Commercial</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut d&apos;analyse</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Aucun enregistrement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record._id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{formatDate(record.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 truncate">{record.title}</p>
                          {record.hasExternalInvitees && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Invités externes
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">{record.salesRepName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSourceColor(record.source)}>
                          {record.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            {formatDuration(record.actualDuration)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getAnalysisStatusBadge(record)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.hasAnalysis && record.analysisId ? (
                            <Link href={`/dashboard/call-analysis/${record.analysisId}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Voir
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAnalyzeCall(record._id)}
                              disabled={analyzingIds.has(record._id)}
                            >
                              {analyzingIds.has(record._id) ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Analyse...
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  Analyser
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
