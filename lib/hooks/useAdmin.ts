'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isAdmin: boolean
  isActive: boolean
}

export function useAdmin() {
  const { user, isLoaded } = useUser()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserData()
    } else if (isLoaded && !user) {
      setLoading(false)
    }
  }, [isLoaded, user])

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const data = await response.json()
        setUserData(data.user)
        setIsAdmin(data.user.isAdmin || ['admin', 'owner'].includes(data.user.role))
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    user: userData,
    isAdmin,
    loading: loading || !isLoaded
  }
}