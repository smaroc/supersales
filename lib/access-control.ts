/**
 * Access Control Utilities
 *
 * Implements the new access control logic:
 * - Regular users: See only their own data
 * - Admins (isAdmin): See all data in their organization
 * - Super Admins (isSuperAdmin): See all data across all organizations
 */

import { ObjectId } from 'mongodb'
import { User } from './types'

export type AccessLevel = 'user' | 'admin' | 'superadmin'

/**
 * Determine the access level of a user based on flags
 */
export function getUserAccessLevel(user: User): AccessLevel {
  if (user.isSuperAdmin) return 'superadmin'
  if (user.isAdmin) return 'admin'
  return 'user'
}

/**
 * Build a MongoDB filter based on user access level
 *
 * @param user - The current user
 * @param options - Additional filtering options
 * @returns MongoDB filter object
 */
export function buildAccessFilter(
  user: User,
  options?: {
    includeUserId?: boolean  // Force include userId even for admins
    customUserId?: ObjectId  // Filter by specific user instead of current user
  }
): Record<string, any> {
  const filter: Record<string, any> = {}

  // SuperAdmin: No filtering (sees everything)
  if (user.isSuperAdmin) {
    return filter
  }

  // Admin: Filter by organization only (unless explicitly requesting userId)
  if (user.isAdmin && !options?.includeUserId) {
    filter.organizationId = user.organizationId
    return filter
  }

  // Regular User or Admin requesting specific user data: Filter by org and user
  filter.organizationId = user.organizationId

  if (options?.customUserId) {
    filter.userId = options.customUserId
  } else if (user._id) {
    filter.userId = user._id
  }

  return filter
}

/**
 * Check if user can access data from a specific organization
 */
export function canAccessOrganization(user: User, targetOrganizationId: ObjectId): boolean {
  // SuperAdmin can access any organization
  if (user.isSuperAdmin) return true

  // Admin and regular users can only access their own organization
  return user.organizationId.toString() === targetOrganizationId.toString()
}

/**
 * Check if user can access another user's data
 */
export function canAccessUserData(currentUser: User, targetUserId: ObjectId): boolean {
  // SuperAdmin can access any user
  if (currentUser.isSuperAdmin) return true

  // Check if it's the same user
  if (currentUser._id?.toString() === targetUserId.toString()) return true

  // Admin can access users in their organization
  if (currentUser.isAdmin) {
    // Note: This check requires fetching the target user to verify organization
    // Consider passing the target user's organizationId as a parameter
    return true  // Implement organization check when target user is available
  }

  // Regular users can only access their own data
  return false
}

/**
 * Check if user has admin privileges (Admin or SuperAdmin)
 */
export function hasAdminAccess(user: User): boolean {
  return user.isAdmin || user.isSuperAdmin
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(user: User): boolean {
  return user.isAdmin || user.isSuperAdmin
}

/**
 * Check if user can modify settings
 */
export function canModifySettings(user: User): boolean {
  return user.isAdmin || user.isSuperAdmin
}

/**
 * Check if user can delete data
 */
export function canDeleteData(user: User): boolean {
  return user.permissions?.canDeleteData || user.isSuperAdmin
}

/**
 * Check if user can export data
 */
export function canExportData(user: User): boolean {
  return user.permissions?.canExportData || hasAdminAccess(user)
}

/**
 * Build filter for call records based on access level
 * Includes support for salesRepId filtering
 */
export function buildCallRecordsFilter(
  user: User,
  options?: {
    salesRepId?: string
    source?: string
    status?: string
  }
): Record<string, any> {
  const baseFilter = buildAccessFilter(user)

  // Add optional filters
  if (options?.salesRepId) {
    baseFilter.salesRepId = options.salesRepId
  }

  if (options?.source) {
    baseFilter.source = options.source
  }

  if (options?.status) {
    baseFilter.status = options.status
  }

  return baseFilter
}

/**
 * Build filter for call analyses based on access level
 */
export function buildCallAnalysisFilter(
  user: User,
  options?: {
    salesRepId?: string
  }
): Record<string, any> {
  const baseFilter = buildAccessFilter(user)

  if (options?.salesRepId) {
    baseFilter.salesRepId = options.salesRepId
  }

  return baseFilter
}

/**
 * Validate user has permission to perform an action
 * Throws error if unauthorized
 */
export function validateAccess(
  user: User,
  requiredLevel: AccessLevel,
  customMessage?: string
): void {
  const userLevel = getUserAccessLevel(user)

  const levelHierarchy: Record<AccessLevel, number> = {
    'user': 1,
    'admin': 2,
    'superadmin': 3
  }

  if (levelHierarchy[userLevel] < levelHierarchy[requiredLevel]) {
    throw new Error(customMessage || 'Insufficient permissions')
  }
}

/**
 * Check if user can view specific navigation items
 * Supports both new flag-based and legacy role-based systems
 */
export function canAccessNavItem(
  user: User,
  itemConfig: {
    requireAdmin?: boolean
    requireSuperAdmin?: boolean
    roles?: string[]  // Legacy role-based support
  }
): boolean {
  // SuperAdmin can access everything
  if (user.isSuperAdmin) return true

  // Check super admin requirement
  if (itemConfig.requireSuperAdmin) {
    return user.isSuperAdmin
  }

  // Check admin requirement
  if (itemConfig.requireAdmin) {
    return user.isAdmin || user.isSuperAdmin
  }

  // Legacy role-based check (for backward compatibility)
  if (itemConfig.roles && itemConfig.roles.length > 0) {
    return itemConfig.roles.includes(user.role)
  }

  // If no restrictions, allow access
  return true
}
