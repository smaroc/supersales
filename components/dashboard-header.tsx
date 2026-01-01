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
import {  Bell, Settings, LogOut, User, UserCog } from 'lucide-react'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { getAllUsersForSelector } from '@/app/actions/users'
import { getImpersonationState, setImpersonation } from '@/app/actions/impersonation'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

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
    <header className="sticky top-0 z-40 h-[72px] flex items-center justify-between border-b border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-5">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 bg-gray-900 rounded-md">
          <Image src="/favicon.ico" alt="Super Sales" className="rounded-sm" width={16} height={16} />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
            Super Sales
          </span>
          {userData?.organizationId?.name && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{userData.organizationId.name}</span>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-1.5">
        {isSuperAdmin && (
          <div className="flex items-center gap-2 mr-2 pr-3 border-r border-gray-200/80 dark:border-gray-700/80">
            <Select
              value={impersonatedUser?._id || 'self'}
              onValueChange={handleImpersonationChange}
              disabled={loadingUsers}
            >
              <SelectTrigger className="h-8 w-[180px] text-[11px] font-medium border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-700 rounded-lg shadow-none">
                <div className="flex items-center gap-2">
                  <UserCog className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  <SelectValue placeholder="Select user">
                    {impersonatedUser
                      ? `${impersonatedUser.firstName} ${impersonatedUser.lastName}`
                      : 'View as myself'
                    }
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="self">View as myself</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {impersonatedUser && (
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold px-2 py-0.5 bg-orange-50 dark:bg-orange-900/30 rounded">
                Viewing as
              </span>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/80 dark:hover:bg-gray-800 rounded-lg"
        >
          <Bell className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/80 dark:hover:bg-gray-800 rounded-lg"
        >
          <Link href="/dashboard/profile">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 ml-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.imageUrl || userData?.avatar || ''} alt={`${userData?.firstName || ''} ${userData?.lastName || ''}`} />
                <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-semibold">
                  {userData?.firstName && userData?.lastName ? getInitials(userData.firstName, userData.lastName) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1.5 py-1">
                <p className="text-[11px] font-semibold leading-none text-gray-900 dark:text-gray-100">
                  {userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : user?.firstName || 'User'}
                </p>
                <p className="text-[10px] leading-none text-gray-600 dark:text-gray-400">
                  {userData?.email || user?.primaryEmailAddress?.emailAddress}
                </p>
                <p className="text-[10px] leading-none text-gray-500 dark:text-gray-500 capitalize">
                  {userData?.role?.replace('_', ' ')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-200/60 dark:bg-gray-700" />
            <DropdownMenuItem asChild className="text-[11px] dark:text-gray-200 focus:bg-gray-100/80 dark:focus:bg-gray-700 rounded-lg mx-1">
              <Link href="/dashboard/profile">
                <User className="mr-2 h-3.5 w-3.5" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-[11px] dark:text-gray-200 focus:bg-gray-100/80 dark:focus:bg-gray-700 rounded-lg mx-1">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
