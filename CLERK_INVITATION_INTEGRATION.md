# Clerk + Invitation System Integration

This document explains how the Clerk authentication system integrates with the email invitation system.

## How It Works

### 1. Invitation Flow

```
Admin invites user → Email sent → User clicks link → Accept invitation page →
Clerk sign-up (email pre-filled) → User creates account → Webhook triggers →
User linked to invitation → Account activated → User redirected to dashboard
```

### 2. Components

#### A. Accept Invitation Page (`/accept-invitation`)
- Verifies invitation token
- Displays invitation details (name, role, email)
- Shows Clerk SignUp component with **pre-filled email**
- Email field is automatically populated from invitation

#### B. Clerk Webhook (`/api/webhooks/clerk`)
- Listens to `user.created` events from Clerk
- Finds existing user record (created during invitation)
- Links Clerk ID to database user
- Activates user account (`isActive: true`)
- Marks invitation as `accepted`

#### C. Database Records

**User Record (Created during invitation):**
```javascript
{
  _id: ObjectId,
  clerkId: '', // Empty until sign-up
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  organizationId: ObjectId,
  role: 'sales_rep',
  isActive: false, // Will be true after sign-up
  // ... other fields
}
```

**After Clerk Sign-up:**
```javascript
{
  _id: ObjectId,
  clerkId: 'user_xxx', // ✅ Filled by webhook
  email: 'user@example.com',
  isActive: true, // ✅ Activated
  lastLoginAt: Date,
  // ... other fields
}
```

**Invitation Record:**
```javascript
{
  _id: ObjectId,
  email: 'user@example.com',
  token: 'abc123...',
  status: 'accepted', // ✅ Updated by webhook
  acceptedAt: Date, // ✅ Set by webhook
  // ... other fields
}
```

## Setup Instructions

### 1. Configure Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** in the sidebar
3. Click **Add Endpoint**
4. Set URL: `https://yourdomain.com/api/webhooks/clerk`
5. Subscribe to event: `user.created`
6. Copy the **Signing Secret**

### 2. Add Environment Variable

Add to `.env.local`:
```bash
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 3. Test the Integration

#### Development (using ngrok or similar):
```bash
# 1. Start your dev server
npm run dev

# 2. Expose localhost with ngrok
ngrok http 3000

# 3. Use ngrok URL in Clerk webhook settings
# Example: https://abc123.ngrok.io/api/webhooks/clerk

# 4. Test by creating an invitation and signing up
```

#### Production:
```bash
# Use your production URL
https://yourdomain.com/api/webhooks/clerk
```

## User Journey Example

### Step 1: Admin Invites User
```javascript
POST /api/users/invite
{
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "sales_rep"
}

// Creates:
// 1. User record (clerkId = '', isActive = false)
// 2. Invitation record (status = 'pending')
// 3. Sends email with link
```

### Step 2: User Receives Email
Email contains link: `https://app.com/accept-invitation?token=abc123...`

### Step 3: User Clicks Link
- Page verifies token validity
- Shows invitation details
- Displays Clerk sign-up form with email pre-filled

### Step 4: User Signs Up via Clerk
```javascript
// Clerk handles:
// - Email verification
// - Password creation
// - Account creation
// - Redirects to afterSignUpUrl
```

### Step 5: Webhook Triggers
```javascript
POST /api/webhooks/clerk
{
  type: 'user.created',
  data: {
    id: 'user_2abc123',
    email_addresses: [{ email_address: 'john@example.com' }],
    first_name: 'John',
    last_name: 'Doe'
  }
}

// Webhook updates:
// 1. User.clerkId = 'user_2abc123'
// 2. User.isActive = true
// 3. Invitation.status = 'accepted'
```

### Step 6: User Access Dashboard
- User is authenticated via Clerk
- Middleware finds user by clerkId
- User has access based on role and organization

## Security Features

### 1. Email Verification
- Clerk automatically requires email verification
- User must verify email before accessing dashboard

### 2. Token Validation
- Invitation tokens are cryptographically secure
- Tokens expire after 7 days
- One-time use (status changes to 'accepted')

### 3. Organization Isolation
- Users are automatically assigned to correct organization
- Permissions are inherited from invitation

### 4. Webhook Security
- Clerk signs all webhooks with HMAC
- Webhook endpoint verifies signature using svix
- Invalid signatures are rejected

## Handling Edge Cases

### Case 1: User Already Has Clerk Account
If a user tries to sign up with an email that already has a Clerk account:
- Clerk will show "Sign in instead" message
- User should sign in, not sign up
- After sign-in, they'll be redirected to dashboard

**Solution:** Update invitation email to check if user exists:
```typescript
// In invitation email:
"If you already have an account, please sign in instead of signing up."
```

### Case 2: Invitation Expired
- Token verification fails
- User sees "Invitation Expired" page
- Admin must resend invitation with new token

### Case 3: User Signs Up Without Invitation
- Webhook receives user.created event
- No existing user record found in database
- Options:
  - Create basic user record (current implementation)
  - Reject and require invitation
  - Send to onboarding flow

### Case 4: Webhook Fails
If webhook fails to process:
- User will have Clerk account but not be linked to DB
- Middleware will auto-create user record on first login
- Manual fix: Update user.clerkId in database

## Troubleshooting

### Issue: User signed up but not activated

**Check:**
```javascript
// 1. Verify webhook was received
// Check Clerk Dashboard > Webhooks > Logs

// 2. Check user record
db.users.findOne({ email: 'user@example.com' })
// Should have: clerkId, isActive: true

// 3. Check invitation
db.invitations.findOne({ email: 'user@example.com' })
// Should have: status: 'accepted', acceptedAt: Date
```

**Fix:**
```javascript
// Manually update user
db.users.updateOne(
  { email: 'user@example.com' },
  {
    $set: {
      clerkId: 'user_xxx', // Get from Clerk
      isActive: true,
      updatedAt: new Date()
    }
  }
)
```

### Issue: Webhook signature verification fails

**Causes:**
- Wrong CLERK_WEBHOOK_SECRET
- Clock skew between servers
- Request body modified

**Fix:**
- Verify secret in Clerk Dashboard
- Ensure raw body is passed to svix
- Check server time synchronization

### Issue: Email not pre-filled in sign-up form

**Causes:**
- Token verification failed
- Invitation not found
- Email not passed to SignUp component

**Fix:**
- Check invitation token in URL
- Verify API response includes email
- Check SignUp initialValues prop

## Alternative Approaches

### Option 1: Clerk Invitations (Native)
Use Clerk's built-in invitation system:
- Pros: Fully integrated, no webhook needed
- Cons: Less flexible, limited customization

### Option 2: Passwordless Magic Links
Send magic links via Clerk:
- Pros: No password needed
- Cons: Requires Clerk API integration

### Option 3: Current Implementation (Recommended)
Custom invitation + Clerk authentication:
- Pros: Full control, flexible, good UX
- Cons: Requires webhook setup

## Testing Checklist

- [ ] Admin can send invitation
- [ ] Email arrives with correct link
- [ ] Token verification works
- [ ] Sign-up form has pre-filled email
- [ ] User can complete sign-up via Clerk
- [ ] Webhook receives user.created event
- [ ] User is activated in database
- [ ] Invitation marked as accepted
- [ ] User can access dashboard
- [ ] User has correct role and permissions
- [ ] Expired tokens are rejected
- [ ] Resend invitation works

## Monitoring

### Key Metrics to Track
- Invitation sent count
- Invitation acceptance rate
- Time from invitation to sign-up
- Webhook success rate
- Failed webhook count

### Logs to Monitor
```javascript
// Look for these in logs:
"✅ Invitation email sent to"
"✅ User linked to Clerk ID"
"Clerk webhook received: user.created"
"⚠️ User signed up without invitation"
```

## Future Enhancements

- [ ] Add invitation acceptance tracking
- [ ] Send reminder emails for pending invitations
- [ ] Admin dashboard for invitation analytics
- [ ] Bulk invite functionality
- [ ] Custom onboarding flow per role
- [ ] Integration with Clerk organizations
- [ ] Support for multiple organization invites
