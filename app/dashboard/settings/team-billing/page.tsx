'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Users,
  Trash2,
  Shield,
  AlertCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'

interface TeamSeat {
  odUserId: string
  odId?: string
  email: string
  firstName: string
  lastName: string
  assignedAt: string
  isActive: boolean
  hasAccess: boolean
}

interface TeamSubscriptionData {
  hasTeamSubscription: boolean
  subscriptionId?: string
  isActive?: boolean
  seatCount: number
  assignedSeats: TeamSeat[]
  monthlyTotal: number
  currentPeriodEnd?: string
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function TeamBillingPage() {
  const { user: clerkUser, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [teamData, setTeamData] = useState<TeamSubscriptionData | null>(null)
  const [creating, setCreating] = useState(false)
  const [removingSeat, setRemovingSeat] = useState<string | null>(null)
  const [currentUserData, setCurrentUserData] = useState<{ role: string } | null>(null)

  const userRole = currentUserData?.role || ''

  // Fetch current user data from MongoDB
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const data = await response.json()
          setCurrentUserData(data.user)
        }
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }

    if (isLoaded && clerkUser) {
      fetchCurrentUser()
    }
  }, [isLoaded, clerkUser])

  useEffect(() => {
    if (currentUserData) {
      fetchTeamData()
    }
  }, [currentUserData])

  // Show loading while fetching user data
  if (!currentUserData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  // Check permissions
  if (!['admin', 'owner', 'head_of_sales'].includes(userRole)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Acces refuse
          </h2>
          <p className="text-gray-600 dark:text-gray-500 mt-2">
            Cette page est reservee aux administrateurs et Head of Sales
          </p>
        </div>
      </div>
    )
  }

  const fetchTeamData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/team-seats')
      if (response.ok) {
        const data = await response.json()
        setTeamData(data)
      }
    } catch (error) {
      console.error('Error fetching team data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeamSubscription = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/stripe/create-team-subscription', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()

        if (data.clientSecret) {
          // Redirect to Stripe checkout for payment
          const stripe = await stripePromise
          if (stripe) {
            const { error } = await stripe.confirmCardPayment(data.clientSecret)
            if (error) {
              alert(`Erreur de paiement: ${error.message}`)
            } else {
              alert('Abonnement team cree avec succes!')
              fetchTeamData()
            }
          }
        } else {
          // Subscription created without payment (trial or immediate)
          alert('Abonnement team cree avec succes!')
          fetchTeamData()
        }
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating team subscription:', error)
      alert('Erreur lors de la creation de l\'abonnement')
    } finally {
      setCreating(false)
    }
  }

  const handleRemoveSeat = async (userId: string, email: string) => {
    if (!confirm(`Etes-vous sur de vouloir retirer ${email} de votre abonnement team?\n\nL'utilisateur perdra son acces et devra souscrire individuellement.`)) {
      return
    }

    setRemovingSeat(userId)
    try {
      const response = await fetch('/api/stripe/remove-team-seat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ odUserId: userId }),
      })

      if (response.ok) {
        alert('Siege retire avec succes')
        fetchTeamData()
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Error removing seat:', error)
      alert('Erreur lors du retrait du siege')
    } finally {
      setRemovingSeat(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <CreditCard className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Team Billing</h1>
      </div>

      {/* No Team Subscription */}
      {!teamData?.hasTeamSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-950 dark:text-white">Creer un abonnement Team</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Payez pour votre equipe et donnez-leur un acces immediat a SuperSales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Comment ca fonctionne
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>- Creez un abonnement team (47 EUR/siege/mois)</li>
                    <li>- Lors de l'invitation, choisissez "Team Billing"</li>
                    <li>- L'utilisateur aura acces immediat sans payer</li>
                    <li>- Votre facture sera ajustee au prorata</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                    47 EUR / siege / mois
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Premier siege inclus a la creation
                  </p>
                </div>
                <Button
                  onClick={handleCreateTeamSubscription}
                  disabled={creating}
                  size="lg"
                >
                  {creating ? 'Creation...' : 'Creer mon abonnement Team'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Team Subscription */}
      {teamData?.hasTeamSubscription && (
        <>
          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <CardTitle className="text-gray-950 dark:text-white">Abonnement Team Actif</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Gerez vos sieges et voyez votre facturation
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={teamData.isActive ? 'default' : 'secondary'}>
                  {teamData.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sieges utilises</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {teamData.assignedSeats.length} / {teamData.seatCount}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cout mensuel</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {teamData.monthlyTotal} EUR
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Prochaine facture</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {teamData.currentPeriodEnd
                      ? new Date(teamData.currentPeriodEnd).toLocaleDateString('fr-FR')
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6" />
                <div>
                  <CardTitle className="text-gray-950 dark:text-white">Membres de l'equipe</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Utilisateurs payes par votre abonnement team
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teamData.assignedSeats.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Aucun membre pour le moment
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Invitez des utilisateurs avec le mode "Team Billing" dans la gestion des utilisateurs
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamData.assignedSeats.map((seat) => (
                    <div
                      key={seat.odUserId}
                      className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {seat.firstName[0]}{seat.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {seat.firstName} {seat.lastName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {seat.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <Badge variant={seat.hasAccess ? 'default' : 'secondary'}>
                            {seat.hasAccess ? 'Actif' : 'En attente'}
                          </Badge>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(seat.assignedAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSeat(seat.odUserId, seat.email)}
                          disabled={removingSeat === seat.odUserId}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card>
            <CardContent className="pt-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                      Information importante
                    </h4>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      <li>- Pour ajouter un siege, invitez un utilisateur avec le mode "Team Billing"</li>
                      <li>- Retirer un siege revoquera l'acces de l'utilisateur</li>
                      <li>- L'utilisateur pourra ensuite souscrire individuellement</li>
                      <li>- La facturation est ajustee au prorata automatiquement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
