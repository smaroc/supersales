'use client'

import { useState } from 'react'
import { DashboardNav } from '@/components/dashboard-nav'
import { DashboardHeader } from '@/components/dashboard-header'

interface DashboardLayoutWrapperProps {
  children: React.ReactNode
}

export function DashboardLayoutWrapper({ children }: DashboardLayoutWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div data-dashboard-root className="min-h-screen bg-gray-50/50 dark:bg-black">
      <div className="flex min-h-screen flex-col">
        <DashboardHeader onMobileMenuToggle={toggleMobileMenu} />
        <div className="flex flex-1">
          <DashboardNav
            isMobileOpen={isMobileMenuOpen}
            onMobileClose={closeMobileMenu}
          />
          <main
            data-dashboard
            className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-black p-0"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
