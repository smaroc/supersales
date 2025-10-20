'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, CheckCircle } from 'lucide-react'

interface CustomCriteriaResult {
  criteriaId: string
  criteriaTitle: string
  analysis: string
  score?: number | null
  highlights?: string[]
  analyzedAt: Date
}

interface CustomCriteriaAnalysisProps {
  callAnalysisId: string
  existingResults?: CustomCriteriaResult[]
  isAdmin: boolean
}

export function CustomCriteriaAnalysis({
  callAnalysisId,
  existingResults = [],
  isAdmin
}: CustomCriteriaAnalysisProps) {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<CustomCriteriaResult[]>(existingResults)
  const [error, setError] = useState<string | null>(null)

  const handlePostProcess = async () => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/call-analysis/${callAnalysisId}/post-process`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process custom criteria')
      }

      setResults(data.results)
      // Reload the page to show updated results
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Analyse personnalisée
            </CardTitle>
            <CardDescription className="text-gray-800">
              Analysez cet appel selon vos critères personnalisés
            </CardDescription>
          </div>
          <Button
            onClick={handlePostProcess}
            disabled={processing}
            variant={results.length > 0 ? 'outline' : 'default'}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : results.length > 0 ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Réanalyser
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyser
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {results.length === 0 && !processing && (
          <div className="text-center py-8 text-gray-500">
            <p>Aucune analyse personnalisée disponible.</p>
            <p className="text-sm mt-2">
              Cliquez sur le bouton &quot;Analyser&quot; pour lancer l&apos;analyse selon vos critères personnalisés.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={result.criteriaId}
                className="p-4 bg-purple-50 rounded-lg border border-purple-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-base font-semibold text-gray-950 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                    {result.criteriaTitle}
                  </h4>
                  {result.score !== null && result.score !== undefined && (
                    <Badge
                      variant="outline"
                      className={
                        result.score >= 7
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : result.score >= 5
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }
                    >
                      {result.score}/10
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                  {result.analysis}
                </p>

                {result.highlights && result.highlights.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <h5 className="text-xs font-semibold text-gray-950 mb-2">
                      Points clés identifiés:
                    </h5>
                    <ul className="space-y-1">
                      {result.highlights.map((highlight, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="text-purple-600 mt-0.5">•</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  Analysé le {new Date(result.analyzedAt).toLocaleString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
