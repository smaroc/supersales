'use client'

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle } from 'lucide-react'

function SignUpContent() {
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get('invitation_token')
  const emailAddress = searchParams.get('email_address')
  const firstName = searchParams.get('first_name')
  const lastName = searchParams.get('last_name')
  const role = searchParams.get('role')

  const isInvitation = !!invitationToken && !!emailAddress

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      {isInvitation ? (
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            {/* Welcome Card for Invitations */}
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-center text-3xl">Welcome to SuperSales!</CardTitle>
                <CardDescription className="text-center text-base">
                  You've been invited to join the team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-2">You're joining as:</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {firstName} {lastName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{emailAddress}</p>
                    <div className="mt-3">
                      <span className="inline-block bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {role?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Please create your account with <strong>{emailAddress}</strong> to accept the invitation.
                    </p>
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
              </CardContent>
            </Card>

            {/* Sign Up Form */}
            <div className="flex items-center justify-center">
              <SignUp
                initialValues={{
                  emailAddress: emailAddress || '',
                  firstName: firstName || '',
                  lastName: lastName || ''
                }}
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-xl',
                    formFieldInput__emailAddress: {
                      backgroundColor: '#f3f4f6',
                      cursor: 'not-allowed'
                    },
                    // Hide OAuth providers for invitations
                    socialButtonsBlockButton: { display: 'none' },
                    socialButtonsProviderIcon: { display: 'none' },
                    dividerRow: { display: 'none' }
                  }
                }}
                signInUrl="/sign-in"
                afterSignUpUrl={`/api/invitations/accept?token=${invitationToken}`}
                redirectUrl={`/api/invitations/accept?token=${invitationToken}`}
              />
            </div>
          </div>
        </div>
      ) : (
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-xl'
            }
          }}
          signInUrl="/sign-in"
          afterSignUpUrl="/dashboard"
        />
      )}
    </div>
  )
}

export default function SignUpPage() {
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
      <SignUpContent />
    </Suspense>
  )
}
