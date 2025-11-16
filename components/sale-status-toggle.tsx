'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { updateCallAnalysisSaleStatus } from '@/app/actions/call-analysis'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SaleStatusToggleProps {
  callAnalysisId: string
  initialStatus: boolean
  canEdit: boolean
}

export function SaleStatusToggle({ callAnalysisId, initialStatus, canEdit }: SaleStatusToggleProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [status, setStatus] = useState(initialStatus)

  const handleToggle = async (checked: boolean) => {
    if (!canEdit) {
      toast.error('Vous n\'avez pas la permission de modifier ce statut')
      return
    }

    setIsUpdating(true)
    try {
      const result = await updateCallAnalysisSaleStatus(callAnalysisId, checked)

      if (result.success) {
        setStatus(checked)
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error updating sale status:', error)
      toast.error('Erreur lors de la mise à jour du statut')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div 
      className={`flex items-center space-x-2 ${canEdit && !isUpdating ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (canEdit && !isUpdating) {
          handleToggle(!status)
        }
      }}
    >
      <Switch
        id="sale-status"
        checked={status}
        onCheckedChange={handleToggle}
        disabled={!canEdit || isUpdating}
        className="data-[state=checked]:bg-green-600"
        onClick={(e) => e.stopPropagation()}
      />
      <div className={`text-sm font-medium ${!canEdit ? 'text-gray-400' : 'text-gray-700'}`}>
        {isUpdating ? 'Mise à jour...' : status ? 'Vente effectuée' : 'Aucune vente'}
      </div>
    </div>
  )
}
