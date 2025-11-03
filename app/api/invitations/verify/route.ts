import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import { Invitation, COLLECTIONS } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    // Find invitation by token
    const invitation = await db.collection<Invitation>(COLLECTIONS.INVITATIONS).findOne({
      token,
      status: 'pending'
    })

    if (!invitation) {
      return NextResponse.json({
        valid: false,
        error: 'Invitation not found or already used'
      })
    }

    // Check if invitation has expired
    const now = new Date()
    if (invitation.expiresAt < now) {
      // Update status to expired
      await db.collection<Invitation>(COLLECTIONS.INVITATIONS).updateOne(
        { token },
        {
          $set: {
            status: 'expired',
            updatedAt: new Date()
          }
        }
      )

      return NextResponse.json({
        valid: false,
        expired: true,
        error: 'Invitation has expired'
      })
    }

    // Invitation is valid
    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    })

  } catch (error) {
    console.error('Error verifying invitation:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
