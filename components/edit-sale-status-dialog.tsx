'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { updateCallAnalysisSaleStatus } from '@/app/actions/call-analysis'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface EditSaleStatusDialogProps {
  callAnalysisId: string
  prospect: string
  initialStatus: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSaleStatusDialog({
  callAnalysisId,
  prospect,
  initialStatus,
  open,
  onOpenChange,
}: EditSaleStatusDialogProps) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSave = async () => {
    setIsUpdating(true)
    try {
      const result = await updateCallAnalysisSaleStatus(callAnalysisId, status)

      if (result.success) {
        toast.success(result.message)
        router.refresh()
        onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le statut de vente</DialogTitle>
          <DialogDescription>
            Modifier le statut de vente pour l&apos;appel avec <strong>{prospect}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between space-x-4">
            <Label htmlFor="sale-status" className="text-sm font-medium">
              Vente effectuée
            </Label>
            <Switch
              id="sale-status"
              checked={status}
              onCheckedChange={setStatus}
              disabled={isUpdating}
              className="data-[state=checked]:bg-green-600"
            />
          </div>
          <div className="text-sm text-gray-600">
            {status ? (
              <p className="text-green-700">✓ Vente marquée comme effectuée</p>
            ) : (
              <p className="text-gray-500">✗ Aucune vente</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Annuler
          </Button>
          <Button type="button" onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
