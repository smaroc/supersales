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
import { BarChart3, Bell, Settings, LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export function DashboardHeader() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const [userData, setUserData] = useState<{
    firstName?: string
    lastName?: string
    email?: string
    role?: string
    organizationId?: { name?: string }
    avatar?: string
  } | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return

      try {
        const response = await fetch(`/api/users/by-clerk-id/${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setUserData(data)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    if (isLoaded && user) {
      fetchUserData()
    }
  }, [user, isLoaded])

  const handleLogout = () => {
    signOut()
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900 dark:text-white">Sales AI</span>
            {userData?.organizationId?.name && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{userData.organizationId.name}</span>
            )}
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/profile">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.imageUrl || userData?.avatar || ''} alt={`${userData?.firstName || ''} ${userData?.lastName || ''}`} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {userData?.firstName && userData?.lastName ? getInitials(userData.firstName, userData.lastName) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : user?.firstName || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userData?.email || user?.primaryEmailAddress?.emailAddress}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {userData?.role?.replace('_', ' ')}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}