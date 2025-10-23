'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  UserPlus,
  Shield,
  Mail,
  User,
  Calendar,
  Search
} from 'lucide-react'

interface UserData {
  _id?: string
  email: string
  firstName: string
  lastName: string
  role: 'owner' | 'admin' | 'manager' | 'head_of_sales' | 'sales_rep' | 'viewer'
  isActive: boolean
  lastLoginAt?: string
  createdAt?: string
  permissions: {
    canViewAllData: boolean
    canManageUsers: boolean
    canManageSettings: boolean
    canExportData: boolean
    canDeleteData: boolean
  }
}

const roleLabels = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  manager: 'Manager',
  head_of_sales: 'Head of Sales',
  sales_rep: 'Commercial',
  viewer: 'Visualiseur'
}

const roleColors = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  head_of_sales: 'bg-orange-100 text-orange-800',
  sales_rep: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800'
}

export default function UsersManagementPage() {
  const { user: clerkUser, isLoaded } = useUser()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const defaultUser: UserData = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'sales_rep',
    isActive: true,
    permissions: {
      canViewAllData: false,
      canManageUsers: false,
      canManageSettings: false,
      canExportData: false,
      canDeleteData: false
    }
  }

  const [formData, setFormData] = useState<UserData>(defaultUser)

  // Check if user is admin
  if (clerkUser?.publicMetadata?.role !== 'admin' && clerkUser?.publicMetadata?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Accès refusé
          </h2>
          <p className="text-gray-600 dark:text-gray-500 mt-2">
            Cette page est réservée aux administrateurs
          </p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchUsers()
        handleCancel()
        alert(editingId ? 'Utilisateur modifié avec succès' : 'Utilisateur créé avec succès')
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error || 'Erreur lors de la sauvegarde'}`)
      }
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (user: UserData) => {
    setFormData(user)
    setEditingId(user._id || null)
    setIsCreating(false)
  }

  const handleDelete = async (id: string, userEmail: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userEmail} ?`)) {
      try {
        const response = await fetch(`/api/users/${id}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          await fetchUsers()
          alert('Utilisateur supprimé avec succès')
        } else {
          const error = await response.json()
          alert(`Erreur: ${error.error || 'Erreur lors de la suppression'}`)
        }
      } catch (error) {
        console.error('Error deleting user:', error)
        alert('Erreur lors de la suppression')
      }
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsCreating(false)
    setFormData(defaultUser)
  }

  const handleRoleChange = (role: string) => {
    let permissions = { ...defaultUser.permissions }
    
    // Set permissions based on role
    switch (role) {
      case 'owner':
      case 'admin':
        permissions = {
          canViewAllData: true,
          canManageUsers: true,
          canManageSettings: true,
          canExportData: true,
          canDeleteData: true
        }
        break
      case 'head_of_sales':
        permissions = {
          canViewAllData: true,
          canManageUsers: true,
          canManageSettings: true,
          canExportData: true,
          canDeleteData: false
        }
        break
      case 'manager':
        permissions = {
          canViewAllData: true,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: true,
          canDeleteData: false
        }
        break
      case 'sales_rep':
        permissions = {
          canViewAllData: false,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: false,
          canDeleteData: false
        }
        break
      case 'viewer':
        permissions = {
          canViewAllData: true,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: false,
          canDeleteData: false
        }
        break
    }

    setFormData({
      ...formData,
      role: role as UserData['role'],
      permissions
    })
  }

  const filteredUsers = users.filter(user =>
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement des utilisateurs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Users className="h-6 w-6" />
            <span>Gestion des utilisateurs</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-500 mt-1">
            Ajouter et gérer les utilisateurs de l'organisation
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)} 
          disabled={isCreating || editingId !== null}
          className="flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nouvel utilisateur</span>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-gray-950"
            />
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit User Form */}
      {(isCreating || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>
                {isCreating ? 'Nouveau utilisateur' : 'Modifier l\'utilisateur'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Prénom"
                  className="text-gray-950"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Nom de famille"
                  className="text-gray-950"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="text-gray-950"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Rôle *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger className="text-gray-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales_rep">Commercial</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="head_of_sales">Head of Sales</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="viewer">Visualiseur</SelectItem>
                    {clerkUser?.publicMetadata?.role === 'owner' && (
                      <SelectItem value="owner">Propriétaire</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive">Utilisateur actif</Label>
              </div>
            </div>

            {/* Permissions Preview */}
            <div>
              <Label className="mb-2 block">Permissions associées au rôle :</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(formData.permissions).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm">
                      {key === 'canViewAllData' && 'Voir toutes les données'}
                      {key === 'canManageUsers' && 'Gérer les utilisateurs'}
                      {key === 'canManageSettings' && 'Gérer les paramètres'}
                      {key === 'canExportData' && 'Exporter les données'}
                      {key === 'canDeleteData' && 'Supprimer les données'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving || !formData.email || !formData.firstName || !formData.lastName}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Liste de tous les utilisateurs de l'organisation
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Utilisateur</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Rôle</th>
                  <th className="text-left py-3 px-4 font-medium">Statut</th>
                  <th className="text-left py-3 px-4 font-medium">Dernière connexion</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr 
                    key={user._id} 
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </td>
                    
                    <td className="py-3 px-4">
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR')
                            : 'Jamais'
                          }
                        </span>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          disabled={isCreating || editingId !== null}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.email !== clerkUser?.primaryEmailAddress?.emailAddress && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user._id!, user.email)}
                            disabled={isCreating || editingId !== null}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600">Aucun utilisateur trouvé</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}