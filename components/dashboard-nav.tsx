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
  ChevronLeft,
  ChevronRight,
  Database,
  Calculator
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
    name: 'Estimation',
    href: '/dashboard/estimation',
    icon: Calculator,
  },
  {
    name: 'Call Analysis',
    href: '/dashboard/call-analysis',
    icon: Phone,
  },
  {
    name: 'Call Records',
    href: '/dashboard/call-records',
    icon: Database,
  },
  {
    name: 'Sales Ranking',
    href: '/dashboard/sales-ranking',
    icon: Award,
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
  const [isCollapsed, setIsCollapsed] = useState(false)

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
    <nav className={cn(
      "h-[calc(100vh-80px)] shrink-0 self-start rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && <span className="text-sm font-medium text-gray-700">Navigation</span>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
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
                    isSubMenu && 'ml-4 text-xs font-normal text-gray-600 hover:text-gray-900',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Link href={item.href} className={cn(
                    "flex w-full items-center gap-3",
                    isCollapsed && "justify-center"
                  )}>
                    <item.icon className={cn('h-4 w-4', isSubMenu && 'h-3 w-3')} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
