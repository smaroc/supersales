'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Settings, Video, FileText, Zap, Save, TestTube, AlertCircle, Users, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import {
  saveIntegrationConfiguration,
  testIntegrationConnection
} from '@/app/actions/integrations'
import { AnalysisPromptEditor } from '@/components/analysis-prompt-editor'

// Get the base URL from environment or window location
const getWebhookBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXTAUTH_URL || 'https://yourapp.com'
}

const getIntegrationsConfig = (userId: string | null) => [
  {
    id: 'zoom',
    name: 'Zoom',
    icon: Video,
    description: 'Connect your Zoom account to automatically transcribe meetings',
    status: 'disconnected',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'webhookUrl', label: 'Personal Webhook URL', type: 'text', readonly: true, value: userId ? `${getWebhookBaseUrl()}/api/webhooks/zoom/${userId}` : '' }
    ]
  },
  {
    id: 'fathom',
    name: 'Fathom.video',
    icon: FileText,
    description: 'Import recordings and transcripts from Fathom.video',
    status: 'disconnected',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: true },
      { key: 'webhookUrl', label: 'Personal Webhook URL', type: 'text', readonly: true, value: userId ? `${getWebhookBaseUrl()}/api/webhooks/fathom/${userId}` : '' }
    ]
  },
  {
    id: 'fireflies',
    name: 'Fireflies.ai',
    icon: Zap,
    description: 'Sync call recordings and transcripts from Fireflies.ai',
    status: 'disconnected',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'workspaceId', label: 'Workspace ID', type: 'text', required: true },
      { key: 'webhookUrl', label: 'Personal Webhook URL', type: 'text', readonly: true, value: userId ? `${getWebhookBaseUrl()}/api/webhooks/fireflies/${userId}` : '' }
    ]
  }
]

export default function SettingsPage() {
  const { user, isLoaded } = useUser()
  const [mainSection, setMainSection] = useState<'webhooks' | 'prompts' | 'criteria'>('webhooks')
  const [activeTab, setActiveTab] = useState('zoom')
  const [configurations, setConfigurations] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [integrations, setIntegrations] = useState(getIntegrationsConfig(null))
  const [userData, setUserData] = useState<any>(null)
  const [customCriteria, setCustomCriteria] = useState<Array<{id: string, title: string, description: string, createdAt: Date}>>([])
  const [newCriteriaTitle, setNewCriteriaTitle] = useState('')
  const [newCriteriaDescription, setNewCriteriaDescription] = useState('')
  const [savingCriteria, setSavingCriteria] = useState(false)
  const [autoRunCustomCriteria, setAutoRunCustomCriteria] = useState(false)

  // Update integrations when user is loaded
  useEffect(() => {
    if (isLoaded && user) {
      setIntegrations(getIntegrationsConfig(user.id))
    }
  }, [isLoaded, user])

  // Fetch user data to check super admin status
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return

      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const data = await response.json()
          setUserData(data.user)
          // Load custom criteria if available
          if (data.user?.customAnalysisCriteria) {
            setCustomCriteria(data.user.customAnalysisCriteria)
          }
          // Load auto-run preference
          setAutoRunCustomCriteria(data.user?.autoRunCustomCriteria || false)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    if (isLoaded && user) {
      fetchUserData()
    }
  }, [user, isLoaded])

  const handleInputChange = (integrationId: string, field: string, value: string) => {
    setConfigurations(prev => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        [field]: value
      }
    }))
  }

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value)
    
  }

  const handleSave = async (integrationId: string) => {
    setLoading(prev => ({ ...prev, [integrationId]: true }))
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined
      await saveIntegrationConfiguration(integrationId, configurations[integrationId] || {}, origin)
      console.log(`${integrationId} configuration saved`)
    } catch (error) {
      console.error(`Error saving ${integrationId} configuration:`, error)
    } finally {
      setLoading(prev => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleTest = async (integrationId: string) => {
    setTesting(prev => ({ ...prev, [integrationId]: true }))
    try {
      const result = await testIntegrationConnection(integrationId, configurations[integrationId] || {})
      if (result.success) {
        console.log(`${integrationId} connection test successful`)
      } else {
        console.error(`${integrationId} connection test failed:`, result.message)
      }
    } catch (error) {
      console.error(`Error testing ${integrationId} connection:`, error)
    } finally {
      setTesting(prev => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleAddCriteria = async () => {
    if (!newCriteriaTitle.trim() || !newCriteriaDescription.trim()) {
      alert('Please fill in both title and description')
      return
    }

    setSavingCriteria(true)
    try {
      const newCriteria = {
        id: Date.now().toString(),
        title: newCriteriaTitle,
        description: newCriteriaDescription,
        createdAt: new Date()
      }

      const updatedCriteria = [...customCriteria, newCriteria]

      const response = await fetch('/api/users/custom-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: updatedCriteria,
          autoRunCustomCriteria
        })
      })

      if (response.ok) {
        setCustomCriteria(updatedCriteria)
        setNewCriteriaTitle('')
        setNewCriteriaDescription('')
      } else {
        console.error('Failed to save criteria')
      }
    } catch (error) {
      console.error('Error saving criteria:', error)
    } finally {
      setSavingCriteria(false)
    }
  }

  const handleToggleAutoRun = async (enabled: boolean) => {
    setAutoRunCustomCriteria(enabled)
    setSavingCriteria(true)
    try {
      const response = await fetch('/api/users/custom-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: customCriteria,
          autoRunCustomCriteria: enabled
        })
      })

      if (!response.ok) {
        console.error('Failed to update auto-run preference')
        setAutoRunCustomCriteria(!enabled) // Revert on error
      }
    } catch (error) {
      console.error('Error updating auto-run preference:', error)
      setAutoRunCustomCriteria(!enabled) // Revert on error
    } finally {
      setSavingCriteria(false)
    }
  }

  const handleDeleteCriteria = async (criteriaId: string) => {
    setSavingCriteria(true)
    try {
      const updatedCriteria = customCriteria.filter(c => c.id !== criteriaId)

      const response = await fetch('/api/users/custom-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: updatedCriteria,
          autoRunCustomCriteria
        })
      })

      if (response.ok) {
        setCustomCriteria(updatedCriteria)
      } else {
        console.error('Failed to delete criteria')
      }
    } catch (error) {
      console.error('Error deleting criteria:', error)
    } finally {
      setSavingCriteria(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Main Section Tabs */}
        <div className="flex space-x-2 border rounded-lg p-1 bg-gray-50">
          <button
            onClick={() => setMainSection('webhooks')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainSection === 'webhooks'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Webhooks</span>
            </div>
          </button>
          <button
            onClick={() => setMainSection('prompts')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainSection === 'prompts'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>AI Configuration</span>
            </div>
          </button>
          {(userData?.isAdmin || userData?.isSuperAdmin) && (
            <button
              onClick={() => setMainSection('criteria')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mainSection === 'criteria'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Custom Criteria</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* User Management - Admin Only (Always visible) */}
      {(user?.publicMetadata?.role === 'admin' || user?.publicMetadata?.role === 'owner') && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6" />
              <div>
                <CardTitle className='text-gray-950'>Gestion des utilisateurs</CardTitle>
                <CardDescription className='text-gray-800'>
                  Ajouter et gérer les utilisateurs de l&apos;organisation (Admin uniquement)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg mb-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                    Fonctionnalités disponibles
                  </h4>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                    <li>• Créer de nouveaux utilisateurs avec email et rôle</li>
                    <li>• Affecter des rôles : Commercial, Manager, Head of Sales, Admin</li>
                    <li>• Gérer les permissions automatiquement selon le rôle</li>
                    <li>• Modifier ou désactiver des utilisateurs existants</li>
                  </ul>
                </div>
              </div>
            </div>
            <Link href="/dashboard/settings/users">
              <Button className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Gérer les utilisateurs</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Webhooks Section */}
      {mainSection === 'webhooks' && (
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-950">Integrations</CardTitle>
              </CardHeader>
              <CardContent className="p-0 ">
                <div className="space-y-1">
                  {integrations.map((integration) => (
                    <button
                      key={integration.id}
                      onClick={() => setActiveTab(integration.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 ${
                        activeTab === integration.id ? 'bg-gray-50 dark:bg-gray-800 border-r-2 border-primary' : ''
                      }`}
                    >
                      <integration.icon className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{integration.name}</p>
                        <Badge
                          variant={integration.status === 'connected' ? 'default' : 'secondary'}
                          className="text-xs mt-1"
                        >
                          {integration.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {integrations.map((integration) => (
              <div key={integration.id} className={activeTab === integration.id ? 'block' : 'hidden'}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <integration.icon className="h-6 w-6 text-gray-950" />
                      <div>
                        <CardTitle className="text-gray-950">{integration.name} Integration</CardTitle>
                        <CardDescription className="text-gray-800">{integration.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Configuration Fields */}
                    <div className="grid gap-4">
                      {integration.fields.map((field) => (
                        <div key={field.key} className="grid gap-2">
                          <Label className='text-gray-800' htmlFor={`${integration.id}-${field.key}`}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Input
                            id={`${integration.id}-${field.key}`}
                            type={field.type}
                            placeholder={field.readonly ? '' : `Enter ${field.label.toLowerCase()}`}
                            value={field.value || configurations[integration.id]?.[field.key] || ''}
                            onChange={(e) => handleInputChange(integration.id, field.key, e.target.value)}
                            readOnly={field.readonly}
                            className={field.readonly ? 'bg-gray-800 dark:bg-gray-800 cursor-pointer' : ''}
                            onClick={field.readonly ? (field.value ? () => handleCopy(field.value) : undefined) : undefined}
                          />
                          {field.readonly && (
                            <p className="text-xs text-gray-600">
                              Use this URL in your {integration.name} webhook configuration
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Setup Instructions */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Setup Instructions for {integration.name}
                          </h4>
                          <SetupInstructions integrationId={integration.id} />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4 border-t">
                      <Button
                        onClick={() => handleTest(integration.id)}
                        variant="outline"
                        disabled={testing[integration.id]}
                        className="flex items-center space-x-2"
                      >
                        <TestTube className="h-4 w-4" />
                        <span>{testing[integration.id] ? 'Testing...' : 'Test Connection'}</span>
                      </Button>
                      <Button
                        onClick={() => handleSave(integration.id)}
                        disabled={loading[integration.id]}
                        className="flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>{loading[integration.id] ? 'Saving...' : 'Save Configuration'}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Prompts Section */}
      {mainSection === 'prompts' && (
        <AnalysisPromptEditor isSuperAdmin={userData?.isSuperAdmin || false} />
      )}

      {/* Custom Criteria Section */}
      {mainSection === 'criteria' && (userData?.isAdmin || userData?.isSuperAdmin) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-950">Custom Analysis Criteria</CardTitle>
            <CardDescription className="text-gray-800">
              Define custom criteria to analyze in your sales calls. These will be used to provide additional insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Criteria Form */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Add New Criteria</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="criteria-title" className="text-gray-800">Title</Label>
                  <Input
                    id="criteria-title"
                    className="text-gray-800"
                    placeholder="e.g., Product Knowledge, Objection Handling"
                    value={newCriteriaTitle}
                    onChange={(e) => setNewCriteriaTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="criteria-description" className="text-gray-800">
                    Description / Analysis Prompt
                  </Label>
                  <textarea
                    id="criteria-description"
                    className="text-gray-800 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="e.g., Analyze how well the sales rep demonstrated knowledge of the product features and benefits. Look for specific examples where they explained technical details or use cases."
                    value={newCriteriaDescription}
                    onChange={(e) => setNewCriteriaDescription(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddCriteria}
                  disabled={savingCriteria || !newCriteriaTitle.trim() || !newCriteriaDescription.trim()}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {savingCriteria ? 'Adding...' : 'Add Criteria'}
                </Button>
              </div>
            </div>

            {/* Auto-run Toggle */}
            {customCriteria.length > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      Analyse automatique après chaque appel
                    </h3>
                    <p className="text-xs text-gray-600">
                      Quand activé, vos critères personnalisés seront automatiquement analysés après chaque nouvelle analyse d&apos;appel
                    </p>
                  </div>
                  <Switch
                    checked={autoRunCustomCriteria}
                    onCheckedChange={handleToggleAutoRun}
                    disabled={savingCriteria}
                  />
                </div>
              </div>
            )}

            {/* Existing Criteria List */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Your Custom Criteria</h3>
              {customCriteria.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No custom criteria defined yet. Add your first one above.
                </div>
              ) : (
                <div className="space-y-3">
                  {customCriteria.map((criteria) => (
                    <Card key={criteria.id} className="bg-white">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <h4 className="font-medium text-gray-900">{criteria.title}</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{criteria.description}</p>
                            <p className="text-xs text-gray-500">
                              Created: {new Date(criteria.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCriteria(criteria.id)}
                            disabled={savingCriteria}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SetupInstructions({ integrationId }: { integrationId: string }) {
  const instructions = {
    zoom: (
      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
        <li>1. Go to Zoom Marketplace and create a new OAuth app</li>
        <li>2. Set the redirect URL to your application domain</li>
        <li>3. Copy the Client ID and Client Secret to the fields above</li>
        <li>4. Configure the webhook URL in your Zoom app settings</li>
        <li>5. Subscribe to &quot;Recording Completed&quot; events</li>
      </ul>
    ),
    fathom: (
      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
        <li>1. Log into your Fathom.video account</li>
        <li>2. Go to Settings → API & Integrations</li>
        <li>3. Generate an API key and copy it above</li>
        <li>4. Set up a webhook pointing to the webhook URL above</li>
        <li>5. Configure to trigger on &quot;Recording processed&quot; events</li>
      </ul>
    ),
    fireflies: (
      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
        <li>1. Access your Fireflies.ai workspace settings</li>
        <li>2. Navigate to API section and generate an API key</li>
        <li>3. Copy your Workspace ID from the URL or settings</li>
        <li>4. Configure webhook endpoint to receive transcription updates</li>
        <li>5. Enable automatic sync for new recordings</li>
      </ul>
    ),
  }

  return instructions[integrationId as keyof typeof instructions] || null
}
