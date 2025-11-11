import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/app/actions/users'

export async function GET() {
  try {
    const { currentUser } = await getAuthorizedUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log(`[API /users/me] Fetching profile for user: ${currentUser.email} (${currentUser._id?.toString()})`)

    return NextResponse.json({
      user: {
        id: currentUser._id,
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        role: currentUser.role,
        isAdmin: currentUser.isAdmin,
        isSuperAdmin: currentUser.isSuperAdmin,
        organizationId: currentUser.organizationId,
        createdAt: currentUser.createdAt,
        updatedAt: currentUser.updatedAt,
        lastLoginAt: currentUser.lastLoginAt,
        isActive: currentUser.isActive,
        avatar: currentUser.avatar,
        permissions: currentUser.permissions,
        customAnalysisCriteria: currentUser.customAnalysisCriteria,
        autoRunCustomCriteria: currentUser.autoRunCustomCriteria
      }
    })

  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { db, currentUser } = await getAuthorizedUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log(`[API /users/me] User ${currentUser.email} is updating their profile`)

    const { firstName, lastName } = await request.json()

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    const updateResult = await (db.collection('users') as any).updateOne(
      { _id: currentUser._id },
      {
        $set: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updatedUser = await (db.collection('users') as any).findOne({ _id: currentUser._id })

    return NextResponse.json({
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isAdmin: updatedUser.isAdmin,
        isActive: updatedUser.isActive,
        avatar: updatedUser.avatar,
        organizationId: updatedUser.organizationId,
        permissions: updatedUser.permissions,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}