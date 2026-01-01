'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Phone,
  Award,
  Users,
  Settings,
  Home,
  Database,
  Search,
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Package
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: Home,
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
    name: 'Produits',
    href: '/dashboard/products',
    icon: Package,
  },
  {
    name: 'Reports',
    href: '/dashboard/head-of-sales',
    icon: BarChart3,
    roles: ['head_of_sales', 'manager', 'admin', 'owner']
  },
]

const adminNavigation = [
  {
    name: 'Admin',
    href: '/dashboard/admin',
    icon: Users,
    roles: ['admin', 'owner']
  },
]

const settingsNavigation = [
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

  const filteredAdminNav = adminNavigation.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(userData?.role || '')
  })

  return (
    <nav className={cn(
      "h-[calc(100vh-72px)] shrink-0 self-start bg-white dark:bg-gray-900 border-r border-gray-200/80 dark:border-gray-700/80 transition-all duration-300 relative",
      isCollapsed ? "w-[60px]" : "w-[240px]"
    )}>
      <div className="flex h-full flex-col">
        {/* Quick Actions Search & Toggle */}
        <div className={cn(
          "border-b border-gray-200/60 dark:border-gray-700/60 transition-all duration-300 flex items-center gap-2",
          isCollapsed ? "p-2 flex-col" : "p-3"
        )}>
          {!isCollapsed ? (
            <>
              <button className="flex-1 flex items-center gap-2.5 px-3 py-2 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50/80 dark:bg-gray-800/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-lg border border-gray-200/60 dark:border-gray-700/60 transition-colors">
                <Search className="h-3.5 w-3.5" />
                <span>Quick Actions</span>
              </button>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center justify-center p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 rounded-lg transition-all"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <button className="w-full flex items-center justify-center p-2 text-gray-400 dark:text-gray-500 bg-gray-50/80 dark:bg-gray-800/80 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-lg border border-gray-200/60 dark:border-gray-700/60 transition-colors">
                <Search className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-center p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 rounded-lg transition-all"
                title="Expand sidebar"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Main Navigation */}
        <div className={cn(
          "flex-1 overflow-y-auto py-4 transition-all duration-300",
          isCollapsed ? "px-2" : "px-3"
        )}>
          <div className="space-y-6">
            {/* Pages Section */}
            <div className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
                  Pages
                </h3>
              )}
              <div className="space-y-0.5">
                {filteredNavigation.map((item) => {
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={cn(
                        'flex items-center rounded-lg transition-all',
                        isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2',
                        isActive
                          ? 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-100 font-medium'
                      )}
                    >
                      <item.icon className="h-[15px] w-[15px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                      {!isCollapsed && <span className="text-[11px] leading-tight">{item.name}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Admin Section - Only show if has admin items */}
            {filteredAdminNav.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                <div className="space-y-0.5">
                  {filteredAdminNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href)

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        title={isCollapsed ? item.name : undefined}
                        className={cn(
                          'flex items-center rounded-lg transition-all',
                          isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2',
                          isActive
                            ? 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 font-semibold'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-100 font-medium'
                        )}
                      >
                        <item.icon className="h-[15px] w-[15px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                        {!isCollapsed && <span className="text-[11px] leading-tight">{item.name}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings at Bottom */}
        <div className={cn(
          "py-3 border-t border-gray-200/60 dark:border-gray-700/60 transition-all duration-300",
          isCollapsed ? "px-2" : "px-3"
        )}>
          <div className="space-y-0.5">
            <ThemeToggle collapsed={isCollapsed} />
            {settingsNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center rounded-lg transition-all',
                    isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2',
                    isActive
                      ? 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-100 font-medium'
                  )}
                >
                  <item.icon className="h-[15px] w-[15px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  {!isCollapsed && <span className="text-[11px] leading-tight">{item.name}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
