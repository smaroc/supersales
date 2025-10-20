'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface EvaluationCompetence {
  etapeProcessus: string
  evaluation: number
  temps_passe: number
  temps_passe_mm_ss: string
  timestamps: string
  commentaire: string
  validation: boolean
}

interface CollapsibleEvaluationProps {
  evaluationCompetences: EvaluationCompetence[]
}

export function CollapsibleEvaluation({ evaluationCompetences }: CollapsibleEvaluationProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!evaluationCompetences || evaluationCompetences.length === 0) {
    return null
  }

  return (
    <Card className="bg-gray-50 border border-gray-200">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-gray-950">Évaluation par étape du processus</CardTitle>
              <CardDescription className="text-gray-800">
                Détail des compétences évaluées à chaque étape
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0 text-gray-800">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-4">
              {evaluationCompetences.map((item, index) => (
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
