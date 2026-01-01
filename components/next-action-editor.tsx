'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { updateCallAnalysisNextAction, NextActionType } from '@/app/actions/call-analysis'
import { useRouter } from 'next/navigation'

const NEXT_ACTION_OPTIONS: { value: NextActionType; label: string; description: string; color: string }[] = [
  { value: 'deposit', label: 'Acompte', description: 'Le client doit verser un acompte', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'split_paiement', label: 'Paiement fractionné', description: 'Paiement en plusieurs fois', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'pif', label: 'PIF', description: 'Paiement Immédiat et Final', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'r2_decision', label: 'R2 Décision', description: 'Relance 2 - En attente de décision', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'perdu', label: 'Perdu', description: 'Opportunité perdue', color: 'bg-red-100 text-red-700 border-red-300' },
]

interface NextActionEditorProps {
  callAnalysisId: string
  initialValue?: NextActionType
  canEdit: boolean
}

export function NextActionEditor({ callAnalysisId, initialValue, canEdit }: NextActionEditorProps) {
  const router = useRouter()
  const [value, setValue] = useState<NextActionType>(initialValue || null)
  const [isLoading, setIsLoading] = useState(false)

  const selectedOption = NEXT_ACTION_OPTIONS.find(opt => opt.value === value)

  const handleChange = async (newValue: string) => {
    const nextAction = newValue === 'none' ? null : (newValue as NextActionType)

    setIsLoading(true)
    try {
      const result = await updateCallAnalysisNextAction(callAnalysisId, nextAction)

      if (result.success) {
        setValue(nextAction)
        toast.success('Prochaine action mise à jour')
        router.refresh()
      } else {
        toast.error(result.message || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Error updating next action:', error)
      toast.error('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  if (!canEdit) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
        <ArrowRight className="h-5 w-5 text-indigo-600 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-xs text-gray-700 mb-0.5">Prochaine action</div>
          {selectedOption ? (
            <div className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${selectedOption.color}`}>
              {selectedOption.label}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">Non définie</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
      <ArrowRight className="h-5 w-5 text-indigo-600 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-xs text-gray-700 mb-1">Prochaine action</div>
        <Select
          value={value || 'none'}
          onValueChange={handleChange}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white truncate">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-sm">Mise à jour...</span>
              </div>
            ) : (
              <SelectValue placeholder="Sélectionner une action..." />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" textValue="Aucune action définie">
              <span className="text-gray-600 italic">Aucune action définie</span>
            </SelectItem>
            {NEXT_ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value || 'none'} textValue={option.label}>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{option.label}</span>
                  <span className="text-xs text-gray-600">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
