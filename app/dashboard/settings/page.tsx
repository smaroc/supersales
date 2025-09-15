'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings, Video, FileText, Zap, Save, TestTube, AlertCircle, Database, Users } from 'lucide-react'
import Link from 'next/link'
import { seedHeadOfSalesData } from '@/app/actions/seed-head-of-sales'

// Get the base URL from environment or window location
const getWebhookBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXTAUTH_URL || 'https://yourapp.com'
}

const integrations = [
  {
    id: 'zoom',
    name: 'Zoom',
    icon: Video,
    description: 'Connect your Zoom account to automatically transcribe meetings',
    status: 'disconnected',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', readonly: true, value: `${getWebhookBaseUrl()}/api/webhooks/zoom` }
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
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', readonly: true, value: `${getWebhookBaseUrl()}/api/webhooks/fathom` }
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
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', readonly: true, value: `${getWebhookBaseUrl()}/api/webhooks/fireflies` }
    ]
  }
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('zoom')
  const [configurations, setConfigurations] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [seedingData, setSeedingData] = useState(false)

  const handleInputChange = (integrationId: string, field: string, value: string) => {
    setConfigurations(prev => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        [field]: value
      }
    }))
  }

  const handleSave = async (integrationId: string) => {
    setLoading(prev => ({ ...prev, [integrationId]: true }))
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configurations[integrationId] || {}),
      })

      if (response.ok) {
        // Handle success
        console.log(`${integrationId} configuration saved`)
      } else {
        // Handle error
        console.error(`Failed to save ${integrationId} configuration`)
      }
    } catch (error) {
      console.error(`Error saving ${integrationId} configuration:`, error)
    } finally {
      setLoading(prev => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleTest = async (integrationId: string) => {
    setTesting(prev => ({ ...prev, [integrationId]: true }))
    try {
      const response = await fetch(`/api/integrations/${integrationId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configurations[integrationId] || {}),
      })

      if (response.ok) {
        console.log(`${integrationId} connection test successful`)
      } else {
        console.error(`${integrationId} connection test failed`)
      }
    } catch (error) {
      console.error(`Error testing ${integrationId} connection:`, error)
    } finally {
      setTesting(prev => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleSeedData = async () => {
    setSeedingData(true)
    try {
      await seedHeadOfSalesData()
      alert('Données Head of Sales initialisées avec succès!')
    } catch (error) {
      console.error('Error seeding data:', error)
      alert('Erreur lors de l\'initialisation des données')
    } finally {
      setSeedingData(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Head of Sales Data Initialization */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6" />
            <div>
              <CardTitle>Initialisation Head of Sales</CardTitle>
              <CardDescription>
                Créer des données de démonstration pour tester le dashboard Head of Sales
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Que va faire cette initialisation ?
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Créer les types d'appels par défaut (PROSPECT, R1, R2, R3)</li>
                  <li>• Ajouter 3 commerciaux de démonstration</li>
                  <li>• Générer des évaluations d'appels des 30 derniers jours</li>
                  <li>• Mettre à jour votre rôle vers "Head of Sales"</li>
                </ul>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleSeedData} 
            disabled={seedingData}
            className="flex items-center space-x-2"
          >
            <Database className="h-4 w-4" />
            <span>{seedingData ? 'Initialisation...' : 'Initialiser les données Head of Sales'}</span>
          </Button>
        </CardContent>
      </Card>

      {/* User Management - Admin Only */}
      {(session?.user?.role === 'admin' || session?.user?.role === 'owner') && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6" />
              <div>
                <CardTitle>Gestion des utilisateurs</CardTitle>
                <CardDescription>
                  Ajouter et gérer les utilisateurs de l'organisation (Admin uniquement)
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

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Integrations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {integrations.map((integration) => (
                  <button
                    key={integration.id}
                    onClick={() => setActiveTab(integration.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${
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
                    <integration.icon className="h-6 w-6" />
                    <div>
                      <CardTitle>{integration.name} Integration</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Configuration Fields */}
                  <div className="grid gap-4">
                    {integration.fields.map((field) => (
                      <div key={field.key} className="grid gap-2">
                        <Label htmlFor={`${integration.id}-${field.key}`}>
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
                          className={field.readonly ? 'bg-gray-50 dark:bg-gray-800' : ''}
                        />
                        {field.readonly && (
                          <p className="text-xs text-gray-500">
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
        <li>5. Subscribe to "Recording Completed" events</li>
      </ul>
    ),
    fathom: (
      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
        <li>1. Log into your Fathom.video account</li>
        <li>2. Go to Settings → API & Integrations</li>
        <li>3. Generate an API key and copy it above</li>
        <li>4. Set up a webhook pointing to the webhook URL above</li>
        <li>5. Configure to trigger on "Recording processed" events</li>
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