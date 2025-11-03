import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import { User, Invitation, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'
import { Resend } from 'resend'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()

    // Get current user and check if they're admin
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!currentUser.isAdmin && !['admin', 'owner'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Only admins can invite users' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role = 'viewer' } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.collection<User>(COLLECTIONS.USERS).findOne({
      email: email.toLowerCase()
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create invited user record (they'll complete signup with Clerk)
    const invitedUser: Omit<User, '_id'> = {
      clerkId: '', // Will be set when they complete Clerk signup
      organizationId: currentUser.organizationId,
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role,
      isAdmin: role === 'admin' || role === 'owner',
      isSuperAdmin: false, // Default to false for invited users
      isActive: false, // Will be activated when they complete signup
      permissions: {
        canViewAllData: ['admin', 'owner', 'head_of_sales'].includes(role),
        canManageUsers: ['admin', 'owner'].includes(role),
        canManageSettings: ['admin', 'owner'].includes(role),
        canExportData: ['admin', 'owner', 'head_of_sales', 'manager'].includes(role),
        canDeleteData: ['admin', 'owner'].includes(role)
      },
      preferences: {
        theme: 'system',
        notifications: {
          email: true,
          inApp: true,
          callSummaries: true,
          weeklyReports: false
        },
        dashboard: {
          defaultView: 'overview',
          refreshInterval: 300
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection<User>(COLLECTIONS.USERS).insertOne(invitedUser)
    const savedUser = await db.collection<User>(COLLECTIONS.USERS)
      .findOne({ _id: result.insertedId })

    if (!savedUser) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    // Create invitation record
    const invitation: Omit<Invitation, '_id'> = {
      organizationId: currentUser.organizationId,
      invitedBy: currentUser._id!,
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role,
      token: invitationToken,
      status: 'pending',
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection<Invitation>(COLLECTIONS.INVITATIONS).insertOne(invitation)

    // Send invitation email via Resend
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const inviteUrl = `${baseUrl}/accept-invitation?token=${invitationToken}`

      const roleDisplayNames: Record<string, string> = {
        sales_rep: 'Sales Representative',
        sales_manager: 'Sales Manager',
        head_of_sales: 'Head of Sales',
        admin: 'Administrator',
        manager: 'Manager',
        viewer: 'Viewer'
      }

      const roleDisplay = roleDisplayNames[role] || role

      const sentEmail = await resend.emails.send({
        from: 'SuperSales <invitations@mail.supersales.dev>',
        to: [email],
        subject: `You've been invited to join SuperSales! 🎉`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;
                  line-height: 1.6;
                  color: #333;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 0;
                }
                .container {
                  max-width: 600px;
                  margin: 40px auto;
                  background-color: #ffffff;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  padding: 40px 30px;
                  text-align: center;
                  color: white;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 700;
                }
                .content {
                  padding: 40px 30px;
                }
                .greeting {
                  font-size: 18px;
                  color: #333;
                  margin-bottom: 20px;
                }
                .message {
                  font-size: 16px;
                  color: #555;
                  margin-bottom: 30px;
                  line-height: 1.8;
                }
                .role-badge {
                  display: inline-block;
                  background-color: #667eea;
                  color: white;
                  padding: 6px 16px;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  margin: 10px 0;
                }
                .cta-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white !important;
                  text-decoration: none;
                  padding: 16px 32px;
                  border-radius: 6px;
                  font-size: 16px;
                  font-weight: 600;
                  margin: 20px 0;
                }
                .info-box {
                  background-color: #f8f9fa;
                  border-left: 4px solid #667eea;
                  padding: 15px 20px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .info-box p {
                  margin: 5px 0;
                  font-size: 14px;
                  color: #666;
                }
                .footer {
                  background-color: #f8f9fa;
                  padding: 30px;
                  text-align: center;
                  font-size: 14px;
                  color: #666;
                  border-top: 1px solid #e9ecef;
                }
                .expiry-warning {
                  background-color: #fff3cd;
                  border: 1px solid #ffc107;
                  border-radius: 4px;
                  padding: 12px 16px;
                  margin: 20px 0;
                  font-size: 14px;
                  color: #856404;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 You're Invited!</h1>
                </div>

                <div class="content">
                  <p class="greeting">Hi ${firstName},</p>

                  <p class="message">
                    <strong>${currentUser.firstName} ${currentUser.lastName}</strong> has invited you to join their team
                    on SuperSales, our advanced sales analytics and AI coaching platform.
                  </p>

                  <div class="info-box">
                    <p><strong>Your Role:</strong> <span class="role-badge">${roleDisplay}</span></p>
                  </div>

                  <p class="message">
                    With SuperSales, you'll be able to:
                  </p>
                  <ul style="font-size: 15px; color: #555; line-height: 1.8;">
                    <li>📞 Track and analyze all your sales calls</li>
                    <li>🤖 Get AI-powered coaching and feedback</li>
                    <li>📊 Monitor your performance metrics in real-time</li>
                    <li>🎯 Improve your closing rates and objection handling</li>
                    <li>🏆 Compete with your team on the leaderboard</li>
                  </ul>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteUrl}" class="cta-button">
                      Accept Invitation & Join Team
                    </a>
                  </div>

                  <div class="expiry-warning">
                    ⏰ <strong>Important:</strong> This invitation expires in 7 days.
                    Please accept it before it expires.
                  </div>

                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    If you have any questions, feel free to reply to this email or contact your team administrator.
                  </p>
                </div>

                <div class="footer">
                  <p>
                    <strong>SuperSales</strong> - AI-Powered Sales Analytics & Coaching
                  </p>
                  <p style="margin-top: 15px; font-size: 12px; color: #999;">
                    This invitation was sent to ${email}. If you received this email by mistake,
                    you can safely ignore it.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `
      })

      console.log(`✅ Invitation email sent to ${email}`, sentEmail)

      if (sentEmail.error) {
        console.error('Failed to send email:', sentEmail.error.message)
        return NextResponse.json(
          { error: sentEmail.error.message },
          { status: 500 }
        )
      }
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Continue even if email fails - invitation is saved in DB
    }

    return NextResponse.json({
      message: 'User invited successfully',
      user: {
        id: savedUser._id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        isActive: savedUser.isActive
      },
      invitation: {
        token: invitationToken,
        expiresAt: expiresAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error inviting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}