import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, TeamSubscription, COLLECTIONS } from '@/lib/types'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      clerkId: userId
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get team subscription for this user
    const teamSubscription = await db.collection<TeamSubscription>(COLLECTIONS.TEAM_SUBSCRIPTIONS).findOne({
      ownerId: currentUser._id
    })

    if (!teamSubscription) {
      return NextResponse.json({
        hasTeamSubscription: false,
        seatCount: 0,
        assignedSeats: [],
        monthlyTotal: 0,
        currentPeriodEnd: null
      })
    }

    // Get all users paid by this owner
    const assignedUsers = await db.collection<User>(COLLECTIONS.USERS).find({
      paidByUserId: currentUser._id,
      billingType: 'team'
    }).toArray()

    const assignedSeats = assignedUsers.map(user => ({
      odUserId: user._id?.toString(),
      odId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      assignedAt: user.teamSeatAssignedAt || user.createdAt,
      isActive: user.isActive,
      hasAccess: user.hasAccess
    }))

    const seatPrice = 47 // EUR per month
    const monthlyTotal = teamSubscription.seatCount * seatPrice

    return NextResponse.json({
      hasTeamSubscription: true,
      subscriptionId: teamSubscription.stripeSubscriptionId,
      isActive: teamSubscription.isActive,
      seatCount: teamSubscription.seatCount,
      assignedSeats,
      monthlyTotal,
      currentPeriodEnd: teamSubscription.stripeCurrentPeriodEnd
    })
  } catch (error) {
    console.error('Error fetching team seats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team seats' },
      { status: 500 }
    )
  }
}
