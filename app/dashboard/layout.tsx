import { DashboardNav } from '@/components/dashboard-nav'
import { DashboardHeader } from '@/components/dashboard-header'
import { ProtectedRoute } from '@/components/protected-route'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div data-dashboard-root className="min-h-screen bg-gray-50/50">
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <div className="flex flex-1">
            <DashboardNav />
            <main
              data-dashboard
              className="flex-1 overflow-y-auto bg-gray-50/30 p-0"
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
