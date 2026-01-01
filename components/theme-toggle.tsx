'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  collapsed?: boolean
}

export function ThemeToggle({ className, collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className={cn(
          'flex items-center rounded-lg transition-all text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
          collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2',
          className
        )}
        disabled
      >
        <Sun className="h-[15px] w-[15px] flex-shrink-0" strokeWidth={2} />
        {!collapsed && <span className="text-[11px] leading-tight font-medium">Theme</span>}
      </button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'flex items-center rounded-lg transition-all text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
        collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2',
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-[15px] w-[15px] flex-shrink-0" strokeWidth={2} />
      ) : (
        <Moon className="h-[15px] w-[15px] flex-shrink-0" strokeWidth={2} />
      )}
      {!collapsed && (
        <span className="text-[11px] leading-tight font-medium">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      )}
    </button>
  )
}
