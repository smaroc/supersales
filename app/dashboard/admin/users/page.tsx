'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Mail, User } from 'lucide-react'

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isAdmin: boolean
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  hasCompletedSignup: boolean
}

export default function AdminUsersPage() {
  const { user, isLoaded } = useUser()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'viewer'
  })
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (isLoaded && user) {
      fetchUsers()
    }
  }, [isLoaded, user])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/manage')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteForm)
      })

      if (response.ok) {
        setInviteForm({ email: '', firstName: '', lastName: '', role: 'viewer' })
        setShowInviteForm(false)
        fetchUsers() // Refresh the list
        alert('User invited successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      alert('Failed to invite user')
    } finally {
      setInviting(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-red-100 text-red-800'
      case 'head_of_sales': return 'bg-blue-100 text-blue-800'
      case 'manager': return 'bg-green-100 text-green-800'
      case 'sales_rep': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (isActive: boolean, hasCompletedSignup: boolean) => {
    if (!hasCompletedSignup) return 'bg-orange-100 text-orange-800'
    if (isActive) return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (isActive: boolean, hasCompletedSignup: boolean) => {
    if (!hasCompletedSignup) return 'Invited'
    if (isActive) return 'Active'
    return 'Inactive'
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-gray-700 mt-2">Manage users and send invitations</p>
        </div>

        <Button
          onClick={() => setShowInviteForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite New User
            </CardTitle>
            <CardDescription>
              Send an invitation to a new user to join your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="sales_rep">Sales Rep</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="head_of_sales">Head of Sales</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={inviting}>
                  {inviting ? 'Inviting...' : 'Send Invitation'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Users ({users.length})</CardTitle>
          <CardDescription>
            All users in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((userData) => (
              <div
                key={userData.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {userData.firstName} {userData.lastName}
                    </div>
                    <div className="text-sm text-gray-700">{userData.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor(userData.role)}>
                    {userData.role.replace('_', ' ')}
                  </Badge>
                  <Badge className={getStatusBadgeColor(userData.isActive, userData.hasCompletedSignup)}>
                    {getStatusText(userData.isActive, userData.hasCompletedSignup)}
                  </Badge>
                  {userData.isAdmin && (
                    <Badge className="bg-indigo-100 text-indigo-800">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                No users found. Start by inviting someone!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}