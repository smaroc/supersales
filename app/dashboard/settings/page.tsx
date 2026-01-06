'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Settings, Video, FileText, Zap, Save, TestTube, AlertCircle, Users, Plus, Trash2, CheckCircle2, XCircle, Download, Palette, CreditCard } from 'lucide-react'
import Link from 'next/link'
import {
  saveIntegrationConfiguration,
  testIntegrationConnection,
  getIntegrationConfigurations,
  importFathomMeetings,
  deleteIntegrationWebhook
} from '@/app/actions/integrations'
import { toast } from 'sonner'
import { AnalysisPromptEditor } from '@/components/analysis-prompt-editor'
import { useImpersonationRefresh } from '@/lib/hooks/use-impersonation-refresh'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from 'next-themes'

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
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false },
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
  },
  {
    id: 'claap',
    name: 'Claap',
    icon: Video,
    description: 'Sync call recordings and transcripts from Claap',
    status: 'disconnected',
    fields: [
      { key: 'apiKey', label: 'API Key (X-Claap-Key)', type: 'password', required: true },
      { key: 'webhookSecret', label: 'Webhook Secret (optional)', type: 'password', required: false },
      { key: 'webhookUrl', label: 'Personal Webhook URL', type: 'text', readonly: true, value: userId ? `${getWebhookBaseUrl()}/api/webhooks/claap/${userId}` : '' }
    ]
  }
]

// Helper function to check if integration is connected based on configuration
const isIntegrationConnected = (integrationId: string, config: Record<string, string> | undefined): boolean => {
  if (!config) return false

  switch (integrationId) {
    case 'zoom':
      return !!(config.clientId && config.clientSecret)
    case 'fathom':
      return !!config.apiKey
    case 'fireflies':
      return !!(config.apiKey && config.workspaceId)
    case 'claap':
      return !!config.apiKey
    default:
      return false
  }
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser()
  const [mainSection, setMainSection] = useState<'webhooks' | 'prompts' | 'criteria' | 'appearance'>('webhooks')
  const [activeTab, setActiveTab] = useState('zoom')
  const [configurations, setConfigurations] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; details?: any; meetings?: any[]; webhookCreated?: boolean; webhookId?: string; webhookError?: string }>>({})
  const [selectedMeetings, setSelectedMeetings] = useState<Record<string, Set<string>>>({})
  const [importingMeetings, setImportingMeetings] = useState<Record<string, boolean>>({})
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [syncResults, setSyncResults] = useState<Record<string, { success: boolean; imported: number; skipped: number; total: number }>>({})
  const [saveResults, setSaveResults] = useState<Record<string, { success: boolean; webhookCreated?: boolean; webhookId?: string }>>({})
  const [deletingWebhook, setDeletingWebhook] = useState<Record<string, boolean>>({})
  const [integrations, setIntegrations] = useState(getIntegrationsConfig(null))
  const [userData, setUserData] = useState<any>(null)
  const [customCriteria, setCustomCriteria] = useState<Array<{id: string, title: string, description: string, createdAt: Date}>>([])
  const [newCriteriaTitle, setNewCriteriaTitle] = useState('')
  const [newCriteriaDescription, setNewCriteriaDescription] = useState('')
  const [savingCriteria, setSavingCriteria] = useState(false)
  const [autoRunCustomCriteria, setAutoRunCustomCriteria] = useState(false)
  const [claapChannels, setClaapChannels] = useState<Array<{id: string, name: string}>>([])
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())
  const [loadingChannels, setLoadingChannels] = useState(false)

  // Update integration statuses based on configurations
  const updateIntegrationStatuses = useCallback((configs: Record<string, Record<string, string>>) => {
    setIntegrations(prev => prev.map(integration => ({
      ...integration,
      status: isIntegrationConnected(integration.id, configs[integration.id]) ? 'connected' : 'disconnected'
    })))
  }, [])

  // Refresh all data function for impersonation changes
  const refreshAllData = useCallback(async () => {
    try {
      console.log('[Settings] Refreshing all data for impersonation...')
      // Refresh user data
      if (user?.id) {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const data = await response.json()
          console.log('[Settings] User data refreshed:', data.user.email, 'ID:', data.user.id)
          setUserData(data.user)
          if (data.user?.customAnalysisCriteria) {
            setCustomCriteria(data.user.customAnalysisCriteria)
          }
          setAutoRunCustomCriteria(data.user?.autoRunCustomCriteria || false)

          // Update webhook URLs with new user ID
          const userIdString = typeof data.user.id === 'string' ? data.user.id : data.user.id.toString()
          console.log('[Settings] Updating webhook URLs with user ID:', userIdString)
          setIntegrations(getIntegrationsConfig(userIdString))
        }
      }

      // Refresh integration configurations
      const savedConfigs = await getIntegrationConfigurations()
      setConfigurations(savedConfigs)
      updateIntegrationStatuses(savedConfigs)
      console.log('[Settings] Integration configurations refreshed')
    } catch (error) {
      console.error('[Settings] Error refreshing data:', error)
    }
  }, [user, updateIntegrationStatuses])

  // Refresh data when impersonation changes
  useImpersonationRefresh(refreshAllData)

  // Update integrations when user data is loaded (respects impersonation)
  useEffect(() => {
    if (userData?.id) {
      const userIdString = typeof userData.id === 'string' ? userData.id : userData.id.toString()
      console.log('[Settings] Updating webhook URLs for user:', userData.email, 'ID:', userIdString)
      setIntegrations(getIntegrationsConfig(userIdString))
    } else if (isLoaded && user) {
      // Fallback to Clerk user ID if userData not loaded yet
      setIntegrations(getIntegrationsConfig(user.id))
    }
  }, [userData, isLoaded, user])

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

  // Load saved integration configurations
  useEffect(() => {
    const fetchIntegrationConfigs = async () => {
      if (!isLoaded || !user) return

      try {
        const savedConfigs = await getIntegrationConfigurations()
        console.log('[Settings] Loaded saved configurations:', savedConfigs)
        console.log('[Settings] Fathom config:', savedConfigs.fathom)
        console.log('[Settings] Fathom apiKey:', savedConfigs.fathom?.apiKey)
        console.log('[Settings] Fathom webhookSecret:', savedConfigs.fathom?.webhookSecret)
        console.log('[Settings] Fathom webhookId:', savedConfigs.fathom?.webhookId)
        console.log('[Settings] Claap config:', savedConfigs.claap)
        console.log('[Settings] Claap apiKey:', savedConfigs.claap?.apiKey ? `${savedConfigs.claap.apiKey.substring(0, 10)}...` : '(empty)')
        console.log('[Settings] Claap webhookSecret:', savedConfigs.claap?.webhookSecret ? `${savedConfigs.claap.webhookSecret.substring(0, 10)}...` : '(empty)')
        console.log('[Settings] Claap config keys:', savedConfigs.claap ? Object.keys(savedConfigs.claap) : [])
        setConfigurations(savedConfigs)
        updateIntegrationStatuses(savedConfigs)

        // Load selected channels for Claap
        if (savedConfigs.claap?.selectedChannels) {
          try {
            const channelsArray = JSON.parse(savedConfigs.claap.selectedChannels)
            setSelectedChannels(new Set(channelsArray))
          } catch (error) {
            console.error('Error parsing selected channels:', error)
          }
        }
      } catch (error) {
        console.error('Error fetching integration configurations:', error)
      }
    }

    fetchIntegrationConfigs()
  }, [isLoaded, user, updateIntegrationStatuses])


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
    toast.success('Copied!', {
      description: 'Value copied to clipboard',
      duration: 2000
    })
  }

  // Helper function to mask password values (show first 5 chars, hide the rest)
  const maskPassword = (value: string) => {
    if (!value || value.length === 0) return ''
    if (value.length <= 5) return value
    return value.substring(0, 5) + '•'.repeat(Math.min(value.length - 5, 20))
  }

  const handleSave = async (integrationId: string) => {
    setLoading(prev => ({ ...prev, [integrationId]: true }))
    setSaveResults(prev => {
      const updated = { ...prev }
      delete updated[integrationId]
      return updated
    })

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined
      const result = await saveIntegrationConfiguration(integrationId, configurations[integrationId] || {}, origin)

      console.log(`${integrationId} configuration saved`, result)

      setSaveResults(prev => ({
        ...prev,
        [integrationId]: {
          success: true,
          webhookCreated: result.webhookCreated,
          webhookId: result.webhookId
        }
      }))

      // Reload configurations to get updated data
      const updatedConfigs = await getIntegrationConfigurations()
      setConfigurations(updatedConfigs)
      updateIntegrationStatuses(updatedConfigs)
    } catch (error) {
      console.error(`Error saving ${integrationId} configuration:`, error)
      setSaveResults(prev => ({
        ...prev,
        [integrationId]: {
          success: false
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleTest = async (integrationId: string) => {
    setTesting(prev => ({ ...prev, [integrationId]: true }))
    setTestResults(prev => {
      const updated = { ...prev }
      delete updated[integrationId]
      return updated
    })
    setSelectedMeetings(prev => {
      const updated = { ...prev }
      delete updated[integrationId]
      return updated
    })

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined
      const result = await testIntegrationConnection(integrationId, configurations[integrationId] || {}, origin)
      setTestResults(prev => ({ ...prev, [integrationId]: result }))

      if (result.success) {
        console.log(`${integrationId} connection test successful`, result)
        
        // Show webhook creation toast for Fathom
        if (integrationId === 'fathom') {
          if (result.webhookCreated && result.webhookId) {
            toast.success('Webhook created successfully!', {
              description: `Webhook ID: ${result.webhookId}`,
              duration: 5000
            })
          } else if (result.webhookError) {
            toast.error('Webhook creation failed', {
              description: result.webhookError,
              duration: 5000
            })
          }
        }
      } else {
        console.error(`${integrationId} connection test failed:`, result.message)
        if (integrationId === 'fathom' && result.webhookError) {
          toast.error('Connection test failed', {
            description: result.message,
            duration: 5000
          })
        }
      }
    } catch (error: any) {
      console.error(`Error testing ${integrationId} connection:`, error)
      setTestResults(prev => ({
        ...prev,
        [integrationId]: {
          success: false,
          message: error.message || 'Unexpected error occurred during connection test'
        }
      }))
      toast.error('Connection test failed', {
        description: error.message || 'Unexpected error occurred',
        duration: 5000
      })
    } finally {
      setTesting(prev => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleToggleMeeting = (integrationId: string, recordingId: string) => {
    setSelectedMeetings(prev => {
      const current = prev[integrationId] || new Set()
      const updated = new Set(current)
      if (updated.has(recordingId)) {
        updated.delete(recordingId)
      } else {
        updated.add(recordingId)
      }
      return { ...prev, [integrationId]: updated }
    })
  }

  const handleSelectAllMeetings = (integrationId: string, meetings: any[]) => {
    const allIds = meetings
      .filter(m => m.recordingId)
      .map(m => m.recordingId.toString())
    setSelectedMeetings(prev => ({
      ...prev,
      [integrationId]: new Set(allIds)
    }))
  }

  const handleDeselectAllMeetings = (integrationId: string) => {
    setSelectedMeetings(prev => {
      const updated = { ...prev }
      delete updated[integrationId]
      return updated
    })
  }

  const handleImportMeetings = async (integrationId: string) => {
    if (integrationId !== 'fathom') return

    const selected = selectedMeetings[integrationId] || new Set()
    if (selected.size === 0) {
      toast.error('No meetings selected', {
        description: 'Please select at least one meeting to import',
        duration: 3000
      })
      return
    }

    setImportingMeetings(prev => ({ ...prev, [integrationId]: true }))

    try {
      const apiKey = configurations[integrationId]?.apiKey || ''
      if (!apiKey) {
        throw new Error('API key not found. Please configure Fathom first.')
      }

      const recordingIds = Array.from(selected)
      const result = await importFathomMeetings(recordingIds, apiKey)

      if (result.success) {
        toast.success('Meetings imported successfully!', {
          description: `Imported ${result.imported} meeting(s), skipped ${result.skipped}`,
          duration: 5000
        })
        // Clear selection
        handleDeselectAllMeetings(integrationId)
        // Refresh test results to update meeting status
        const currentResult = testResults[integrationId]
        if (currentResult) {
          setTestResults(prev => ({
            ...prev,
            [integrationId]: {
              ...currentResult,
              meetings: currentResult.meetings?.map((m: any) => ({
                ...m,
                imported: selected.has(m.recordingId?.toString() || '')
              }))
            }
          }))
        }
      } else {
        toast.error('Import failed', {
          description: result.message,
          duration: 5000
        })
      }
    } catch (error: any) {
      console.error(`Error importing meetings for ${integrationId}:`, error)
      toast.error('Import failed', {
        description: error.message || 'Failed to import meetings',
        duration: 5000
      })
    } finally {
      setImportingMeetings(prev => ({ ...prev, [integrationId]: false }))
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


  const handleSyncHistory = async (integrationId: string) => {
    setSyncing(prev => ({ ...prev, [integrationId]: true }))
    setSyncResults(prev => {
      const updated = { ...prev }
      delete updated[integrationId]
      return updated
    })

    try {
      const response = await fetch('/api/integrations/fathom/sync-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 })
      })

      const result = await response.json()

      if (response.ok) {
        console.log(`${integrationId} historical sync successful`, result)
        setSyncResults(prev => ({
          ...prev,
          [integrationId]: {
            success: true,
            imported: result.imported,
            skipped: result.skipped,
            total: result.total
          }
        }))
      } else {
        console.error(`${integrationId} historical sync failed:`, result.error)
        setSyncResults(prev => ({
          ...prev,
          [integrationId]: {
            success: false,
            imported: 0,
            skipped: 0,
            total: 0
          }
        }))
      }
    } catch (error) {
      console.error(`Error syncing ${integrationId} history:`, error)
      setSyncResults(prev => ({
        ...prev,
        [integrationId]: {
          success: false,
          imported: 0,
          skipped: 0,
          total: 0
        }
      }))
    } finally {
      setSyncing(prev => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleDeleteWebhook = async (integrationId: string) => {
    if (integrationId !== 'fathom') {
      toast.error('Not supported', {
        description: 'Webhook deletion is only supported for Fathom',
        duration: 3000
      })
      return
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete the webhook? This will stop receiving new calls from Fathom.')) {
      return
    }

    setDeletingWebhook(prev => ({ ...prev, [integrationId]: true }))

    try {
      const result = await deleteIntegrationWebhook(integrationId)

      if (result.success) {
        toast.success('Webhook deleted', {
          description: 'The Fathom webhook has been deleted successfully',
          duration: 5000
        })

        // Clear save results to hide webhook info
        setSaveResults(prev => {
          const updated = { ...prev }
          delete updated[integrationId]
          return updated
        })

        // Reload configurations to update the UI
        const savedConfigs = await getIntegrationConfigurations()
        setConfigurations(savedConfigs)
        updateIntegrationStatuses(savedConfigs)
      } else {
        toast.error('Deletion failed', {
          description: result.message,
          duration: 5000
        })
      }
    } catch (error: any) {
      console.error(`Error deleting webhook for ${integrationId}:`, error)
      toast.error('Deletion failed', {
        description: error.message || 'Failed to delete webhook',
        duration: 5000
      })
    } finally {
      setDeletingWebhook(prev => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleFetchClaapChannels = async () => {
    setLoadingChannels(true)
    try {
      console.log('[Settings] Fetching Claap channels...')
      const response = await fetch('/api/integrations/claap/channels')
      console.log('[Settings] Response status:', response.status, response.statusText)
      console.log('[Settings] Response headers:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        console.log('[Settings] Response data:', data)
        console.log('[Settings] Channels found:', data.channels?.length || 0)
        console.log('[Settings] Channel details:', data.channels)

        if (data.success) {
          setClaapChannels(data.channels)
          toast.success('Channels loaded', {
            description: `Found ${data.channels.length} channel(s)`,
            duration: 3000
          })
        } else {
          console.error('[Settings] Response indicates failure:', data)
          toast.error('Failed to load channels', {
            description: data.error || 'Unknown error',
            duration: 5000
          })
        }
      } else {
        console.error('[Settings] HTTP error response:', response.status)
        const error = await response.json()
        console.error('[Settings] Error response body:', error)
        toast.error('Failed to load channels', {
          description: error.error || 'Unknown error',
          duration: 5000
        })
      }
    } catch (error: any) {
      console.error('[Settings] Exception while fetching Claap channels:', error)
      console.error('[Settings] Error type:', error.constructor.name)
      console.error('[Settings] Error message:', error.message)
      if (error.stack) {
        console.error('[Settings] Error stack:', error.stack)
      }
      toast.error('Failed to load channels', {
        description: error.message || 'Unknown error',
        duration: 5000
      })
    } finally {
      setLoadingChannels(false)
    }
  }

  const handleToggleChannel = (channelId: string) => {
    setSelectedChannels(prev => {
      const updated = new Set(prev)
      if (updated.has(channelId)) {
        updated.delete(channelId)
      } else {
        updated.add(channelId)
      }
      return updated
    })
  }

  const handleSaveChannelPreferences = async () => {
    setLoading(prev => ({ ...prev, claap: true }))
    try {
      // Save to configuration with selectedChannels
      const channelsArray = Array.from(selectedChannels)
      const updatedConfig = {
        ...configurations.claap,
        selectedChannels: JSON.stringify(channelsArray)
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : undefined
      const result = await saveIntegrationConfiguration('claap', updatedConfig, origin)

      if (result) {
        toast.success('Channel preferences saved', {
          description: `${channelsArray.length} channel(s) selected for analysis`,
          duration: 5000
        })

        // Reload configurations
        const savedConfigs = await getIntegrationConfigurations()
        setConfigurations(savedConfigs)
        updateIntegrationStatuses(savedConfigs)
      }
    } catch (error: any) {
      console.error('Error saving channel preferences:', error)
      toast.error('Failed to save preferences', {
        description: error.message || 'Unknown error',
        duration: 5000
      })
    } finally {
      setLoading(prev => ({ ...prev, claap: false }))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Main Section Tabs */}
        <div className="flex space-x-2 border dark:border-gray-700 rounded-lg p-1 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => setMainSection('webhooks')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainSection === 'webhooks'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Custom Criteria</span>
              </div>
            </button>
          )}
          <button
            onClick={() => setMainSection('appearance')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainSection === 'appearance'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </div>
          </button>
        </div>
      </div>

      {/* Webhooks Section */}
      {mainSection === 'webhooks' && (
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-950 dark:text-white">Integrations</CardTitle>
              </CardHeader>
              <CardContent className="p-0 ">
                <div className="space-y-1">
                  {integrations.map((integration) => (
                    <button
                      key={integration.id}
                      onClick={() => setActiveTab(integration.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-950 dark:text-white ${
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
                      <integration.icon className="h-6 w-6 text-gray-950 dark:text-white" />
                      <div>
                        <CardTitle className="text-gray-950 dark:text-white">{integration.name} Integration</CardTitle>
                        <CardDescription className="text-gray-950 dark:text-white">{integration.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Existing Webhook Status for Fathom */}
                    {integration.id === 'fathom' && configurations[integration.id]?.webhookId && (
                      <div className="p-4 rounded-lg border bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                Webhook Active
                              </p>
                              <div className="mt-2 text-xs text-green-700 dark:text-green-300 space-y-1">
                                <div>✓ Webhook ID: {configurations[integration.id].webhookId}</div>
                                <div>✓ Receiving transcript data from new meetings</div>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWebhook(integration.id)}
                            disabled={deletingWebhook[integration.id]}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deletingWebhook[integration.id] ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Configuration Fields */}
                    <div className="grid gap-4">
                      {integration.fields.map((field) => {
                        const savedValue = configurations[integration.id]?.[field.key] || ''
                        const displayValue = field.type === 'password' && savedValue
                          ? maskPassword(savedValue)
                          : (field.value || savedValue)

                        // Debug logging for Fathom and Claap
                        if (integration.id === 'fathom' || integration.id === 'claap') {
                          console.log(`[Settings] ${integration.id} Field ${field.key}:`, {
                            savedValue: savedValue ? `${savedValue.substring(0, 5)}...` : '(empty)',
                            displayValue: displayValue ? `${displayValue.substring(0, 5)}...` : '(empty)',
                            fieldType: field.type,
                            configExists: !!configurations[integration.id],
                            configKeys: configurations[integration.id] ? Object.keys(configurations[integration.id]) : []
                          })
                        }

                        return (
                          <div key={field.key} className="grid gap-2">
                            <Label className='text-gray-950 dark:text-white' htmlFor={`${integration.id}-${field.key}`}>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <Input
                              id={`${integration.id}-${field.key}`}
                              type={field.type === 'password' ? 'password' : 'text'}
                              placeholder={field.readonly ? '' : `Enter ${field.label.toLowerCase()}`}
                              value={displayValue}
                              onChange={(e) => handleInputChange(integration.id, field.key, e.target.value)}
                              readOnly={field.readonly}
                              className={`text-gray-950 dark:text-white ${field.readonly ?  'cursor-pointer' : ''}`}
                              onClick={field.readonly ? (field.value ? () => handleCopy(field.value) : undefined) : undefined}
                            />
                            {field.readonly && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Use this URL in your {integration.name} webhook configuration
                              </p>
                            )}
                            {field.type === 'password' && savedValue && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Showing first 5 characters. Click to edit.
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Channel Selection for Claap */}
                    {integration.id === 'claap' && isIntegrationConnected('claap', configurations.claap) && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                Channel Selection
                              </h4>
                              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                Choose which Claap channels to analyze
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleFetchClaapChannels}
                              disabled={loadingChannels}
                              className="text-xs"
                            >
                              {loadingChannels ? 'Loading...' : 'Load Channels'}
                            </Button>
                          </div>

                          {claapChannels.length > 0 && (
                            <>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {claapChannels.map(channel => (
                                  <div
                                    key={channel.id}
                                    className={`p-3 rounded border cursor-pointer transition-colors ${
                                      selectedChannels.has(channel.id)
                                        ? 'bg-purple-100 border-purple-300 dark:bg-purple-800 dark:border-purple-600'
                                        : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                    }`}
                                    onClick={() => handleToggleChannel(channel.id)}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <input
                                        type="checkbox"
                                        checked={selectedChannels.has(channel.id)}
                                        onChange={() => {}}
                                        onClick={(e) => e.stopPropagation()}
                                        className="mt-0.5"
                                      />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                          {channel.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          ID: {channel.id}
                                        </p>
                                      </div>
                                      {selectedChannels.has(channel.id) && (
                                        <Badge variant="default" className="text-xs">Selected</Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-purple-200 dark:border-purple-700">
                                <p className="text-sm text-purple-800 dark:text-purple-200">
                                  {selectedChannels.size} channel(s) selected
                                  {selectedChannels.size === 0 && ' (all channels will be analyzed)'}
                                </p>
                                <Button
                                  onClick={handleSaveChannelPreferences}
                                  disabled={loading.claap}
                                  size="sm"
                                  className="flex items-center space-x-2"
                                >
                                  <Save className="h-3 w-3" />
                                  <span>
                                    {loading.claap ? 'Saving...' : 'Save Selection'}
                                  </span>
                                </Button>
                              </div>
                            </>
                          )}

                          {claapChannels.length === 0 && !loadingChannels && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                              Click &quot;Load Channels&quot; to see available channels
                            </p>
                          )}
                        </div>
                      </div>
                    )}

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
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => handleTest(integration.id)}
                          variant="outline"
                          disabled={testing[integration.id]}
                          className="flex items-center space-x-2"
                        >
                          <TestTube className="h-4 w-4 text-gray-950 dark:text-white" />
                          <span className="text-gray-950 dark:text-white">{testing[integration.id] ? 'Testing...' : 'Test Connection'}</span>
                        </Button>
                        <Button
                          onClick={() => handleSave(integration.id)}
                          disabled={loading[integration.id]}
                          className="flex items-center space-x-2"
                        >
                          <Save className="h-4 w-4" />
                          <span>{loading[integration.id] ? 'Saving...' : 'Save Configuration'}</span>
                        </Button>
                        {/* Import Historical Calls for Fathom */}
                        {integration.id === 'fathom' && testResults[integration.id]?.success && (
                          <Button
                            onClick={() => handleSyncHistory(integration.id)}
                            variant="secondary"
                            disabled={syncing[integration.id]}
                            className="flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>{syncing[integration.id] ? 'Importing...' : 'Import Historical Calls'}</span>
                          </Button>
                        )}
                      </div>

                      {/* Test Result Display */}
                      {testResults[integration.id] && (
                        <>
                          <div className={`p-4 rounded-lg border ${
                            testResults[integration.id].success
                              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                          }`}>
                            <div className="flex items-start space-x-3">
                              {testResults[integration.id].success ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${
                                  testResults[integration.id].success
                                    ? 'text-green-800 dark:text-green-200'
                                    : 'text-red-800 dark:text-red-200'
                                }`}>
                                  {testResults[integration.id].message}
                                </p>
                                {testResults[integration.id].details && (
                                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                    {Object.entries(testResults[integration.id].details || {}).map(([key, value]) => (
                                      <div key={key} className="mt-1">
                                        <span className="font-medium">{key}:</span> {String(value)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {integration.id === 'fathom' && testResults[integration.id].webhookCreated && (
                                  <div className="mt-2 text-xs text-green-700 dark:text-green-300">
                                    ✓ Webhook created (ID: {testResults[integration.id].webhookId})
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Meetings List for Fathom */}
                          {integration.id === 'fathom' && testResults[integration.id].success && testResults[integration.id].meetings && testResults[integration.id].meetings!.length > 0 && (
                            <div className="mt-4 p-4 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    Last 10 Meetings Found ({testResults[integration.id].meetings!.length})
                                  </h4>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    Select meetings to import them into your call records
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelectAllMeetings(integration.id, testResults[integration.id].meetings || [])}
                                    disabled={importingMeetings[integration.id]}
                                    className="text-xs"
                                  >
                                    Select All
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeselectAllMeetings(integration.id)}
                                    disabled={importingMeetings[integration.id]}
                                    className="text-xs"
                                  >
                                    Deselect All
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {testResults[integration.id].meetings!.map((meeting: any) => {
                                  const recordingId = meeting.recordingId?.toString() || ''
                                  const isSelected = selectedMeetings[integration.id]?.has(recordingId) || false
                                  const hasRecording = !!meeting.recordingId

                                  return (
                                    <div
                                      key={meeting.id || recordingId}
                                      className={`p-3 rounded border cursor-pointer transition-colors ${
                                        isSelected
                                          ? 'bg-blue-100 border-blue-300 dark:bg-blue-800 dark:border-blue-600'
                                          : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                      } ${!hasRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      onClick={() => hasRecording && handleToggleMeeting(integration.id, recordingId)}
                                    >
                                      <div className="flex items-start space-x-3">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {}}
                                          onClick={(e) => e.stopPropagation()}
                                          disabled={!hasRecording || importingMeetings[integration.id]}
                                          className="mt-1"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                              {meeting.title || 'Untitled Meeting'}
                                            </p>
                                            {isSelected && (
                                              <Badge variant="default" className="text-xs">Selected</Badge>
                                            )}
                                          </div>
                                          {meeting.scheduledStartTime && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                              {new Date(meeting.scheduledStartTime).toLocaleString()}
                                            </p>
                                          )}
                                          {!hasRecording && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                              No recording available
                                            </p>
                                          )}
                                          {meeting.recordingId && (
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                              Recording ID: {recordingId}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {selectedMeetings[integration.id] && selectedMeetings[integration.id].size > 0 && (
                                <div className="mt-4 flex items-center justify-between pt-4 border-t border-blue-200 dark:border-blue-700">
                                  <p className="text-sm text-blue-800 dark:text-blue-200">
                                    {selectedMeetings[integration.id].size} meeting(s) selected
                                  </p>
                                  <Button
                                    onClick={() => handleImportMeetings(integration.id)}
                                    disabled={importingMeetings[integration.id]}
                                    className="flex items-center space-x-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    <span>
                                      {importingMeetings[integration.id] ? 'Importing...' : `Import ${selectedMeetings[integration.id].size} Meeting(s)`}
                                    </span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Save Result Display */}
                      {saveResults[integration.id] && saveResults[integration.id].success && integration.id === 'fathom' && (
                        <div className="p-4 rounded-lg border bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
                          <div className="flex items-start space-x-3">
                            <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                Configuration saved successfully!
                              </p>
                              {saveResults[integration.id].webhookCreated && (
                                <div className="mt-2 text-xs text-purple-700 dark:text-purple-300 space-y-1">
                                  <div>✓ Webhook automatically created in Fathom</div>
                                  <div>✓ Webhook ID: {saveResults[integration.id].webhookId}</div>
                                  <div>✓ Webhook secret securely stored</div>
                                  <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                                    💡 Your webhook is now active and will receive transcript data from new meetings
                                  </div>
                                </div>
                              )}
                              {!saveResults[integration.id].webhookCreated && (
                                <div className="mt-2 text-xs text-purple-700 dark:text-purple-300">
                                  ⚠️ Webhook creation failed. You may need to create it manually in Fathom dashboard.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sync Result Display */}
                      {syncResults[integration.id] && (
                        <div className={`p-4 rounded-lg border ${
                          syncResults[integration.id].success
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        }`}>
                          <div className="flex items-start space-x-3">
                            {syncResults[integration.id].success ? (
                              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                syncResults[integration.id].success
                                  ? 'text-blue-800 dark:text-blue-200'
                                  : 'text-red-800 dark:text-red-200'
                              }`}>
                                {syncResults[integration.id].success
                                  ? 'Historical calls imported successfully!'
                                  : 'Failed to import historical calls'}
                              </p>
                              {syncResults[integration.id].success && (
                                <div className="mt-2 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                  <div>✓ Imported: {syncResults[integration.id].imported} new calls</div>
                                  <div>⊘ Skipped: {syncResults[integration.id].skipped} (already exist)</div>
                                  <div>Total found: {syncResults[integration.id].total} meetings</div>
                                  <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                                    💡 Imported calls are now available in your Call Records. You can analyze them individually.
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
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
            <CardTitle className="text-gray-950 dark:text-white">Custom Analysis Criteria</CardTitle>
            <CardDescription className="text-gray-950 dark:text-white">
              Define custom criteria to analyze in your sales calls. These will be used to provide additional insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Criteria Form */}
            <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg space-y-4">
              <h3 className="text-sm font-medium text-gray-950 dark:text-white">Add New Criteria</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="criteria-title" className="text-gray-950 dark:text-white">Title</Label>
                  <Input
                    id="criteria-title"
                    className="text-gray-950 dark:text-white"
                    placeholder="e.g., Product Knowledge, Objection Handling"
                    value={newCriteriaTitle}
                    onChange={(e) => setNewCriteriaTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="criteria-description" className="text-gray-950 dark:text-white">
                    Description / Analysis Prompt
                  </Label>
                  <textarea
                    id="criteria-description"
                    className="text-gray-950 dark:text-white dark:bg-zinc-900 min-h-[100px] w-full rounded-md border border-input  px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-950 dark:text-white mb-1">
                      Analyse automatique après chaque appel
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
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
              <h3 className="text-sm font-medium text-gray-950 dark:text-white">Your Custom Criteria</h3>
              {customCriteria.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No custom criteria defined yet. Add your first one above.
                </div>
              ) : (
                <div className="space-y-3">
                  {customCriteria.map((criteria) => (
                    <Card key={criteria.id} className="bg-white dark:bg-zinc-900">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <h4 className="font-medium text-gray-950 dark:text-white">{criteria.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{criteria.description}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Created: {new Date(criteria.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCriteria(criteria.id)}
                            disabled={savingCriteria}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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

      {/* Appearance Section */}
      {mainSection === 'appearance' && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Palette className="h-6 w-6" />
              <div>
                <CardTitle className="text-gray-950 dark:text-gray-50">Appearance</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Customize the look and feel of your dashboard
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Switch between light and dark mode
                </p>
              </div>
              <ThemeToggle />
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
        <li>1. Go to <a href="https://app.fathom.video/settings/developer" target="_blank" rel="noopener noreferrer" className="underline">Fathom API Settings</a></li>
        <li>2. Generate an API key for your account</li>
        <li>3. Copy the API key to the field above</li>
        <li>4. Copy the webhook URL and configure it in your Fathom settings</li>
        <li>5. Test the connection and save your configuration</li>
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
    claap: (
      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
        <li>1. Go to <a href="https://app.claap.io/settings/integrations" target="_blank" rel="noopener noreferrer" className="underline">Claap Integration Settings</a></li>
        <li>2. Generate an API key (X-Claap-Key) for your workspace</li>
        <li>3. Copy the API key to the field above</li>
        <li>4. In Claap, manually create a webhook for &quot;recording_added&quot; events</li>
        <li>5. Use the webhook URL shown above as the destination</li>
        <li>6. (Optional) Copy the webhook secret from Claap and paste it in the field above</li>
        <li>7. Test the connection and save your configuration</li>
      </ul>
    ),
  }

  return instructions[integrationId as keyof typeof instructions] || null
}
