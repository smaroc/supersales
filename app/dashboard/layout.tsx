import { DashboardNav } from '@/components/dashboard-nav'
import { DashboardHeader } from '@/components/dashboard-header'
import { ProtectedRoute } from '@/components/protected-route'
import { Toaster } from 'sonner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div data-dashboard-root className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <div className="flex flex-1">
            <DashboardNav />
            <main
              data-dashboard
              className="flex-1 overflow-y-auto bg-white px-6 py-8"
            >
              <div className="mx-auto w-full max-w-7xl space-y-8">
                {children}
              </div>
            </main>
          </div>
        </div>
        <Toaster position="top-right" richColors closeButton />
      </div>
    </ProtectedRoute>
  )
}
