import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-provider'
import { HeroUIProvider } from '@/lib/heroui-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sales AI',
  description: 'AI-powered sales analytics and insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <HeroUIProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </HeroUIProvider>
      </body>
    </html>
  )
}