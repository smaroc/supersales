import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Phone,
  TrendingUp,
  Clock,
  Mic,
  CheckCircle,
  XCircle,
  User,
  Lock,
  Share2,
  AlertCircle,
  Award,
} from 'lucide-react'
import { getPublicCallAnalysis } from '@/app/actions/call-analysis'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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
  temps_de_parole_closeur: number
  temps_de_parole_client: number
  resume_de_lappel: string
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
  analysisStatus: string
  createdAt?: string
  updatedAt?: string
  isPublic?: boolean
  sharedAt?: string
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

export default async function PublicCallAnalysisPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  let callAnalysis: CallAnalysisDetail
  try {
    callAnalysis = await getPublicCallAnalysis(token)
  } catch (error) {
    console.error('Error loading public call analysis:', error)
    notFound()
  }

  const talkTimeRatio = formatTalkTime(
    callAnalysis.temps_de_parole_closeur || 0,
    callAnalysis.temps_de_parole_client || 0
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-950">Analyse d&apos;appel partagée</h1>
                <p className="text-sm text-gray-600">Vue publique en lecture seule</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              <Lock className="h-3 w-3 mr-1" />
              Lecture seule
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Overview Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-950">
                Analyse complète de l&apos;appel
              </h2>
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

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-950">
                    <User className="h-5 w-5 text-blue-600" />
                    Prospect
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold text-gray-950">{callAnalysis.prospect}</div>
                  <div className="text-sm text-gray-600 mt-1">Closeur: {callAnalysis.closeur}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-950">
                    <Clock className="h-5 w-5 text-purple-600" />
                    Durée
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-gray-950">{callAnalysis.dureeAppel}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-950">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Score global
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-gray-950">
                    {callAnalysis.noteGlobale?.total ?? '—'}/100
                  </div>
                  {callAnalysis.noteGlobale && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${callAnalysis.noteGlobale.total}%` }}
                      ></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-950">
                    <Phone className="h-5 w-5 text-amber-600" />
                    Vente effectuée
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant={callAnalysis.venteEffectuee ? 'default' : 'secondary'}
                    className={
                      callAnalysis.venteEffectuee
                        ? 'bg-green-50 text-green-700 border-green-200 text-lg px-4 py-2'
                        : 'bg-gray-50 text-gray-700 border-gray-200 text-lg px-4 py-2'
                    }
                  >
                    {callAnalysis.venteEffectuee ? 'Oui' : 'Non'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-950">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Objections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-gray-950">
                    {callAnalysis.objections_lead?.filter(obj => obj.resolue).length ?? 0}
                    <span className="text-lg text-gray-600">
                      /{callAnalysis.objections_lead?.length ?? 0}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">traitées avec succès</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-950">
                    <Award className="h-5 w-5 text-indigo-600" />
                    Qualité du lead
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold text-gray-950">
                    {callAnalysis.lead_scoring?.qualite ?? '—'}
                  </div>
                  {callAnalysis.lead_scoring?.score_global && (
                    <div className="text-sm text-gray-600 mt-1">
                      Score: {callAnalysis.lead_scoring.score_global}/10
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Talk Time Ratio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-950">
                <Mic className="h-5 w-5 text-purple-600" />
                Répartition du temps de parole
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Closeur</span>
                    <span className="text-sm font-bold text-gray-950">{talkTimeRatio.closeur}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${talkTimeRatio.closeur}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Client</span>
                    <span className="text-sm font-bold text-gray-950">{talkTimeRatio.client}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${talkTimeRatio.client}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Evaluation by Steps */}
          {callAnalysis.evaluationCompetences?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-950">Évaluation par étape du processus</CardTitle>
                <CardDescription className="text-gray-800">
                  Détail des compétences évaluées à chaque étape
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {callAnalysis.evaluationCompetences.map((item, index) => (
                    <div
                      key={`${item.etapeProcessus}-${index}`}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-base font-semibold text-gray-950">
                              {item.etapeProcessus}
                            </h4>
                            {item.validation ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{item.commentaire || 'Pas de commentaire'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <Badge
                            variant="outline"
                            className={
                              item.evaluation >= 7
                                ? 'border-green-300 bg-green-50 text-green-800'
                                : item.evaluation >= 5
                                ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                                : 'border-red-300 bg-red-50 text-red-800'
                            }
                          >
                            {item.evaluation}/10
                          </Badge>
                          <span className="text-xs text-gray-600">{item.temps_passe_mm_ss}</span>
                        </div>
                      </div>
                      {item.timestamps && (
                        <div className="text-xs text-gray-500 mt-2">
                          <span className="font-medium">Timestamps:</span> {item.timestamps}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Additional Comments */}
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
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Cette analyse a été partagée le {formatDate(callAnalysis.sharedAt)}</p>
            <p className="mt-1">Les données affichées sont en lecture seule</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
