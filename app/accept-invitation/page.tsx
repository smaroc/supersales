'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, Loader2, AlertCircle } from 'lucide-react'

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading')

  useEffect(() => {
    if (token) {
      verifyInvitation(token)
    } else {
      setStatus('invalid')
    }
  }, [token])

  const verifyInvitation = async (invitationToken: string) => {
    try {
      const response = await fetch(`/api/invitations/verify?token=${invitationToken}`)
      const data = await response.json()

      if (response.ok && data.valid) {
        // Redirect to sign-up with email pre-filled
        const signUpUrl = new URL('/sign-up', window.location.origin)
        signUpUrl.searchParams.set('invitation_token', invitationToken)
        signUpUrl.searchParams.set('email_address', data.invitation.email)
        signUpUrl.searchParams.set('first_name', data.invitation.firstName)
        signUpUrl.searchParams.set('last_name', data.invitation.lastName)
        signUpUrl.searchParams.set('role', data.invitation.role)

        router.push(signUpUrl.toString())
      } else if (data.expired) {
        setStatus('expired')
      } else {
        setStatus('invalid')
      }
    } catch (error) {
      console.error('Error verifying invitation:', error)
      setStatus('invalid')
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-gray-700">Verifying your invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-center text-2xl">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              This invitation link is invalid or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-orange-500" />
            </div>
            <CardTitle className="text-center text-2xl">Invitation Expired</CardTitle>
            <CardDescription className="text-center">
              This invitation has expired. Please contact your administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-gray-700">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  )
}
