'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <Card className={`${isOpen ? 'border border-gray-200' : 'border-2 border-gray-500 border-dashed'} border-2 hover:border-gray-600 hover:scale-[1.02] hover:shadow-lg transition-all duration-200 ease-out`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center justify-between pb-4">
              <div className="flex-1">
                <CardTitle className="text-gray-900">Évaluation par étape du processus</CardTitle>
                <CardDescription className="text-gray-600">
                  Détail des compétences évaluées à chaque étape
                </CardDescription>
              </div>
              <div className="text-gray-600 hover:text-gray-900 transition-colors">
                {isOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-3">
              {evaluationCompetences.map((item, index) => (
                <div
                  key={`${item.etapeProcessus}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:bg-gray-50/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-base font-semibold text-gray-900">
                          {item.etapeProcessus}
                        </h4>
                        {item.validation ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{item.commentaire || 'Pas de commentaire'}</p>
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
                      <span className="text-xs text-gray-500">{item.temps_passe_mm_ss}</span>
                    </div>
                  </div>
                  {item.timestamps && (
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                      <span className="font-medium text-gray-600">Timestamps:</span> {item.timestamps}
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
