# Invitation System with Resend Email

This document describes the invitation system implementation for inviting users to the platform.

## Overview

When an admin invites a new user to the platform, the system:
1. Creates a user record in the database
2. Generates a unique invitation token
3. Stores the invitation in MongoDB
4. Sends a beautiful email invitation via Resend
5. Provides a secure link for the invitee to accept and sign up

## Components

### 1. Database Schema

**Invitation Collection** (`invitations`)
```typescript
interface Invitation {
  _id: ObjectId
  organizationId: ObjectId
  invitedBy: ObjectId
  email: string
  firstName: string
  lastName: string
  role: 'owner' | 'admin' | 'manager' | 'head_of_sales' | 'sales_rep' | 'viewer'
  token: string (64-character hex string)
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: Date (7 days from creation)
  acceptedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

### 2. API Endpoints

#### POST `/api/users/invite`
Creates a new user invitation and sends email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "sales_rep"
}
```

**Response:**
```json
{
  "message": "User invited successfully",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "sales_rep",
    "isActive": false
  },
  "invitation": {
    "token": "abc123...",
    "expiresAt": "2025-01-10T..."
  }
}
```

#### GET `/api/invitations/verify?token=xxx`
Verifies if an invitation token is valid.

**Response:**
```json
{
  "valid": true,
  "invitation": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "sales_rep",
    "expiresAt": "2025-01-10T..."
  }
}
```

### 3. Email Template

The invitation email is sent via **Resend** and includes:
- Personalized greeting with invitee's name
- Information about who invited them
- Their assigned role
- List of platform benefits
- Prominent "Accept Invitation" button
- Expiration warning (7 days)
- Professional branding

**Email Configuration:**
- From: `SuperSales <invitations@supersales.com>`
- Subject: `You've been invited to join SuperSales! 🎉`
- Template: HTML with inline CSS for maximum compatibility

### 4. Accept Invitation Page

**URL:** `/accept-invitation?token=xxx`

The page:
1. Verifies the invitation token
2. Shows invitation details (name, role, organization)
3. Displays Clerk SignUp component for account creation
4. Handles expired/invalid tokens gracefully

## Environment Variables

```bash
# Resend API Key (required)
RESEND_API_KEY=re_xxx...

# Optional: Custom app URL (defaults to localhost:3000)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## User Flow

1. **Admin invites user**
   - Admin fills form in `/dashboard/profile`
   - Clicks "Send Invitation"
   - API creates user record + invitation + sends email

2. **User receives email**
   - Email arrives from SuperSales
   - Contains invitation link with token

3. **User clicks link**
   - Redirected to `/accept-invitation?token=xxx`
   - Token is verified
   - Invitation details displayed

4. **User signs up**
   - Fills Clerk sign-up form
   - Account is created
   - User record is linked to Clerk account
   - User is redirected to dashboard

5. **Invitation marked as accepted**
   - Status updated to 'accepted'
   - acceptedAt timestamp recorded

## Security Features

- **Secure tokens**: 64-character cryptographically random hex strings
- **Expiration**: Invitations expire after 7 days
- **One-time use**: Status changes prevent reuse
- **Organization isolation**: Users can only be invited to their own organization

## Files Modified/Created

### New Files
- `/lib/types.ts` - Added Invitation interface
- `/lib/email-templates/invitation.tsx` - Email template (optional, using inline HTML)
- `/app/accept-invitation/page.tsx` - Accept invitation page
- `/app/api/invitations/verify/route.ts` - Verify invitation endpoint
- `/INVITATION_SYSTEM.md` - This documentation

### Modified Files
- `/app/api/users/invite/route.ts` - Added Resend integration
- `/app/dashboard/profile/page.tsx` - Already had invitation form

## Testing

### Test Invitation Flow
1. Login as admin
2. Go to `/dashboard/profile`
3. Fill invitation form:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Role: Sales Representative
4. Click "Send Invitation"
5. Check email at test@example.com
6. Click invitation link
7. Complete sign-up process

### Email Testing (Development)
```typescript
// Check Resend logs at: https://resend.com/logs
// Verify email was sent successfully
```

## Troubleshooting

### Email not sending
- Verify `RESEND_API_KEY` is set in `.env.local`
- Check Resend dashboard for errors
- Verify sender email is configured in Resend

### Invalid token error
- Check token in URL is complete
- Verify invitation hasn't expired
- Check invitation status in MongoDB

### Sign-up issues
- Verify Clerk configuration
- Check callback URLs are correct
- Ensure user email matches invitation email

## Future Enhancements

- [ ] Resend invitation if expired
- [ ] Bulk invite multiple users
- [ ] Custom email templates per organization
- [ ] Track invitation acceptance rate
- [ ] Reminder emails for pending invitations
- [ ] Admin dashboard for invitation management
