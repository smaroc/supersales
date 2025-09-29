'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, Shield, Edit3, Save, X, Users, Mail, Plus, Calendar, CheckCircle, XCircle } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isAdmin: boolean
  isActive: boolean
  avatar?: string
  organizationId: string
  permissions: {
    canViewAllData: boolean
    canManageUsers: boolean
    canManageSettings: boolean
    canExportData: boolean
    canDeleteData: boolean
  }
  createdAt: string
  updatedAt: string
}

interface TeamMember {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isAdmin: boolean
  isActive: boolean
  hasCompletedSignup: boolean
  avatar?: string
  createdAt: string
  lastLoginAt?: string
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: ''
  })

  // Team management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'sales_rep'
  })

  useEffect(() => {
    if (isLoaded && user) {
      fetchProfile()
    }
  }, [isLoaded, user])

  useEffect(() => {
    if (profile?.isAdmin) {
      fetchTeamMembers()
    }
  }, [profile?.isAdmin])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setEditForm({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName
        })
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setEditing(false)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditForm({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || ''
    })
    setEditing(false)
  }

  const fetchTeamMembers = async () => {
    setLoadingTeam(true)
    try {
      const response = await fetch('/api/users/manage')
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoadingTeam(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) return

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
        setInviteForm({
          email: '',
          firstName: '',
          lastName: '',
          role: 'sales_rep'
        })
        // Refresh team members list
        fetchTeamMembers()
      } else {
        const errorData = await response.json()
        console.error('Error inviting user:', errorData.error)
      }
    } catch (error) {
      console.error('Error inviting user:', error)
    } finally {
      setInviting(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'head_of_sales':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'sales_manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'sales_rep':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-500">Profile not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8" />
          User Profile
        </h1>
        <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic account information
              </CardDescription>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.imageUrl || profile.avatar || ''} alt={`${profile.firstName} ${profile.lastName}`} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {getInitials(profile.firstName, profile.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{profile.firstName} {profile.lastName}</h3>
                <p className="text-gray-600">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getRoleBadgeColor(profile.role)}>
                    {profile.role.replace('_', ' ')}
                  </Badge>
                  {profile.isAdmin && (
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                {editing ? (
                  <Input
                    id="firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                ) : (
                  <Input value={profile.firstName} disabled />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                {editing ? (
                  <Input
                    id="lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                ) : (
                  <Input value={profile.lastName} disabled />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input value={profile.email} disabled />
              <p className="text-xs text-gray-500">Email cannot be changed here. Please update in your Clerk account.</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Account Status</Label>
              <div className="mt-1">
                <Badge className={profile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Role</Label>
              <div className="mt-1">
                <Badge className={getRoleBadgeColor(profile.role)}>
                  {profile.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Permissions</Label>
              <div className="mt-2 space-y-2">
                {Object.entries(profile.permissions).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^can/, '').trim()}
                    </span>
                    <Badge className={value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {value ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Member Since</Label>
              <p className="text-sm text-gray-700 mt-1">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Team Management Section */}
      {profile.isAdmin && (
        <div className="mt-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7" />
              Team Management
            </h2>
            <p className="text-gray-600 mt-2">Manage your team members and send invitations</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invite New Member Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Invite Team Member
                </CardTitle>
                <CardDescription>
                  Send an invitation to add a new team member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteFirstName">First Name</Label>
                      <Input
                        id="inviteFirstName"
                        value={inviteForm.firstName}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteLastName">Last Name</Label>
                      <Input
                        id="inviteLastName"
                        value={inviteForm.lastName}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Role</Label>
                    <select
                      id="inviteRole"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    >
                      <option value="sales_rep">Sales Representative</option>
                      <option value="sales_manager">Sales Manager</option>
                      <option value="head_of_sales">Head of Sales</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full" disabled={inviting}>
                    <Mail className="h-4 w-4 mr-2" />
                    {inviting ? 'Sending Invitation...' : 'Send Invitation'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Team Members List Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members ({teamMembers.length})
                </CardTitle>
                <CardDescription>
                  Current team members and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTeam ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">Loading team members...</div>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No team members found</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {teamMembers.map((member) => (
                      <div key={member._id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar || ''} alt={`${member.firstName} ${member.lastName}`} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(member.firstName, member.lastName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {member.firstName} {member.lastName}
                            </p>
                            {member.isAdmin && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getRoleBadgeColor(member.role)}>
                              {member.role.replace('_', ' ')}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {member.hasCompletedSignup ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-orange-600" />
                              )}
                              <span className="text-xs text-gray-500">
                                {member.hasCompletedSignup ? 'Active' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {member.lastLoginAt
                              ? new Date(member.lastLoginAt).toLocaleDateString()
                              : 'Never'
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}