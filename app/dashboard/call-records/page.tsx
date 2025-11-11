'use client'

import { useEffect, useState, useCallback } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
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
  RefreshCw,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { getCallRecordsWithAnalysisStatus, triggerManualAnalysis, deleteCallRecords, CallRecordWithAnalysisStatus, PaginatedCallRecords } from '@/app/actions/call-records'
import { SparklineChart } from '@/components/sparkline-chart'
import Link from 'next/link'
import { useImpersonationRefresh } from '@/lib/hooks/use-impersonation-refresh'

export default function CallRecordsPage() {
  const [filteredRecords, setFilteredRecords] = useState<CallRecordWithAnalysisStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [analysisFilter, setAnalysisFilter] = useState('all')
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [pagination, setPagination] = useState<PaginatedCallRecords['pagination'] | null>(null)
  const [allFetchedRecords, setAllFetchedRecords] = useState<CallRecordWithAnalysisStatus[]>([])
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const fetchCallRecords = useCallback(async (page: number = 1) => {
    // Don't refetch if we already have this page
    if (fetchedPages.has(page)) {
      return
    }

    setLoading(true)
    try {
      const data = await getCallRecordsWithAnalysisStatus(page, 200) // Fetch 200 records per page
      setPagination(data.pagination)
      
      // Merge with existing records, avoiding duplicates
      setAllFetchedRecords(prev => {
        const existingIds = new Set(prev.map(r => r._id))
        const newRecords = data.records.filter(r => !existingIds.has(r._id))
        return [...prev, ...newRecords].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      })
      
      setFetchedPages(prev => new Set(prev).add(page))
    } catch (error) {
      console.error('Error fetching call records:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchedPages])

  const applyFilters = useCallback(() => {
    let filtered = [...allFetchedRecords]

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
  }, [allFetchedRecords, searchTerm, sourceFilter, analysisFilter])

  useEffect(() => {
    fetchCallRecords(1)
  }, [fetchCallRecords])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1) // Reset to first page when filters change
    setSelectedIds(new Set()) // Clear selections when filters change
  }, [applyFilters])

  // Refresh data when impersonation changes
  const refreshAllData = useCallback(async () => {
    // Reset state
    setAllFetchedRecords([])
    setFetchedPages(new Set())
    setCurrentPage(1)
    setSelectedIds(new Set())
    // Refetch from page 1
    await fetchCallRecords(1)
  }, [fetchCallRecords])

  useImpersonationRefresh(refreshAllData)

  // Fetch more records when navigating to a new page that we haven't fetched yet
  useEffect(() => {
    if (pagination) {
      const serverPageNeeded = Math.ceil((currentPage * itemsPerPage) / 200)
      if (serverPageNeeded <= pagination.totalPages && !fetchedPages.has(serverPageNeeded)) {
        fetchCallRecords(serverPageNeeded)
      }
    }
  }, [currentPage, itemsPerPage, pagination, fetchedPages, fetchCallRecords])

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedRecords.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedRecords.map(r => r._id)))
    }
  }

  const handleSelectRecord = (recordId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(recordId)) {
        next.delete(recordId)
      } else {
        next.add(recordId)
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    const count = selectedIds.size
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${count} enregistrement(s) ? Cette action est irréversible.`)) {
      return
    }

    setDeletingIds(new Set(selectedIds))
    try {
      const result = await deleteCallRecords(Array.from(selectedIds))
      if (result.success) {
        // Remove deleted records from state
        setAllFetchedRecords(prev => prev.filter(r => !selectedIds.has(r._id)))
        setFilteredRecords(prev => prev.filter(r => !selectedIds.has(r._id)))
        setSelectedIds(new Set())
        alert(result.message)
        // Refresh current page
        const pageToRefresh = Math.ceil((currentPage - 1) * itemsPerPage / 200) + 1
        setFetchedPages(prev => {
          const newSet = new Set(prev)
          newSet.delete(pageToRefresh)
          return newSet
        })
        await fetchCallRecords(pageToRefresh)
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Error deleting call records:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setDeletingIds(new Set())
    }
  }

  const handleAnalyzeCall = async (callRecordId: string, force: boolean = false) => {
    setAnalyzingIds(prev => new Set(prev).add(callRecordId))
    try {
      await triggerManualAnalysis(callRecordId, force)
      // Refresh the current page after analysis
      const pageToRefresh = Math.ceil((currentPage - 1) * itemsPerPage / 200) + 1
      setFetchedPages(prev => {
        const newSet = new Set(prev)
        newSet.delete(pageToRefresh)
        return newSet
      })
      await fetchCallRecords(pageToRefresh)
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
    total: pagination?.total ?? allFetchedRecords.length,
    analyzed: allFetchedRecords.filter(r => r.hasAnalysis && r.analysisStatus === 'completed').length,
    pending: allFetchedRecords.filter(r => r.analysisStatus === 'pending').length,
    notAnalyzed: allFetchedRecords.filter(r => !r.hasAnalysis).length,
  }

  // Generate sparkline data for stats
  const totalSparkline = [stats.total - 30, stats.total - 25, stats.total - 20, stats.total - 15, stats.total - 10, stats.total - 5, stats.total]
  const analyzedSparkline = [stats.analyzed - 20, stats.analyzed - 15, stats.analyzed - 12, stats.analyzed - 8, stats.analyzed - 5, stats.analyzed - 2, stats.analyzed]
  const pendingSparkline = [stats.pending + 5, stats.pending + 3, stats.pending + 2, stats.pending + 1, stats.pending, stats.pending - 1, stats.pending]
  const notAnalyzedSparkline = [stats.notAnalyzed + 15, stats.notAnalyzed + 12, stats.notAnalyzed + 8, stats.notAnalyzed + 5, stats.notAnalyzed + 3, stats.notAnalyzed + 1, stats.notAnalyzed]

  // Pagination calculations - use filtered records for display
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Prefetch next page if we're getting close to the end of fetched data
    const recordsNeeded = page * itemsPerPage
    const pagesNeeded = Math.ceil(recordsNeeded / 200)
    if (pagination && pagesNeeded <= pagination.totalPages && !fetchedPages.has(pagesNeeded)) {
      fetchCallRecords(pagesNeeded)
    }
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Card */}
        <Card className="border-0 bg-gradient-to-br from-slate-50 to-gray-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <BarChart3 className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Total</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-600">Enregistrements</span>
              </div>
            </div>
            <SparklineChart data={totalSparkline} color="#64748b" />
          </CardContent>
        </Card>

        {/* Analysés Card */}
        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Analysés</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900">{stats.analyzed}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-green-600 font-semibold">{stats.total > 0 ? Math.round((stats.analyzed / stats.total) * 100) : 0}%</span>
                <span className="text-gray-500">du total</span>
              </div>
            </div>
            <SparklineChart data={analyzedSparkline} color="#10b981" />
          </CardContent>
        </Card>

        {/* En cours Card */}
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">En cours</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900">{stats.pending}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-600">En traitement</span>
              </div>
            </div>
            <SparklineChart data={pendingSparkline} color="#3b82f6" />
          </CardContent>
        </Card>

        {/* Non analysés Card */}
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <XCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Non analysés</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-3">
              <div className="text-3xl font-bold text-gray-900">{stats.notAnalyzed}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-600">À analyser</span>
              </div>
            </div>
            <SparklineChart data={notAnalyzedSparkline} color="#f59e0b" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-950">
            <Filter className="h-5 w-5 text-gray-950" />
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
              <SelectTrigger className="text-gray-950">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="text-gray-950">
                <SelectItem className="text-gray-950" value="all">Toutes les sources</SelectItem>
                <SelectItem className="text-gray-950" value="fathom">Fathom</SelectItem>
                <SelectItem className="text-gray-950" value="fireflies">Fireflies</SelectItem>
                <SelectItem className="text-gray-950" value="zoom">Zoom</SelectItem>
                <SelectItem className="text-gray-950" value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>

            <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
              <SelectTrigger className="text-gray-950">
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-950">Enregistrements d&apos;appels</CardTitle>
              <CardDescription>
                {filteredRecords.length} enregistrement{filteredRecords.length !== 1 ? 's' : ''} trouvé{filteredRecords.length !== 1 ? 's' : ''}
                {filteredRecords.length > 0 && ` • Affichage de ${startIndex + 1}-${Math.min(endIndex, filteredRecords.length)}`}
                {selectedIds.size > 0 && ` • ${selectedIds.size} sélectionné${selectedIds.size !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={deletingIds.size > 0}
                  className="text-white"
                >
                  {deletingIds.size > 0 ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer ({selectedIds.size})
                    </>
                  )}
                </Button>
              )}
              <span className="text-sm text-gray-600">Lignes par page:</span>
              <Select  value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(parseInt(value))
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-20 text-gray-950">
                  <SelectValue  />
                </SelectTrigger>
                <SelectContent className="text-gray-950">
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={paginatedRecords.length > 0 && selectedIds.size === paginatedRecords.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Commercial</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut d&apos;analyse</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Aucun enregistrement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => (
                    <TableRow key={record._id} className={`hover:bg-gray-50 ${selectedIds.has(record._id) ? 'bg-blue-50' : ''}`}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(record._id)}
                          onChange={() => handleSelectRecord(record._id)}
                          disabled={deletingIds.has(record._id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-950" />
                          <span className="text-sm text-gray-950 ">{formatDate(record.createdAt)}</span>
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
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-950">
                            {formatDuration(record.actualDuration)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getAnalysisStatusBadge(record)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-950">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-gray-950">
                            {record.hasAnalysis && record.analysisId ? (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/dashboard/call-analysis/${record.analysisId}`}
                                    className="flex items-center cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Voir l&apos;analyse
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAnalyzeCall(record._id, true)}
                                  disabled={analyzingIds.has(record._id)}
                                  className="cursor-pointer"
                                >
                                  {analyzingIds.has(record._id) ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Re-analyse en cours...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Re-analyser
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleAnalyzeCall(record._id)}
                                disabled={analyzingIds.has(record._id)}
                                className="cursor-pointer"
                              >
                                {analyzingIds.has(record._id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Analyse en cours...
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Analyser
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && (
          <div className="border-t px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="text-gray-950"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber: number
                    if (totalPages <= 5) {
                      pageNumber = i + 1
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i
                    } else {
                      pageNumber = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        className="w-10 text-gray-950"
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  className="text-gray-950"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
