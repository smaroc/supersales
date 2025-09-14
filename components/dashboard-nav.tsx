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
import { useSession } from 'next-auth/react'

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
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(session?.user?.role || '')
  })

  return (
    <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
      <div className="p-6">
        <div className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Button
                key={item.name}
                asChild
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isActive && 'bg-primary text-primary-foreground',
                  (item as any).isSubMenu && 'ml-4 text-sm'
                )}
              >
                <Link href={item.href}>
                  <item.icon className={cn("mr-2", (item as any).isSubMenu ? "h-3 w-3" : "h-4 w-4")} />
                  {item.name}
                </Link>
              </Button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}