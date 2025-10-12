'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Share2, Copy, Check, Lock, Unlock, Loader2 } from 'lucide-react'
import { toggleCallAnalysisShare } from '@/app/actions/call-analysis'
import { useRouter } from 'next/navigation'

interface CallAnalysisShareButtonProps {
  callId: string
  isPublic?: boolean
  shareToken?: string
}

export function CallAnalysisShareButton({
  callId,
  isPublic = false,
  shareToken,
}: CallAnalysisShareButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentlyPublic, setCurrentlyPublic] = useState(isPublic)
  const [currentShareToken, setCurrentShareToken] = useState(shareToken)

  const shareUrl = currentShareToken
    ? `${window.location.origin}/share/call-analysis/${currentShareToken}`
    : ''

  const handleToggleShare = async () => {
    setLoading(true)
    try {
      const updatedAnalysis = await toggleCallAnalysisShare(callId)
      setCurrentlyPublic(updatedAnalysis.isPublic || false)
      setCurrentShareToken(updatedAnalysis.shareToken)
      router.refresh()
    } catch (error) {
      console.error('Error toggling share:', error)
      alert('Erreur lors du partage de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Error copying to clipboard:', error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Partager
          {currentlyPublic && (
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
              Public
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager l&apos;analyse d&apos;appel</DialogTitle>
          <DialogDescription>
            {currentlyPublic
              ? 'Cette analyse est actuellement publique. Copiez le lien ci-dessous pour la partager.'
              : 'Rendez cette analyse publique pour la partager avec d\'autres personnes.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Toggle Share Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {currentlyPublic ? (
                <>
                  <div className="p-2 bg-green-100 rounded-full">
                    <Unlock className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Partage activé</p>
                    <p className="text-xs text-gray-600">
                      Accessible via un lien public
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 bg-gray-200 rounded-full">
                    <Lock className="h-4 w-4 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Partage désactivé</p>
                    <p className="text-xs text-gray-600">
                      Visible uniquement par vous
                    </p>
                  </div>
                </>
              )}
            </div>
            <Button
              variant={currentlyPublic ? 'destructive' : 'default'}
              size="sm"
              onClick={handleToggleShare}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : currentlyPublic ? (
                'Désactiver'
              ) : (
                'Activer'
              )}
            </Button>
          </div>

          {/* Share Link */}
          {currentlyPublic && shareUrl && (
            <div className="space-y-2">
              <Label htmlFor="share-link">Lien de partage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="share-link"
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                Toute personne disposant de ce lien pourra voir cette analyse en lecture seule.
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>Note:</strong> Les personnes avec le lien pourront voir toutes les
              informations de l&apos;analyse, y compris les scores et commentaires. Elles ne
              pourront pas modifier les données.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
