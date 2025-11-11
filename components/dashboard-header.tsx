'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, Bell, Settings, LogOut, User, UserCog } from 'lucide-react'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { getAllUsersForSelector } from '@/app/actions/users'
import { getImpersonationState, setImpersonation } from '@/app/actions/impersonation'
import { useRouter } from 'next/navigation'

export function DashboardHeader() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [userData, setUserData] = useState<{
    firstName?: string
    lastName?: string
    email?: string
    role?: string
    isSuperAdmin?: boolean
    organizationId?: { name?: string }
    avatar?: string
  } | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [users, setUsers] = useState<Array<{ _id: string; email: string; firstName: string; lastName: string }>>([])
  const [impersonatedUser, setImpersonatedUser] = useState<{
    _id: string
    email: string
    firstName: string
    lastName: string
  } | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return

      try {
        const response = await fetch(`/api/users/by-clerk-id/${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setUserData(data)
          setIsSuperAdmin(data.isSuperAdmin || false)
          
          // If SuperAdmin, fetch users for selector and check impersonation state
          if (data.isSuperAdmin) {
            await fetchUsers()
            await checkImpersonationState()
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    if (isLoaded && user) {
      fetchUserData()
    }
  }, [user, isLoaded])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const allUsers = await getAllUsersForSelector()
      setUsers(allUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const checkImpersonationState = async () => {
    try {
      const state = await getImpersonationState()
      if (state.impersonatedUser) {
        setImpersonatedUser(state.impersonatedUser)
      } else {
        setImpersonatedUser(null)
      }
    } catch (error) {
      console.error('Error checking impersonation state:', error)
    }
  }

  const handleImpersonationChange = async (userId: string) => {
    try {
      console.log('[DashboardHeader] Impersonation change requested for userId:', userId)
      // "self" means view as myself (clear impersonation)
      const impersonatedUserId = userId === 'self' ? null : userId
      console.log('[DashboardHeader] Setting impersonation to:', impersonatedUserId)
      const result = await setImpersonation(impersonatedUserId)
      console.log('[DashboardHeader] Impersonation result:', result)

      if (result.success) {
        if (result.impersonatedUser) {
          setImpersonatedUser(result.impersonatedUser)
          console.log('[DashboardHeader] Impersonated user set:', result.impersonatedUser)
        } else {
          setImpersonatedUser(null)
          console.log('[DashboardHeader] Impersonation cleared')
        }
        // Dispatch custom event to notify other components
        console.log('[DashboardHeader] Dispatching impersonationChanged event')
        window.dispatchEvent(new CustomEvent('impersonationChanged', {
          detail: { impersonatedUserId: result.impersonatedUser?._id || null }
        }))
        // Refresh the page to apply impersonation
        console.log('[DashboardHeader] Calling router.refresh()')
        router.refresh()
      } else {
        console.error('[DashboardHeader] Impersonation failed:', result.error || result.message)
        alert(`Error: ${result.error || result.message}`)
      }
    } catch (error) {
      console.error('[DashboardHeader] Error setting impersonation:', error)
      alert('Failed to set impersonation')
    }
  }

  const handleLogout = () => {
    signOut()
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border border-gray-200 bg-white px-6 py-4 shadow-sm">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-semibold tracking-tight text-gray-900">Super Sales</span>
          {userData?.organizationId?.name && (
            <span className="text-sm text-gray-600">{userData.organizationId.name}</span>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {isSuperAdmin && (
          <div className="flex items-center gap-2 border-r border-gray-200 pr-2 mr-2">
            <UserCog className="h-4 w-4 text-gray-500" />
            <Select
              value={impersonatedUser?._id || 'self'}
              onValueChange={handleImpersonationChange}
              disabled={loadingUsers}
            >
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Select user to impersonate">
                  {impersonatedUser 
                    ? `${impersonatedUser.firstName} ${impersonatedUser.lastName} (${impersonatedUser.email})`
                    : 'View as myself'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">View as myself</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {impersonatedUser && (
              <span className="text-xs text-orange-600 font-medium px-2 py-1 bg-orange-50 rounded">
                Impersonating
              </span>
            )}
          </div>
        )}
        <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-700 transition-colors hover:bg-gray-100">
          <Bell className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-10 w-10 text-gray-700 transition-colors hover:bg-gray-100"
        >
          <Link href="/dashboard/profile">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-11 w-11 rounded-full p-0">
              <Avatar className="h-11 w-11">
                <AvatarImage src={user?.imageUrl || userData?.avatar || ''} alt={`${userData?.firstName || ''} ${userData?.lastName || ''}`} />
                <AvatarFallback className="bg-gray-200 text-gray-700">
                  {userData?.firstName && userData?.lastName ? getInitials(userData.firstName, userData.lastName) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-lg border border-gray-200 bg-white" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-gray-900">
                  {userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : user?.firstName || 'User'}
                </p>
                <p className="text-xs leading-none text-gray-600">
                  {userData?.email || user?.primaryEmailAddress?.emailAddress}
                </p>
                <p className="text-xs leading-none text-gray-500 capitalize">
                  {userData?.role?.replace('_', ' ')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="focus:bg-gray-100">
              <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="focus:bg-gray-100">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
