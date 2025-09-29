'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Save, X, Phone, Target } from 'lucide-react'

interface CallType {
  _id?: string
  name: string
  code: string
  description: string
  order: number
  isActive: boolean
  color: string
  metrics: {
    targetClosingRate: number
    avgDuration: number
    followUpRequired: boolean
  }
  evaluationCriteria: {
    name: string
    description: string
    weight: number
    type: 'boolean' | 'scale' | 'text'
    scaleMax?: number
  }[]
}

export default function CallTypesPage() {
  const { user, isLoaded } = useUser()
  const [callTypes, setCallTypes] = useState<CallType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const defaultCallType: CallType = {
    name: '',
    code: '',
    description: '',
    order: 1,
    isActive: true,
    color: '#3B82F6',
    metrics: {
      targetClosingRate: 20,
      avgDuration: 30,
      followUpRequired: false
    },
    evaluationCriteria: [
      {
        name: 'Présentation produit',
        description: 'Qualité de la présentation du produit/service',
        weight: 8,
        type: 'scale',
        scaleMax: 10
      },
      {
        name: 'Écoute active',
        description: 'Capacité à écouter et comprendre les besoins client',
        weight: 9,
        type: 'scale',
        scaleMax: 10
      },
      {
        name: 'Objections traitées',
        description: 'Les objections ont-elles été correctement traitées',
        weight: 7,
        type: 'boolean'
      }
    ]
  }

  const [formData, setFormData] = useState<CallType>(defaultCallType)

  // Check permissions
  if (!['admin', 'head_of_sales', 'manager'].includes((user?.publicMetadata?.role as string) || '')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Accès refusé</h2>
          <p className="text-gray-500 mt-2">Vous n'avez pas les permissions pour configurer les types d'appels</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchCallTypes()
  }, [])

  const fetchCallTypes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/call-types')
      if (response.ok) {
        const data = await response.json()
        setCallTypes(data)
      }
    } catch (error) {
      console.error('Error fetching call types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const url = editingId ? `/api/call-types/${editingId}` : '/api/call-types'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchCallTypes()
        setEditingId(null)
        setIsCreating(false)
        setFormData(defaultCallType)
      }
    } catch (error) {
      console.error('Error saving call type:', error)
    }
  }

  const handleEdit = (callType: CallType) => {
    setFormData(callType)
    setEditingId(callType._id || null)
    setIsCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce type d\'appel ?')) {
      try {
        const response = await fetch(`/api/call-types/${id}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          await fetchCallTypes()
        }
      } catch (error) {
        console.error('Error deleting call type:', error)
      }
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsCreating(false)
    setFormData(defaultCallType)
  }

  const addCriteria = () => {
    setFormData({
      ...formData,
      evaluationCriteria: [
        ...formData.evaluationCriteria,
        {
          name: '',
          description: '',
          weight: 5,
          type: 'scale',
          scaleMax: 10
        }
      ]
    })
  }

  const updateCriteria = (index: number, field: string, value: any) => {
    const updatedCriteria = [...formData.evaluationCriteria]
    updatedCriteria[index] = { ...updatedCriteria[index], [field]: value }
    setFormData({ ...formData, evaluationCriteria: updatedCriteria })
  }

  const removeCriteria = (index: number) => {
    const updatedCriteria = formData.evaluationCriteria.filter((_, i) => i !== index)
    setFormData({ ...formData, evaluationCriteria: updatedCriteria })
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuration des types d'appels</h1>
          <p className="text-gray-500 mt-1">Gérez les types d'appels et leurs critères d'évaluation</p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating || !!editingId}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau type d'appel
        </Button>
      </div>

      {/* Edit Form */}
      {(isCreating || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreating ? 'Nouveau type d\'appel' : 'Modifier le type d\'appel'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Rendez-vous qualification"
                />
              </div>
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: R1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du type d'appel"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Taux de closing cible (%)</Label>
                <Input
                  type="number"
                  value={formData.metrics.targetClosingRate}
                  onChange={(e) => setFormData({
                    ...formData,
                    metrics: { ...formData.metrics, targetClosingRate: Number(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Durée moyenne (min)</Label>
                <Input
                  type="number"
                  value={formData.metrics.avgDuration}
                  onChange={(e) => setFormData({
                    ...formData,
                    metrics: { ...formData.metrics, avgDuration: Number(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Couleur</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>

            {/* Evaluation Criteria */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg">Critères d'évaluation</Label>
                <Button variant="outline" size="sm" onClick={addCriteria}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter critère
                </Button>
              </div>

              <div className="space-y-4">
                {formData.evaluationCriteria.map((criteria, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Critère {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCriteria(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Nom</Label>
                        <Input
                          value={criteria.name}
                          onChange={(e) => updateCriteria(index, 'name', e.target.value)}
                          placeholder="Ex: Écoute active"
                        />
                      </div>
                      <div>
                        <Label>Poids (1-10)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={criteria.weight}
                          onChange={(e) => updateCriteria(index, 'weight', Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        value={criteria.description}
                        onChange={(e) => updateCriteria(index, 'description', e.target.value)}
                        placeholder="Description du critère d'évaluation"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type d'évaluation</Label>
                        <Select
                          value={criteria.type || "scale"}
                          onValueChange={(value) => updateCriteria(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="boolean">Oui/Non</SelectItem>
                            <SelectItem value="scale">Échelle numérique</SelectItem>
                            <SelectItem value="text">Texte libre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {criteria.type === 'scale' && (
                        <div>
                          <Label>Échelle maximum</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={criteria.scaleMax || 10}
                            onChange={(e) => updateCriteria(index, 'scaleMax', Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Types List */}
      <div className="grid gap-6">
        {callTypes.map((callType) => (
          <Card key={callType._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: callType.color }}
                  ></div>
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Phone className="h-5 w-5" />
                      <span>{callType.name}</span>
                      <Badge variant="outline">{callType.code}</Badge>
                    </CardTitle>
                    <CardDescription>{callType.description}</CardDescription>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(callType)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(callType._id!)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      Cible: {callType.metrics.targetClosingRate}% closing
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Durée moy: {callType.metrics.avgDuration} min
                  </div>
                  {callType.metrics.followUpRequired && (
                    <Badge variant="secondary">Suivi requis</Badge>
                  )}
                </div>

                <div>
                  <h5 className="font-medium mb-2">Critères d'évaluation:</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {callType.evaluationCriteria.map((criteria, index) => (
                      <div key={index} className="text-sm border rounded p-2">
                        <div className="font-medium">{criteria.name}</div>
                        <div className="text-gray-500 text-xs">
                          Poids: {criteria.weight}/10 • {criteria.type}
                          {criteria.type === 'scale' && ` (1-${criteria.scaleMax})`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}