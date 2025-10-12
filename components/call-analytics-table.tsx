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
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filter data
  const filteredData = callAnalytics.filter((call) => {
    const matchesSearch =
      call.prospect.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.closeur.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || call.analysisStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const formatTalkTime = (closeurTime: number, clientTime: number) => {
    const total = closeurTime + clientTime
    if (total === 0) return '—'
    const closeurPercent = Math.round((closeurTime / total) * 100)
    const clientPercent = Math.round((clientTime / total) * 100)
    return `${closeurPercent}% / ${clientPercent}%`
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
              className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] border-gray-300">
              <Filter className="mr-2 h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
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
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200">
              <TableHead className="text-gray-900 font-medium">Prospect</TableHead>
              <TableHead className="text-gray-900 font-medium">Closeur</TableHead>
              <TableHead className="text-gray-900 font-medium">Durée</TableHead>
              <TableHead className="text-gray-900 font-medium">Score</TableHead>
              <TableHead className="text-gray-900 font-medium">Temps de parole</TableHead>
              <TableHead className="text-gray-900 font-medium">Vente</TableHead>
              <TableHead className="text-gray-900 font-medium">Statut</TableHead>
              <TableHead className="text-gray-900 font-medium">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  Aucun résultat trouvé.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((call) => (
                <React.Fragment key={call._id}>
                  <TableRow className="group hover:bg-gray-50 border-b border-gray-100">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto text-gray-500 hover:text-gray-700"
                        onClick={() => toggleRow(call._id)}
                      >
                        {expandedRows.has(call._id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/call-analysis/${call._id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors"
                      >
                        {call.prospect}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-700">{call.closeur}</TableCell>
                    <TableCell className="text-gray-700">{call.dureeAppel}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono border-gray-300 text-gray-700">
                        {call.noteGlobale?.total ?? '—'}/100
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-700">
                      {formatTalkTime(call.temps_de_parole_closeur || 0, call.temps_de_parole_client || 0)}
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
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(call.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-gray-200">
                          <DropdownMenuLabel className="text-gray-900">Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            className="text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/dashboard/call-analysis/${call._id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-700 hover:bg-gray-50">
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-200" />
                          <DropdownMenuItem className="text-red-600 hover:bg-red-50">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(call._id) && (
                    <TableRow>
                      <TableCell colSpan={10} className="bg-gray-25 p-0">
                        <div className="p-6 space-y-4">
                          {/* Call Summary */}
                          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Résumé de l&apos;appel</h4>
                            <p className="text-sm leading-relaxed text-gray-700">{call.resume_de_lappel}</p>
                          </div>

                          {/* Evaluation by Steps */}
                          {call.evaluationCompetences?.length > 0 && (
                            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                              <h4 className="text-sm font-semibold text-gray-900 mb-4">Évaluation par étape</h4>
                              <div className="space-y-3">
                                {call.evaluationCompetences.map((item, index) => (
                                  <div key={`${item.etapeProcessus}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-gray-900">{item.etapeProcessus}</span>
                                        {item.validation ? (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-600" />
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-600">{item.commentaire || 'Pas de commentaire'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="border-gray-300">{item.evaluation}/10</Badge>
                                      <span className="text-xs text-gray-600">{item.temps_passe_mm_ss}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Strengths and Improvements */}
                          <div className="grid gap-4 md:grid-cols-2">
                            {/* Strengths */}
                            {call.resumeForces?.length > 0 && (
                              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Forces identifiées</h4>
                                <div className="space-y-2">
                                  {call.resumeForces.map((item, index) => (
                                    <div key={`force-${index}`} className="text-sm text-gray-700 p-3 bg-green-50 rounded-lg border border-green-200">
                                      {item.pointFort}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Improvements */}
                            {call.axesAmelioration?.length > 0 && (
                              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Axes d&apos;amélioration</h4>
                                <div className="space-y-3">
                                  {call.axesAmelioration.map((item, index) => (
                                    <div key={`axe-${index}`} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <h5 className="text-sm font-medium text-gray-900">{item.axeAmelioration}</h5>
                                      <p className="text-xs text-gray-600 mt-1">{item.suggestion}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Additional Comments */}
                          {(call.commentairesSupplementaires?.feedbackGeneral || call.commentairesSupplementaires?.prochainesEtapes) && (
                            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Commentaires &amp; prochaines étapes</h4>
                              <div className="space-y-2 text-sm text-gray-700">
                                {call.commentairesSupplementaires?.feedbackGeneral && (
                                  <p>
                                    <span className="font-medium text-gray-900">Feedback général :</span>{' '}
                                    {call.commentairesSupplementaires.feedbackGeneral}
                                  </p>
                                )}
                                {call.commentairesSupplementaires?.prochainesEtapes && (
                                  <p>
                                    <span className="font-medium text-gray-900">Prochaines étapes :</span>{' '}
                                    {call.commentairesSupplementaires.prochainesEtapes}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-600">
            Affichage de {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredData.length)} sur {filteredData.length} résultats
          </p>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="w-20 border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>

          <div className="flex items-center space-x-1">
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
                  className={`w-8 h-8 p-0 ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
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
            className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
          >
            Suivant
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}