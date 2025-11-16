'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  isDeleting?: boolean
  variant?: 'danger' | 'warning'
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Êtes-vous absolument sûr ?",
  description = "Cette action est irréversible. Les données supprimées ne pourront pas être récupérées.",
  confirmText = "Supprimer",
  cancelText = "Annuler",
  isDeleting = false,
  variant = 'danger'
}: DeleteConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-gray-200 bg-white sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-full ${variant === 'danger' ? 'bg-red-50' : 'bg-amber-50'}`}>
              <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
            <div className="flex-1 pt-0.5">
              <DialogTitle className="text-gray-950 text-lg font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-sm mt-2 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-6 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className={`${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            } disabled:opacity-50`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
