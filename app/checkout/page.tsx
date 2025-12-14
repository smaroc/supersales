'use client'

import { useUser, useAuth } from '@clerk/nextjs'
import { RedirectToSignIn } from '@clerk/nextjs'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutContent() {
  const { user, isLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canceled = searchParams.get('canceled')

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'User already has access') {
          router.push('/dashboard')
          return
        }
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  // Auto-redirect to checkout on page load
  useEffect(() => {
    if (isSignedIn && user && !canceled) {
      handleCheckout()
    }
  }, [isSignedIn, user, canceled])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">SuperSales Pro</h1>
            <p className="text-blue-100 mt-1">AI-Powered Sales Coaching</p>
          </div>

          <div className="p-8">
            {canceled && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  Your checkout was canceled. Click below to try again.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-bold text-gray-900">47 EUR</span>
                <span className="text-gray-500">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-gray-600">
                <CheckIcon />
                <span className="ml-3">Unlimited call analysis</span>
              </li>
              <li className="flex items-center text-gray-600">
                <CheckIcon />
                <span className="ml-3">AI coaching insights</span>
              </li>
              <li className="flex items-center text-gray-600">
                <CheckIcon />
                <span className="ml-3">Team performance tracking</span>
              </li>
              <li className="flex items-center text-gray-600">
                <CheckIcon />
                <span className="ml-3">Fathom & Fireflies integration</span>
              </li>
              <li className="flex items-center text-gray-600">
                <CheckIcon />
                <span className="ml-3">Sales ranking & leaderboards</span>
              </li>
            </ul>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Redirecting to payment...
                </>
              ) : (
                'Subscribe Now'
              )}
            </button>

            <p className="mt-4 text-center text-xs text-gray-500">
              Secure payment powered by Stripe. Cancel anytime.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-green-500 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-300">Loading...</p>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutContent />
    </Suspense>
  )
}
