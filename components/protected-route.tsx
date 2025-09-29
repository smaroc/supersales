'use client'

import { useUser, useAuth } from '@clerk/nextjs'
import { RedirectToSignIn } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: string[]
}

interface UserPermissions {
  canViewAllData: boolean
  canManageUsers: boolean
  canManageSettings: boolean
  canExportData: boolean
  canDeleteData: boolean
}

export function ProtectedRoute({
  children,
  requiredPermissions = []
}: ProtectedRouteProps) {
  const { user, isLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)

  useEffect(() => {
    // Fetch user permissions from our database based on clerk user
    const fetchUserPermissions = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/users/by-clerk-id/${user.id}`)
          if (response.ok) {
            const userData = await response.json()
            setUserPermissions(userData.permissions)
          }
        } catch (error) {
          console.error('Error fetching user permissions:', error)
        }
      }
    }

    if (isSignedIn && user) {
      fetchUserPermissions()
    }
  }, [user, isSignedIn])

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to sign in if not authenticated
  if (!isSignedIn) {
    return <RedirectToSignIn />
  }

  // Check permissions if required
  if (requiredPermissions.length > 0 && userPermissions) {
    const hasPermission = requiredPermissions.every(permission => {
      switch (permission) {
        case 'canViewAllData':
          return userPermissions.canViewAllData
        case 'canManageUsers':
          return userPermissions.canManageUsers
        case 'canManageSettings':
          return userPermissions.canManageSettings
        case 'canExportData':
          return userPermissions.canExportData
        case 'canDeleteData':
          return userPermissions.canDeleteData
        default:
          return true
      }
    })

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}