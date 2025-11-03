'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading')
  const [invitation, setInvitation] = useState<any>(null)

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
        setStatus('valid')
        setInvitation(data.invitation)
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

  // Valid invitation - show sign up form
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Welcome Card */}
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-center text-3xl">Welcome to SuperSales! 🎉</CardTitle>
              <CardDescription className="text-center text-base">
                You've been invited to join the team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {invitation && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-2">You're joining as:</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {invitation.firstName} {invitation.lastName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{invitation.email}</p>
                    <div className="mt-3">
                      <span className="inline-block bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {invitation.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">What you'll get access to:</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <span className="mr-2">📞</span>
                        <span>Track and analyze all your sales calls with AI</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">🤖</span>
                        <span>Get personalized coaching and feedback</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">📊</span>
                        <span>Monitor your performance in real-time</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">🎯</span>
                        <span>Improve closing rates and objection handling</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">🏆</span>
                        <span>Compete on the team leaderboard</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sign Up Form */}
          <div className="flex items-center justify-center">
            <SignUp
              routing="path"
              path="/accept-invitation"
              signInUrl="/sign-in"
              afterSignUpUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-xl'
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
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
