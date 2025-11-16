'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit2, Check, X, Loader2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { updateDealValue } from '@/app/actions/call-analysis'

interface DealValueEditorProps {
  callAnalysisId: string
  initialValue?: number
  canEdit: boolean
}

export function DealValueEditor({ callAnalysisId, initialValue, canEdit }: DealValueEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue?.toString() || '0')
  const [isLoading, setIsLoading] = useState(false)

  const formatValue = (val?: number) => {
    if (!val) return '—'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const numericValue = value && value.trim() !== '' ? parseFloat(value.replace(/[^\d.-]/g, '')) : 0
      const result = await updateDealValue(callAnalysisId, numericValue)
      
      if (result.success) {
        toast.success('Montant du deal mis à jour')
        setIsEditing(false)
      } else {
        toast.error(result.message || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Error updating deal value:', error)
      toast.error('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setValue(initialValue?.toString() || '0')
    setIsEditing(false)
  }

  if (!canEdit) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
        <DollarSign className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-xs text-gray-600 mb-0.5">Montant du deal</div>
          <div className="text-lg font-semibold text-gray-950">
            {formatValue(initialValue)}
          </div>
        </div>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-emerald-400 bg-white shadow-sm">
        <DollarSign className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="text-xs text-gray-600 font-medium">Montant du deal</div>
          <div className="relative">
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="text-lg text-gray-800 font-semibold pr-8 h-9 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={isLoading}
              autoFocus
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave()
                } else if (e.key === 'Escape') {
                  handleCancel()
                }
              }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-medium">€</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Sauver
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="h-7 text-xs text-gray-800 border-gray-300 hover:bg-gray-50"
            >
              <X className="h-3 w-3 mr-1" />
              Annuler
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer"
      onClick={() => {
        setValue(initialValue?.toString() || '')
        setIsEditing(true)
      }}
    >
      <DollarSign className="h-5 w-5 text-emerald-600 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-xs text-gray-600 mb-0.5">Montant du deal</div>
        <div className="text-lg font-semibold text-gray-950">
          {formatValue(initialValue)}
        </div>
      </div>
      <Edit2 className="h-4 w-4 text-gray-400" />
    </div>
  )
}

