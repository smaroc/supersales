'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Save, RotateCcw, AlertCircle, FileText, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getAnalysisPrompt,
  updateAnalysisPrompt,
  resetAnalysisPrompt
} from '@/app/actions/organization'
import { DEFAULT_ANALYSIS_PROMPT } from '@/lib/constants/analysis-prompts'

// Available OpenAI GPT models that support JSON mode (response_format: json_object)
const GPT_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Recommended)', description: 'Latest, fastest, most capable with JSON mode' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Faster, more affordable with JSON mode' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Reliable with JSON mode support' },
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo Preview', description: 'Preview version with JSON mode' },
  { value: 'gpt-3.5-turbo-1106', label: 'GPT-3.5 Turbo (Nov 2023)', description: 'Cost-effective with JSON mode' },
] as const

export type GPTModel = typeof GPT_MODELS[number]['value']

interface AnalysisPromptEditorProps {
  isSuperAdmin: boolean
}

export function AnalysisPromptEditor({ isSuperAdmin }: AnalysisPromptEditorProps) {
  const [prompt, setPrompt] = useState('')
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [model, setModel] = useState<GPTModel>('gpt-4o')
  const [originalModel, setOriginalModel] = useState<GPTModel>('gpt-4o')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Load the current prompt and model
  useEffect(() => {
    async function loadPrompt() {
      try {
        setLoading(true)
        const result = await getAnalysisPrompt()
        // Result can be just a string (legacy) or an object with prompt and model
        if (typeof result === 'string') {
          setPrompt(result)
          setOriginalPrompt(result)
        } else {
          setPrompt(result.prompt)
          setOriginalPrompt(result.prompt)
          setModel((result.model as GPTModel) || 'gpt-4o')
          setOriginalModel((result.model as GPTModel) || 'gpt-4o')
        }
      } catch (error) {
        console.error('Error loading prompt:', error)
        setMessage({ type: 'error', text: 'Failed to load analysis prompt' })
      } finally {
        setLoading(false)
      }
    }
    loadPrompt()
  }, [])

  // Track changes
  useEffect(() => {
    setHasChanges(prompt !== originalPrompt || model !== originalModel)
  }, [prompt, originalPrompt, model, originalModel])

  const handleSave = async () => {
    if (!isSuperAdmin) {
      setMessage({ type: 'error', text: 'Only super admins can update the prompt' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const result = await updateAnalysisPrompt(prompt, model)
      if (result.success) {
        setMessage({ type: 'success', text: 'AI configuration updated successfully!' })
        setOriginalPrompt(prompt)
        setOriginalModel(model)
        setHasChanges(false)
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (error) {
      console.error('Error saving prompt:', error)
      setMessage({ type: 'error', text: 'Failed to save AI configuration' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!isSuperAdmin) {
      setMessage({ type: 'error', text: 'Only super admins can reset the prompt' })
      return
    }

    if (!confirm('Are you sure you want to reset to default settings? This action cannot be undone.')) {
      return
    }

    setResetting(true)
    setMessage(null)

    try {
      const result = await resetAnalysisPrompt()
      if (result.success) {
        setPrompt(DEFAULT_ANALYSIS_PROMPT)
        setOriginalPrompt(DEFAULT_ANALYSIS_PROMPT)
        setModel('gpt-4o')
        setOriginalModel('gpt-4o')
        setMessage({ type: 'success', text: 'AI configuration reset to default successfully!' })
        setHasChanges(false)
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (error) {
      console.error('Error resetting prompt:', error)
      setMessage({ type: 'error', text: 'Failed to reset AI configuration' })
    } finally {
      setResetting(false)
    }
  }

  const isDefault = prompt === DEFAULT_ANALYSIS_PROMPT

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-gray-700" />
            <div>
              <CardTitle className="text-gray-950">Prompt d'analyse des appels</CardTitle>
              <CardDescription className="text-gray-700">
                Configuration réservée aux Super Admins
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Accès restreint
                </h4>
                <p className="text-sm text-gray-700">
                  Seuls les Super Admins peuvent modifier le prompt d'analyse des appels.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-gray-700" />
            <div>
              <CardTitle className="text-gray-950">Prompt d'analyse des appels</CardTitle>
              <CardDescription className="text-gray-700">
                Personnalisez le prompt utilisé pour analyser les appels avec OpenAI
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isDefault ? 'secondary' : 'default'}>
              {isDefault ? 'Défaut' : 'Personnalisé'}
            </Badge>
            {hasChanges && <Badge variant="outline" className="text-gray-700 border-gray-700">Non sauvegardé</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                À propos de ce prompt
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Ce prompt est envoyé au modèle GPT sélectionné pour analyser chaque appel</li>
                <li>• Le mode JSON garantit une structure de réponse valide et cohérente</li>
                <li>• Les modifications s'appliquent immédiatement aux nouvelles analyses</li>
                <li>• Super Admin uniquement - Impact sur toute l'organisation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' ? 'bg-gray-50 text-gray-800 border-gray-300' :
            message.type === 'error' ? 'bg-gray-50 text-gray-800 border-gray-300' :
            'bg-gray-50 text-gray-800 border-gray-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Configuration Editor */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Model Selector */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm font-medium text-gray-800">
                Modèle GPT
              </Label>
              <Select value={model} onValueChange={(value) => setModel(value as GPTModel)}>
                <SelectTrigger id="model" className="w-full">
                  <SelectValue placeholder="Sélectionner un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {GPT_MODELS.map((gptModel) => (
                    <SelectItem key={gptModel.value} value={gptModel.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{gptModel.label}</span>
                        <span className="text-xs text-gray-500">{gptModel.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                Modèle utilisé pour analyser les appels. Seuls les modèles compatibles avec le mode JSON sont affichés. GPT-4o est recommandé pour la meilleure qualité.
              </p>
            </div>

            {/* Prompt Editor */}
            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium text-gray-800">
                Prompt d'analyse
              </label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={20}
                className="font-mono text-sm text-gray-800"
                placeholder="Entrez le prompt d'analyse..."
              />
              <p className="text-xs text-gray-600">
                {prompt.length} caractères
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Sauvegarder</span>
                  </>
                )}
              </Button>

              <Button
                onClick={handleReset}
                variant="outline"
                disabled={isDefault || resetting}
                className="flex items-center space-x-2"
              >
                {resetting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Réinitialisation...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Réinitialiser par défaut</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
