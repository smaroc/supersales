'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getImpersonationState } from '@/app/actions/impersonation'

/**
 * Custom hook that triggers a callback when impersonation changes
 * This allows pages to refresh their data when a superadmin changes which user they're impersonating
 *
 * @param callback - Function to call when impersonation changes
 * @param dependencies - Optional dependencies array for the callback
 *
 * @example
 * ```tsx
 * useImpersonationRefresh(() => {
 *   fetchDashboardData()
 * })
 * ```
 */
export function useImpersonationRefresh(
  callback: () => void | Promise<void>,
  dependencies: any[] = []
) {
  const impersonationStateRef = useRef<string | null | undefined>(undefined)
  const callbackRef = useRef(callback)
  const isInitialized = useRef(false)

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...dependencies])

  const checkImpersonation = useCallback(async (skipCallback: boolean = false) => {
    try {
      console.log('[useImpersonationRefresh] Checking impersonation state...')
      const state = await getImpersonationState()
      const currentImpersonatedId = state.impersonatedUser?._id || null
      console.log('[useImpersonationRefresh] Current impersonated ID:', currentImpersonatedId)
      console.log('[useImpersonationRefresh] Previous impersonated ID:', impersonationStateRef.current)

      // If this is the first check, just initialize the ref without calling callback
      if (impersonationStateRef.current === undefined) {
        console.log('[useImpersonationRefresh] Initial state - setting ref without callback')
        impersonationStateRef.current = currentImpersonatedId
        isInitialized.current = true
        return
      }

      // If impersonation changed, trigger the callback
      if (currentImpersonatedId !== impersonationStateRef.current && !skipCallback) {
        console.log('[useImpersonationRefresh] Impersonation changed! Refreshing data...')
        impersonationStateRef.current = currentImpersonatedId

        // Call the callback to refresh data
        await callbackRef.current()
        console.log('[useImpersonationRefresh] Data refresh complete')
      } else {
        console.log('[useImpersonationRefresh] No change detected')
        impersonationStateRef.current = currentImpersonatedId
      }
    } catch (error) {
      console.error('[useImpersonationRefresh] Error checking impersonation state:', error)
    }
  }, [])

  useEffect(() => {
    // Initialize state on mount without triggering callback
    checkImpersonation()

    // Listen for impersonation change events from the header
    const handleImpersonationChange = (event: Event) => {
      console.log('[useImpersonationRefresh] Received impersonationChanged event:', event)
      checkImpersonation()
    }
    window.addEventListener('impersonationChanged', handleImpersonationChange)

    // Also check when tab becomes visible (in case they changed impersonation in another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkImpersonation()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('impersonationChanged', handleImpersonationChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkImpersonation])
}
