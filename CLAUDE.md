# SuperSales - Claude Code Project Guide

## Project Overview
Next.js 14 sales AI application with role-based access control, Head of Sales dashboard, and user management system.

## Tech Stack
- Next.js 14 with App Router
- MongoDB with Mongoose ODM
- Clerk for authentication (see CLERK.MD for integration guidelines)
- HeroUI React components with Tailwind CSS
- TypeScript
- Framer Motion for animations

## Development Commands
```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run linting
```

## Key Architecture
- `/app` - Next.js App Router pages and API routes
- `/components` - Reusable React components (includes landing page)
- `/lib` - Utilities and configurations
- `/models` - MongoDB/Mongoose models

## Key Features
1. **Complete Landing Page** - Modern animated landing page with HeroUI components
2. **Role-based Access Control** - 6 roles with hierarchical permissions
3. **Head of Sales Dashboard** - Team metrics and call analysis
4. **User Management System** - Admin controls for user/role management
5. **Webhook Integrations** - Fathom.video and Fireflies.ai support

## Important File Locations
- User model: `/models/User.ts`
- Navigation component: `/components/dashboard-nav.tsx`
- Head of Sales dashboard: `/app/dashboard/head-of-sales/page.tsx`
- Calls table: `/app/dashboard/head-of-sales/calls/page.tsx`
- User management: `/app/dashboard/settings/users/page.tsx`
- Settings page: `/app/dashboard/settings/page.tsx`

## Data Interfaces
- **Server actions**: `app/actions/call-types.ts`, `app/actions/head-of-sales.ts`, `app/actions/integrations.ts`, `app/actions/call-evaluations.ts`
- **API routes**: `/api/users/*`, `/api/webhooks/*`, `/api/call-records`, `/api/call-records/[id]/evaluate`

## Environment Variables Required
```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[your_clerk_publishable_key]
CLERK_SECRET_KEY=[your_clerk_secret_key]

# Database
MONGODB_URI=mongodb://localhost:27017/sales-ai

# Integrations
INTEGRATION_ENCRYPTION_KEY=[32_character_secret_key]

# OpenAI API (for call analysis)
OPENAI_API_KEY=[your_openai_api_key]
```

## Common Tasks
- **Add new role**: Update `/models/User.ts` enum and permissions
- **Add navigation item**: Update `/components/dashboard-nav.tsx`
- **Create new page**: Add to `/app/dashboard/[page]/page.tsx`
- **Add API endpoint**: Create in `/app/api/[route]/route.ts`

## Database Models
- User: Authentication and role management
- CallType: Configurable call types and evaluation criteria
- CallEvaluation: Individual call scores and outcomes
- CallRecord: Call data from integrations (Fathom, Zoom, Firefiles)
- CallAnalysis: OpenAI-powered detailed French coaching analysis of sales calls

## Known Issues Fixed
- Migration from NextAuth to Clerk authentication (completed)
- MongoDB duplicate index warnings (resolved)
- Select component empty value errors (fixed with "all" default)
- Missing session imports (resolved with Clerk implementation)

## Access Control System

### User Access Levels (Flag-Based)

The application uses a **flag-based access control system** with three levels:

1. **Regular User** (default)
   - Access: Only their own data
   - Filter: `{ organizationId, userId }`
   - Can view/edit their own calls, analyses, and records

2. **Admin** (`isAdmin: true`)
   - Access: All data within their organization
   - Filter: `{ organizationId }`
   - Can manage users, view all calls, configure settings
   - Cannot access data from other organizations

3. **Super Admin** (`isSuperAdmin: true`)
   - Access: All data across all organizations
   - Filter: `{}` (no restrictions)
   - Full system access for platform administrators

### Implementation

**Helper Functions:** `/lib/access-control.ts`
- `buildAccessFilter(user)` - Builds MongoDB filter based on access level
- `getUserAccessLevel(user)` - Returns 'user' | 'admin' | 'superadmin'
- `canAccessOrganization(user, orgId)` - Checks organization access
- `hasAdminAccess(user)` - Quick admin check (isAdmin || isSuperAdmin)
- `buildCallRecordsFilter(user, options)` - Build filter for call records
- `buildCallAnalysisFilter(user, options)` - Build filter for call analyses

**User Model Fields:** `/lib/types.ts`
```typescript
interface User {
  role: string              // Used for navigation/UI only
  isAdmin: boolean          // Organization admin flag
  isSuperAdmin: boolean     // Platform super admin flag
  organizationId: ObjectId  // User's organization
  // ... other fields
}
```

### Migration Notes

- Legacy `role` field still exists for navigation and backward compatibility
- All data access MUST use `isAdmin`/`isSuperAdmin` flags
- Navigation can use either flags or roles
- See `/ACCESS_CONTROL_AUDIT.md` for detailed audit and migration plan

## Development Notes
- Application runs on http://localhost:3000 (or next available port)
- Uses MongoDB for data persistence
- Flag-based access control implemented (see Access Control System above)
- Head-of-Sales demo relies on live data; seed scripts were removed

## Fathom Integration
The system now supports Fathom.video webhook integration:

### Webhook Structure
Fathom sends data in this format:
```json
[
  {
    "fathom_user_emaill": "user@domain.com",
    "fathom_user_name": "User Name",
    "fathom_user_team": "Team",
    "id": "58297096",
    "meeting_title": "Meeting Title",
    "meeting_scheduled_start_time": "2025-09-13T09:00:00Z",
    "meeting_scheduled_end_time": "2025-09-13T10:00:00Z",
    "meeting_scheduled_duration_in_minute": "60",
    "recording_duration_in_minutes": "74.50050555",
    "recording_share_url": "https://fathom.video/share/...",
    "recording_url": "https://fathom.video/calls/...",
    "transcript_plaintext": "Call transcript...",
    "meeting_invitees": "email: hello@example.com\nis_external: True\nname: John Doe",
    "meeting_has_external_invitees": "True"
  }
]
```

### Processing Flow
1. Webhook receives Fathom data at `/api/webhooks/fathom`
2. Creates CallRecord in database
3. Automatically triggers evaluation processing
4. Creates CallEvaluation with scores and next steps
5. Updates call record status to 'evaluated'

### Features
- Automatic call outcome detection based on duration and transcript analysis
- Smart scoring based on call criteria
- Next steps generation
- Follow-up date calculation
- Integration with existing Head of Sales dashboard

## Fireflies.ai Integration
The system now supports Fireflies.ai webhook integration:

### Webhook Structure
Fireflies sends data in this format:
```json
[
  {
    "data": {
      "transcript": {
        "id": "01K4VT79471JT0X9WGAYGQZV32",
        "title": "Meeting Title",
        "host_email": "user@domain.com",
        "organizer_email": "user@domain.com",
        "meeting_link": "https://meet.google.com/abc-def-ghi",
        "calendar_id": "calendar_id_here",
        "participants": ["user1@domain.com", "user2@domain.com"],
        "date": 1757664000000,
        "transcript_url": "https://app.fireflies.ai/view/...",
        "duration": 25.52,
        "meeting_attendees": [
          {
            "displayName": "User Name",
            "email": "user@domain.com",
            "phoneNumber": null,
            "name": "User Name",
            "location": null
          }
        ],
        "sentences": [
          {
            "index": 0,
            "speaker_name": "Speaker",
            "text": "Hello everyone",
            "start_time": 0.008,
            "end_time": 2.5
          }
        ]
      }
    }
  }
]
```

### Processing Flow
1. Webhook receives Fireflies data at `/api/webhooks/fireflies`
2. Parses transcript sentences into readable format
3. Creates CallRecord in database with 'firefiles' source
4. Automatically determines external invitees based on email domains
5. Triggers evaluation processing
6. Creates CallEvaluation with scores and next steps
7. Updates call record status to 'evaluated'

### Features
- Automatic transcript generation from sentence arrays
- Smart external invitee detection based on email domains
- Unix timestamp conversion for meeting times
- Metadata preservation including calendar ID and participant lists
- Integration with existing Head of Sales dashboard
