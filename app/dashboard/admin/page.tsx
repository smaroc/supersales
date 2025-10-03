'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Mail, Shield, Plus } from 'lucide-react'
import Link from 'next/link'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  invitedUsers: number
  adminUsers: number
}

export default function AdminDashboard() {
  const { user, isLoaded } = useUser()
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    invitedUsers: 0,
    adminUsers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && user) {
      fetchStats()
    }
  }, [isLoaded, user])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/users/manage')
      if (response.ok) {
        const data = await response.json()
        const users = data.users

        setStats({
          totalUsers: users.length,
          activeUsers: users.filter((u: any) => u.isActive && u.hasCompletedSignup).length,
          invitedUsers: users.filter((u: any) => !u.hasCompletedSignup).length,
          adminUsers: users.filter((u: any) => u.isAdmin || ['admin', 'owner'].includes(u.role)).length
        })
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-lg text-gray-700">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="flex items-center gap-3 text-3xl font-semibold text-gray-900">
          <Shield className="h-8 w-8 text-gray-900" />
          Admin Dashboard
        </h1>
        <p className="text-sm text-gray-700">Manage your organization's users and settings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-600">Total Users</p>
                <p className="text-3xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-600">Active Users</p>
                <p className="text-3xl font-semibold text-green-700">{stats.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-600">Pending Invites</p>
                <p className="text-3xl font-semibold text-amber-700">{stats.invitedUsers}</p>
              </div>
              <Mail className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-600">Admins</p>
                <p className="text-3xl font-semibold text-purple-700">{stats.adminUsers}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage users, send invitations, and control access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/dashboard/admin/users">
                <Button className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  View All Users
                </Button>
              </Link>
              <Link href="/dashboard/admin/users">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Invite New User
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Organization Settings
            </CardTitle>
            <CardDescription>
              Configure organization-wide settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/dashboard/settings">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Organization Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
