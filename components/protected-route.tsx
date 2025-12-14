'use client'

import { useUser, useAuth } from '@clerk/nextjs'
import { RedirectToSignIn } from '@clerk/nextjs'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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

interface UserData {
  permissions: UserPermissions
  hasAccess: boolean
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

function ProtectedRouteContent({
  children,
  requiredPermissions = []
}: ProtectedRouteProps) {
  const { user, isLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

  const checkoutSuccess = searchParams.get('checkout') === 'success'

  useEffect(() => {
    // Fetch user data including permissions and access status
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/users/by-clerk-id/${user.id}`)
          if (response.ok) {
            const userData: UserData = await response.json()
            setUserPermissions(userData.permissions)
            setHasAccess(userData.hasAccess ?? false)
          } else {
            // User doesn't exist in DB yet - no access
            setHasAccess(false)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setHasAccess(false)
        } finally {
          setIsCheckingAccess(false)
        }
      }
    }

    if (isSignedIn && user) {
      fetchUserData()
    } else {
      setIsCheckingAccess(false)
    }
  }, [user, isSignedIn, checkoutSuccess])

  // Show loading state while checking authentication
  if (!isLoaded || isCheckingAccess) {
    return <LoadingSpinner />
  }

  // Redirect to sign in if not authenticated
  if (!isSignedIn) {
    return <RedirectToSignIn />
  }

  // Redirect to checkout if user doesn't have access (unpaid)
  if (hasAccess === false) {
    router.push('/checkout')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to payment...</p>
        </div>
      </div>
    )
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

export function ProtectedRoute(props: ProtectedRouteProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProtectedRouteContent {...props} />
    </Suspense>
  )
}
