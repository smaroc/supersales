'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Phone,
  Award,
  Users,
  Settings,
  Home,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Call Analysis',
    href: '/dashboard/call-analysis',
    icon: Phone,
  },
  {
    name: 'Sales Ranking',
    href: '/dashboard/sales-ranking',
    icon: Award,
  },
  {
    name: 'Head of Sales',
    href: '/dashboard/head-of-sales',
    icon: Award,
    roles: ['head_of_sales', 'admin']
  },
  {
    name: '• Détail des appels',
    href: '/dashboard/head-of-sales/calls',
    icon: Phone,
    roles: ['head_of_sales', 'admin'],
    isSubMenu: true
  },
  {
    name: 'Admin',
    href: '/dashboard/admin',
    icon: Users,
    roles: ['admin', 'owner']
  },
  {
    name: '• User Management',
    href: '/dashboard/admin/users',
    icon: Users,
    roles: ['admin', 'owner'],
    isSubMenu: true
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return

      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const data = await response.json()
          setUserData(data.user)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    if (isLoaded && user) {
      fetchUserData()
    }
  }, [user, isLoaded])

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(userData?.role || '')
  })

  return (
    <nav className="sticky top-[128px] h-fit w-64 shrink-0 self-start rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-1.5">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          const isSubMenu = (item as any).isSubMenu

          return (
            <Button
              key={item.name}
              asChild
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900',
                isActive && 'bg-gray-100 text-gray-900 border-gray-200',
                isSubMenu && 'ml-4 text-xs font-normal text-gray-600 hover:text-gray-900'
              )}
            >
              <Link href={item.href} className="flex w-full items-center gap-3">
                <item.icon className={cn('h-4 w-4', isSubMenu && 'h-3 w-3')} />
                <span>{item.name}</span>
              </Link>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
