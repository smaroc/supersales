import { DashboardLayoutWrapper } from '@/components/dashboard-layout-wrapper'
import { ProtectedRoute } from '@/components/protected-route'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <DashboardLayoutWrapper>
        {children}
      </DashboardLayoutWrapper>
    </ProtectedRoute>
  )
}
