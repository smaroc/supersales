import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organizationId: string
      organizationName: string
      role: string
      permissions: {
        canViewAllData: boolean
        canManageUsers: boolean
        canManageSettings: boolean
        canExportData: boolean
        canDeleteData: boolean
      }
      preferences: {
        theme: 'light' | 'dark' | 'system'
        notifications: {
          email: boolean
          inApp: boolean
          callSummaries: boolean
          weeklyReports: boolean
        }
        dashboard: {
          defaultView: 'overview' | 'calls' | 'ranking' | 'analytics'
          refreshInterval: number
        }
      }
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    organizationId: string
    organizationName: string
    role: string
    permissions: {
      canViewAllData: boolean
      canManageUsers: boolean
      canManageSettings: boolean
      canExportData: boolean
      canDeleteData: boolean
    }
    preferences: {
      theme: 'light' | 'dark' | 'system'
      notifications: {
        email: boolean
        inApp: boolean
        callSummaries: boolean
        weeklyReports: boolean
      }
      dashboard: {
        defaultView: 'overview' | 'calls' | 'ranking' | 'analytics'
        refreshInterval: number
      }
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    organizationId: string
    organizationName: string
    role: string
    permissions: {
      canViewAllData: boolean
      canManageUsers: boolean
      canManageSettings: boolean
      canExportData: boolean
      canDeleteData: boolean
    }
    preferences: {
      theme: 'light' | 'dark' | 'system'
      notifications: {
        email: boolean
        inApp: boolean
        callSummaries: boolean
        weeklyReports: boolean
      }
      dashboard: {
        defaultView: 'overview' | 'calls' | 'ranking' | 'analytics'
        refreshInterval: number
      }
    }
  }
}