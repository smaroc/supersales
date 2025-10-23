'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { deleteCallAnalysis } from '@/app/actions/call-analysis'
import { toast } from 'sonner'
import { EditSaleStatusDialog } from '@/components/edit-sale-status-dialog'

interface EvaluationCompetence {
  etapeProcessus: string
  evaluation: number
  temps_passe: number
  temps_passe_mm_ss: string
  timestamps: string
  commentaire: string
  validation: boolean
}

interface ResumePoint {
  pointFort: string
}

interface AxeAmelioration {
  axeAmelioration: string
  suggestion: string
  exemple_issu_de_lappel: string
  alternative: string
}

interface CommentairesSupplementaires {
  feedbackGeneral?: string
  prochainesEtapes?: string
}

interface NotesAdditionnelles {
  timestampsImportants?: string[]
  ressourcesRecommandees?: string[]
}

interface CallAnalytic {
  _id: string
  organizationId?: string
  callRecordId?: string
  salesRepId?: string
  closeur: string
  prospect: string
  dureeAppel: string
  venteEffectuee: boolean
  temps_de_parole_closeur: number
  temps_de_parole_client: number
  resume_de_lappel: string
  evaluationCompetences: EvaluationCompetence[]
  noteGlobale?: {
    total: number
    sur100: string
  }
  resumeForces: ResumePoint[]
  axesAmelioration: AxeAmelioration[]
  commentairesSupplementaires?: CommentairesSupplementaires
  notesAdditionnelles?: NotesAdditionnelles
  analysisStatus: string
  createdAt?: string
  updatedAt?: string
  rawAnalysisResponse?: string
  userId?: string
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function CallAnalyticsTable({ callAnalytics }: { callAnalytics: CallAnalytic[] }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingCall, setEditingCall] = useState<CallAnalytic | null>(null)
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc' | null>('desc') // Default to newest first

  // Filter and sort data
  let filteredData = callAnalytics.filter((call) => {
    const matchesSearch =
      call.prospect.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.closeur.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || call.analysisStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  // Apply sorting
  if (dateSortOrder) {
    filteredData = [...filteredData].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateSortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })
  }

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const toggleDateSort = () => {
    if (dateSortOrder === 'desc') {
      setDateSortOrder('asc')
    } else if (dateSortOrder === 'asc') {
      setDateSortOrder(null)
    } else {
      setDateSortOrder('desc')
    }
    setCurrentPage(1) // Reset to first page when sorting changes
  }

  const handleDelete = async (callId: string, prospect: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'analyse de ${prospect} ? Cette action est irréversible.`)) {
      return
    }

    setDeletingId(callId)
    try {
      const result = await deleteCallAnalysis(callId)
      if (result.success) {
        toast.success(result.message)
        // Refresh the page to show updated data
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error deleting call analysis:', error)
      toast.error('Une erreur est survenue lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4">
        <div className="flex flex-1 items-center space-x-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Rechercher par prospect ou closeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-gray-950 pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] border-gray-300 text-gray-900">
              <Filter className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Statut" className="text-gray-900 placeholder:text-gray-500" />
            </SelectTrigger>
            <SelectContent className="text-gray-900">
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50">
              <TableHead className="text-gray-900 font-medium">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDateSort}
                  className="flex items-center gap-1 -ml-3 hover:bg-gray-100"
                >
                  Date
                  {dateSortOrder === 'desc' && <ArrowDown className="h-3 w-3" />}
                  {dateSortOrder === 'asc' && <ArrowUp className="h-3 w-3" />}
                  {!dateSortOrder && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                </Button>
              </TableHead>
              <TableHead className="text-gray-900 font-medium">Prospect</TableHead>
              <TableHead className="text-gray-900 font-medium">Closeur</TableHead>
              <TableHead className="text-gray-900 font-medium">Durée</TableHead>
              <TableHead className="text-gray-900 font-medium">Score</TableHead>
              <TableHead className="text-gray-900 font-medium">Vente</TableHead>
              <TableHead className="text-gray-900 font-medium">Statut</TableHead>
              <TableHead className="text-gray-900 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                  Aucun résultat trouvé.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((call) => (
                <React.Fragment key={call._id}>
                  <TableRow
                    className="group hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                    onClick={() => router.push(`/dashboard/call-analysis/${call._id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-950" />
                        <span className="text-sm text-gray-950">{formatDate(call.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {call.prospect}
                    </TableCell>
                    <TableCell className="text-gray-700">{call.closeur}</TableCell>
                    <TableCell className="text-gray-700">{call.dureeAppel}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono border-gray-300 text-gray-700">
                        {call.noteGlobale?.total ?? '—'}/100
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={call.venteEffectuee ? 'default' : 'secondary'}
                        className={call.venteEffectuee ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}
                      >
                        {call.venteEffectuee ? 'Oui' : 'Non'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        call.analysisStatus === 'completed' ? 'border-green-200 bg-green-50 text-green-700' :
                        call.analysisStatus === 'pending' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                        'border-red-200 bg-red-50 text-red-700'
                      }>
                        {call.analysisStatus === 'completed' ? 'Terminé' :
                         call.analysisStatus === 'pending' ? 'En attente' : 'Échoué'}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-950">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-gray-200 w-48 text-gray-950">
                          <DropdownMenuLabel className="text-gray-900">Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            className="text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/dashboard/call-analysis/${call._id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setEditingCall(call)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-200" />
                          <DropdownMenuItem
                            className="text-red-600 hover:bg-red-50 cursor-pointer"
                            onClick={() => handleDelete(call._id, call.prospect)}
                            disabled={deletingId === call._id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingId === call._id ? 'Suppression...' : 'Supprimer'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-6 py-4 bg-white rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages} • {filteredData.length} résultat{filteredData.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Lignes par page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value))
                  setCurrentPage(1)
                }}>
                  <SelectTrigger className="w-20 border-gray-300 text-gray-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-gray-950">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
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
                className="text-gray-950"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10 text-gray-950"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="text-gray-950"
              >
                Suivant
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Status Dialog */}
      {editingCall && (
        <EditSaleStatusDialog
          callAnalysisId={editingCall._id}
          prospect={editingCall.prospect}
          initialStatus={editingCall.venteEffectuee}
          open={!!editingCall}
          onOpenChange={(open) => !open && setEditingCall(null)}
        />
      )}
    </div>
  )
}