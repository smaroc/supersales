import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Phone,
  TrendingUp,
  Clock,
  Mic,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Calendar,
  User,
  AlertCircle,
  Award,
  DollarSign,
  UserX,
  Presentation,
  Star,
  Target,
} from 'lucide-react'
import { getCallAnalysisById } from '@/app/actions/call-analysis'
import { getAuthorizedUser } from '@/app/actions/users'
import { CallAnalysisShareButton } from '@/components/call-analysis-share-button'
import { SaleStatusToggle } from '@/components/sale-status-toggle'
import { NoShowToggle } from '@/components/no-show-toggle'
import { CustomCriteriaAnalysis } from '@/components/custom-criteria-analysis'
import { CallPerformanceChart } from '@/components/call-performance-chart'
import { CollapsibleEvaluation } from '@/components/collapsible-evaluation'
import { DealProductEditor } from '@/components/deal-product-editor'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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

interface CustomCriteriaResult {
  criteriaId: string
  criteriaTitle: string
  analysis: string
  score?: number | null
  highlights?: string[]
  analyzedAt: Date
}

interface Objection {
  objection: string
  timestamp?: string
  type_objection?: string
  traitement?: string
  resolue: boolean
  commentaire?: string
}

interface LeadScoring {
  score_global?: number
  qualite?: string
  criteres_evaluation?: any
  recommandation?: string
}

interface CallAnalysisDetail {
  _id: string
  organizationId?: string
  callRecordId?: string
  salesRepId?: string
  closeur: string
  prospect: string
  dureeAppel: string
  venteEffectuee: boolean
  dealValue?: number
  productId?: string
  temps_de_parole_closeur: number
  temps_de_parole_client: number
  resume_de_lappel: string
  // No-show detection
  no_show?: boolean
  raison_no_show?: string
  // Pitch and performance highlights
  pitch_effectue?: boolean
  partie_excellente?: string
  partie_a_travailler?: string
  objections_lead?: Objection[]
  lead_scoring?: LeadScoring
  evaluationCompetences: EvaluationCompetence[]
  noteGlobale?: {
    total: number
    sur100: string
  }
  resumeForces: ResumePoint[]
  axesAmelioration: AxeAmelioration[]
  commentairesSupplementaires?: CommentairesSupplementaires
  notesAdditionnelles?: NotesAdditionnelles
  customCriteriaResults?: CustomCriteriaResult[]
  analysisStatus: string
  createdAt?: string
  updatedAt?: string
  rawAnalysisResponse?: string
  userId?: string
  isPublic?: boolean
  shareToken?: string
  sharedAt?: string
  sharedBy?: string
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short'
  })
}

function formatTalkTime(closeurTime: number, clientTime: number) {
  const total = closeurTime + clientTime
  if (total === 0) return { closeur: 0, client: 0 }
  const closeurPercent = Math.round((closeurTime / total) * 100)
  const clientPercent = Math.round((clientTime / total) * 100)
  return { closeur: closeurPercent, client: clientPercent }
}

export default async function CallAnalysisDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>
}) {
  const { callId } = await params
  const user = await getAuthorizedUser()

  if (!user || !user.currentUser) {
    return (
      <div className="p-6 space-y-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-800">Accès non autorisé</p>
        </div>
      </div>
    )
  }

  let callAnalysis: CallAnalysisDetail
  try {
    callAnalysis = await getCallAnalysisById(callId)
  } catch (error) {
    console.error('Error loading call analysis:', error)
    notFound()
  }

  const talkTimeRatio = formatTalkTime(
    callAnalysis.temps_de_parole_closeur || 0,
    callAnalysis.temps_de_parole_client || 0
  )

  // Check if user can edit sale status
  const currentUser = user.currentUser
  const isOwner = callAnalysis.userId === currentUser.clerkId || callAnalysis.userId === currentUser._id?.toString()
  const hasOrgAccess = currentUser.isAdmin && callAnalysis.organizationId?.toString() === currentUser.organizationId.toString()
  const hasSuperAdminAccess = currentUser.isSuperAdmin
  const canEditSaleStatus = isOwner || hasOrgAccess || hasSuperAdminAccess

  return (
    <div className="p-6 space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/call-analysis">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-gray-950">Détail de l&apos;analyse</h1>
            <p className="text-sm text-gray-800 mt-1">
              Analyse complète de l&apos;appel avec {callAnalysis.prospect}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CallAnalysisShareButton
            callId={callId}
            isPublic={callAnalysis.isPublic}
            shareToken={callAnalysis.shareToken}
          />
          <Badge
            variant="outline"
            className={
              callAnalysis.analysisStatus === 'completed'
                ? 'border-green-200 bg-green-50 text-green-700'
                : callAnalysis.analysisStatus === 'pending'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }
          >
            {callAnalysis.analysisStatus === 'completed'
              ? 'Terminé'
              : callAnalysis.analysisStatus === 'pending'
              ? 'En attente'
              : 'Échoué'}
          </Badge>
        </div>
      </div>

      {/* No-Show Alert */}
      {callAnalysis.no_show && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-1">
                  Appel No-Show / Trop court
                </h3>
                <p className="text-sm text-red-700">
                  {callAnalysis.raison_no_show || 'Le prospect ne s\'est pas présenté ou l\'appel était trop court pour être analysé.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact Overview Section */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          {/* First Row - Read-only Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-gray-600 mb-0.5">Prospect</div>
                <div className="text-sm font-semibold text-gray-950 truncate">{callAnalysis.prospect}</div>
                <div className="text-xs text-gray-500 truncate">Closeur: {callAnalysis.closeur}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-600 mb-0.5">Durée</div>
                <div className="text-lg font-semibold text-gray-950">{callAnalysis.dureeAppel}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600 mb-0.5">Score global</div>
                <div className="text-lg font-semibold text-gray-950 mb-1">
                  {callAnalysis.noteGlobale?.total ?? '—'}/100
                </div>
                {callAnalysis.noteGlobale && (
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-green-600 h-1 rounded-full transition-all"
                      style={{ width: `${callAnalysis.noteGlobale.total}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Presentation className="h-5 w-5 text-cyan-600 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-600 mb-0.5">Pitch</div>
                {callAnalysis.pitch_effectue !== undefined ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      {callAnalysis.pitch_effectue ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-semibold ${callAnalysis.pitch_effectue ? 'text-green-700' : 'text-red-600'}`}>
                        {callAnalysis.pitch_effectue ? 'Effectué' : 'Non effectué'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">—</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-600 mb-0.5">Objections</div>
                <div className="text-lg font-semibold text-gray-950">
                  {callAnalysis.objections_lead?.filter(obj => obj.resolue).length ?? 0}
                  <span className="text-sm text-gray-600">
                    /{callAnalysis.objections_lead?.length ?? 0}
                  </span>
                </div>
                <div className="text-xs text-gray-500">traitées avec succès</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-indigo-600 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-600 mb-0.5">Qualité du lead</div>
                <div className="text-sm font-semibold text-gray-950">
                  {callAnalysis.lead_scoring?.qualite ?? '—'}
                </div>
                {callAnalysis.lead_scoring?.score_global && (
                  <div className="text-xs text-gray-500">
                    Score: {callAnalysis.lead_scoring.score_global}/10
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Second Row - Editable Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all">
              <Phone className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600 mb-1">Vente effectuée</div>
                <SaleStatusToggle
                  callAnalysisId={callId}
                  initialStatus={callAnalysis.venteEffectuee}
                  canEdit={canEditSaleStatus}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all">
              <UserX className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-600 mb-1">No-show</div>
                <NoShowToggle
                  callAnalysisId={callId}
                  initialStatus={callAnalysis.no_show || false}
                  initialReason={callAnalysis.raison_no_show}
                  canEdit={canEditSaleStatus}
                />
              </div>
            </div>

            <DealProductEditor
              callAnalysisId={callId}
              initialValue={callAnalysis.dealValue}
              initialProductId={callAnalysis.productId?.toString()}
              canEdit={canEditSaleStatus}
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts: Talk Time Distribution + Evaluation Scores */}
      <CallPerformanceChart
        closeurPercentage={talkTimeRatio.closeur}
        clientPercentage={talkTimeRatio.client}
        evaluationCompetences={callAnalysis.evaluationCompetences || []}
        callDuration={callAnalysis.dureeAppel}
      />

      {/* Call Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-950">Résumé de l&apos;appel</CardTitle>
          <CardDescription className="text-gray-800">
            Vue d&apos;ensemble de la conversation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {callAnalysis.resume_de_lappel}
          </p>
        </CardContent>
      </Card>

      {/* Performance Highlights - Partie Excellente & À Travailler */}
      {(callAnalysis.partie_excellente || callAnalysis.partie_a_travailler) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Partie Excellente */}
          {callAnalysis.partie_excellente && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  <Star className="h-5 w-5 text-emerald-600 fill-emerald-600" />
                  Point fort du closeur
                </CardTitle>
                <CardDescription className="text-emerald-700">
                  L&apos;aspect le plus réussi de cet appel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 leading-relaxed">
                  {callAnalysis.partie_excellente}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Partie À Travailler */}
          {callAnalysis.partie_a_travailler && (
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Target className="h-5 w-5 text-amber-600" />
                  Axe de progression principal
                </CardTitle>
                <CardDescription className="text-amber-700">
                  Le point prioritaire à améliorer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 leading-relaxed">
                  {callAnalysis.partie_a_travailler}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Objections Details */}
      {callAnalysis.objections_lead && callAnalysis.objections_lead.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Détails des objections ({callAnalysis.objections_lead.length})
            </CardTitle>
            <CardDescription className="text-gray-800">
              Analyse des objections soulevées pendant l&apos;appel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {callAnalysis.objections_lead.map((objection, index) => (
                <div
                  key={`objection-${index}`}
                  className={`p-4 rounded-lg border ${
                    objection.resolue
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {objection.resolue ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <h5 className="text-sm font-semibold text-gray-950">
                          {objection.objection}
                        </h5>
                      </div>
                      {objection.type_objection && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            objection.resolue
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-red-100 text-red-700 border-red-300'
                          }`}
                        >
                          {objection.type_objection}
                        </Badge>
                      )}
                    </div>
                    {objection.timestamp && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="h-3 w-3" />
                        {objection.timestamp}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {objection.traitement && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-950">Traitement: </span>
                        <span className="text-gray-700">{objection.traitement}</span>
                      </div>
                    )}
                    {objection.commentaire && (
                      <div className="text-sm bg-white p-3 rounded border border-gray-200">
                        <span className="font-medium text-gray-950">Commentaire: </span>
                        <span className="text-gray-700">{objection.commentaire}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Badge
                      variant={objection.resolue ? 'default' : 'secondary'}
                      className={
                        objection.resolue
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }
                    >
                      {objection.resolue ? 'Résolue' : 'Non résolue'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evaluation by Steps - Collapsible */}
      <CollapsibleEvaluation evaluationCompetences={callAnalysis.evaluationCompetences || []} />

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        {callAnalysis.resumeForces?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-950">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Points forts identifiés
              </CardTitle>
              <CardDescription className="text-gray-800">
                Les aspects positifs de l&apos;appel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {callAnalysis.resumeForces.map((item, index) => (
                  <div
                    key={`force-${index}`}
                    className="p-4 bg-green-50 rounded-lg border border-green-200"
                  >
                    <p className="text-sm text-gray-950">{item.pointFort}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Improvements */}
        {callAnalysis.axesAmelioration?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-950">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Axes d&apos;amélioration
              </CardTitle>
              <CardDescription className="text-gray-800">
                Suggestions pour améliorer les performances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {callAnalysis.axesAmelioration.map((item, index) => (
                  <div
                    key={`axe-${index}`}
                    className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <h5 className="text-sm font-semibold text-gray-950 mb-2">
                      {item.axeAmelioration}
                    </h5>
                    <p className="text-xs text-gray-700 mb-2">
                      <span className="font-medium">Suggestion:</span> {item.suggestion}
                    </p>
                    {item.exemple_issu_de_lappel && (
                      <p className="text-xs text-gray-600 mb-1">
                        <span className="font-medium">Exemple:</span> {item.exemple_issu_de_lappel}
                      </p>
                    )}
                    {item.alternative && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Alternative:</span> {item.alternative}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Custom Criteria Analysis */}
      <CustomCriteriaAnalysis
        callAnalysisId={callId}
        existingResults={callAnalysis.customCriteriaResults}
        isAdmin={currentUser.isAdmin || currentUser.isSuperAdmin}
      />

      {/* Additional Comments and Next Steps */}
      {(callAnalysis.commentairesSupplementaires?.feedbackGeneral ||
        callAnalysis.commentairesSupplementaires?.prochainesEtapes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-950">Commentaires supplémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {callAnalysis.commentairesSupplementaires?.feedbackGeneral && (
              <div>
                <h4 className="text-sm font-semibold text-gray-950 mb-2">Feedback général</h4>
                <p className="text-sm text-gray-700">
                  {callAnalysis.commentairesSupplementaires.feedbackGeneral}
                </p>
              </div>
            )}
            {callAnalysis.commentairesSupplementaires?.prochainesEtapes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-950 mb-2">Prochaines étapes</h4>
                <p className="text-sm text-gray-700">
                  {callAnalysis.commentairesSupplementaires.prochainesEtapes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      
    </div>
  )
}
