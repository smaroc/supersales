'use client'

import { HeroUIProvider } from '@heroui/react'

export function HeroUIProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      {children}
    </HeroUIProvider>
  )
}

