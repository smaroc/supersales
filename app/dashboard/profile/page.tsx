'use client'

import { useState, useEffect, useTransition } from 'react'
import { useUser } from '@clerk/nextjs'
import { getAllUsers } from '@/app/actions/users'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, Shield, Edit3, Save, X, Users, Mail, Plus, Calendar, CheckCircle, XCircle, Database, ChevronLeft, ChevronRight } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isAdmin: boolean
  isActive: boolean
  isSuperAdmin?: boolean
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

interface AllUsersData {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isAdmin: boolean
  isSuperAdmin?: boolean
  isActive: boolean
  hasCompletedSignup: boolean
  avatar?: string
  organizationId: string
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

  // Super admin state
  const [allUsers, setAllUsers] = useState<AllUsersData[]>([])
  const [loadingAllUsers, setLoadingAllUsers] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const usersPerPage = 10
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (isLoaded && user) {
      fetchProfile()
    }
  }, [isLoaded, user])

  useEffect(() => {
    if (profile?.isAdmin) {
      console.log(JSON.stringify(profile))
      console.log('Fetching team members for admin')
      fetchTeamMembers()
    }
    if (profile?.isSuperAdmin) {
      console.log('Fetching all users for super admin')
      fetchAllUsers()
    }
  }, [profile?.isAdmin, profile?.isSuperAdmin, currentPage])

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

  const fetchAllUsers = async () => {
    setLoadingAllUsers(true)
    startTransition(async () => {
      try {
        const data = await getAllUsers({ page: currentPage, limit: usersPerPage })
        setAllUsers(data.users || [])
        setTotalUsers(data.total || 0)
        setTotalPages(data.totalPages || 1)
      } catch (error) {
        console.error('Error fetching all users:', error)
      } finally {
        setLoadingAllUsers(false)
      }
    })
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
        <div className="text-lg text-gray-950">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-700">Profile not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-950">
          <User className="h-8 w-8" />
          User Profile
        </h1>
        <p className="text-gray-800 mt-2">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-950">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-gray-800">
                Your basic account information
              </CardDescription>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="text-gray-950">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit} className="text-gray-950">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="text-white">
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
                <h3 className="text-xl font-semibold text-gray-950">{profile.firstName} {profile.lastName}</h3>
                <p className="text-gray-800">{profile.email}</p>
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
                <Label htmlFor="firstName" className="text-gray-950">First Name</Label>
                {editing ? (
                  <Input
                    id="firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className='text-gray-950'
                    placeholder="Enter first name"
                  />
                ) : (
                  <Input value={profile.firstName} disabled className="text-gray-950" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-950">Last Name</Label>
                {editing ? (
                  <Input
                    id="lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className='text-gray-950'
                    placeholder="Enter last name"
                  />
                ) : (
                  <Input value={profile.lastName} disabled className="text-gray-950" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-950">Email Address</Label>
              <Input value={profile.email} disabled className="text-gray-950" />
              <p className="text-xs text-gray-700">Email cannot be changed here. Please update in your Clerk account.</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Shield className="h-5 w-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-950">Account Status</Label>
              <div className="mt-1">
                <Badge className={profile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-950">Role</Label>
              <div className="mt-1">
                <Badge className={getRoleBadgeColor(profile.role)}>
                  {profile.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-950">Permissions</Label>
              <div className="mt-2 space-y-2">
                {Object.entries(profile.permissions).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm text-gray-800">
                    <span className="text-gray-950 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^can/, '').trim()}
                    </span>
                    <Badge className={value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                      {value ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-950">Member Since</Label>
              <p className="text-sm text-gray-950 mt-1">
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
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-950">
              <Users className="h-7 w-7" />
              Team Management
            </h2>
            <p className="text-gray-800 mt-2">Manage your team members and send invitations</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invite New Member Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-950">
                  <Plus className="h-5 w-5" />
                  Invite Team Member
                </CardTitle>
                <CardDescription className="text-gray-800">
                  Send an invitation to add a new team member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteFirstName" className="text-gray-950">First Name</Label>
                      <Input
                        id="inviteFirstName"
                        value={inviteForm.firstName}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteLastName" className="text-gray-950">Last Name</Label>
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
                    <Label htmlFor="inviteEmail" className="text-gray-950">Email Address</Label>
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
                    <Label htmlFor="inviteRole" className="text-gray-950">Role</Label>
                    <select
                      id="inviteRole"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-gray-950"
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
                <CardTitle className="flex items-center gap-2 text-gray-950">
                  <Users className="h-5 w-5" />
                  Team Members ({teamMembers.length})
                </CardTitle>
                <CardDescription className="text-gray-800">
                  Current team members and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTeam ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-800">Loading team members...</div>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-800">
                    <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-800">No team members found</p>
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
                            <p className="text-sm font-medium truncate text-gray-950">
                              {member.firstName} {member.lastName}
                            </p>
                            {member.isAdmin && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-800 truncate">{member.email}</p>
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
                              <span className="text-xs text-gray-800">
                                {member.hasCompletedSignup ? 'Active' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-gray-800">
                          <div className="flex items-center text-xs text-gray-800">
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

      {/* Super Admin All Users Section */}
      {profile?.isSuperAdmin && (
        <div className="mt-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-950">
              <Database className="h-7 w-7" />
              All Users Database
            </h2>
            <p className="text-gray-800 mt-2">Complete database of all users across all organizations</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-950">
                <Database className="h-5 w-5" />
                All Users ({totalUsers})
              </CardTitle>
              <CardDescription className="text-gray-800">
                View all users in the database with pagination
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(loadingAllUsers || isPending) ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-800">Loading users...</div>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-800">
                  <Database className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-800">No users found</p>
                </div>
              ) : (
                <>
                  {/* Users Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-3 text-sm font-medium text-gray-950">User</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-950">Email</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-950">Role</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-950">Organization</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-950">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-950">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((user: AllUsersData) => (
                          <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar || ''} alt={`${user.firstName} ${user.lastName}`} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {getInitials(user.firstName, user.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-gray-950">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <div className="flex items-center gap-1 mt-1">
                                    {user.isAdmin && (
                                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                                        Admin
                                      </Badge>
                                    )}
                                    {user.isSuperAdmin && (
                                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                                        Super Admin
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="text-sm text-gray-800">{user.email}</p>
                            </td>
                            <td className="p-3">
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {user.role?.replace('_', ' ') || 'No role'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <p className="text-sm text-gray-800">
                                {user.organizationId?.toString().slice(-8) || 'No org'}
                              </p>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {user.hasCompletedSignup ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-orange-600" />
                                )}
                                <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center text-sm text-gray-800">
                                <Calendar className="h-3 w-3 mr-1" />
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-800">
                        Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="text-gray-950"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }

                            return (
                              <Button
                                key={`pagination-button-${pageNum}`}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className={currentPage === pageNum ? "text-white" : "text-gray-950"}
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="text-gray-950"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}