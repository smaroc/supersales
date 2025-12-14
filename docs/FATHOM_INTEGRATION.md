# Fathom.video Integration Guide

## Overview

The Fathom integration allows you to automatically receive and analyze sales call transcripts from Fathom.video. The integration uses API key authentication and automatically creates webhooks with transcript support.

## Features

- ✅ API Key Authentication
- ✅ Automatic Webhook Creation with Transcript Support
- ✅ Webhook Signature Verification (HMAC SHA256)
- ✅ Encrypted Storage of API Keys and Webhook Secrets
- ✅ Historical Meeting Import
- ✅ Automatic Call Analysis with DeepSeek
- ✅ Support for Multiple Fathom Formats

## Setup Instructions

### 1. Get Your Fathom API Key

1. Go to [Fathom API Settings](https://app.fathom.video/settings/developer)
2. Click "Generate API Key"
3. Copy the API key (keep it secure!)

### 2. Configure Integration in Super Sales.

1. Navigate to **Settings → Webhooks → Fathom.video**
2. Enter your API key in the "API Key" field
3. Click **"Test Connection"**
   - Should show success with number of meetings found
   - If it fails, verify your API key is correct
4. Click **"Save Configuration"**
   - This automatically creates a webhook in Fathom
   - Returns webhook ID and secret
   - Both are encrypted and stored securely

### 3. Verify Webhook Creation

After saving, you should see:
```
✓ Webhook automatically created in Fathom
✓ Webhook ID: wh_xxxxxxxxxxxxx
✓ Webhook secret securely stored
💡 Your webhook is now active and will receive transcript data from new meetings
```

### 4. (Optional) Import Historical Meetings

After successful connection test, click **"Import Historical Calls"** to:
- Fetch up to 50 recent meetings from Fathom
- Import them as call records
- Automatically analyze each call

## Technical Details

### Webhook Configuration

When you save your Fathom configuration, the system automatically creates a webhook with these settings:

```typescript
{
  destinationUrl: "https://yourapp.com/api/webhooks/fathom/{userId}",
  includeTranscript: true,        // ✅ Full transcript included
  includeActionItems: true,        // ✅ Action items included
  includeSummary: true,            // ✅ Summary included
  includeCrmMatches: false,
  triggeredFor: [
    'my_recordings',               // Your recordings
    'shared_external_recordings'   // Shared recordings
  ]
}
```

### Webhook URL Format

Each user gets a unique webhook URL:
```
https://yourapp.com/api/webhooks/fathom/{clerkUserId}
```

This ensures:
- Call records are created for the correct user
- Proper organization assignment
- Access control based on user permissions

### Webhook Data Processing

When Fathom sends webhook data:

1. **Webhook Route** (`/api/webhooks/fathom/{userId}`)
   - Receives webhook POST request
   - Validates user exists and is active
   - Handles multiple Fathom data formats (old and new)

2. **Call Record Creation**
   - Extracts meeting details, transcript, participants
   - Determines external invitees
   - Stores in MongoDB with status "pending"

3. **Automatic Analysis**
   - Triggers DeepSeek analysis via server action
   - Creates traditional call evaluation
   - Updates status to "evaluated"
   - Generates scores, outcomes, and next steps

### Security

#### API Key Storage
```typescript
// API keys are encrypted before storage
const encryptedKey = encrypt(apiKey)

// Stored in MongoDB integrations collection
{
  userId: ObjectId,
  platform: 'fathom',
  configuration: {
    apiKey: encryptedKey,      // ✅ Encrypted
    webhookSecret: encryptedSecret  // ✅ Encrypted
  }
}
```

#### Webhook Signature Verification
```typescript
// Verify webhook requests using HMAC SHA256
FathomService.verifyWebhookSignature(
  requestBody,
  signature,
  webhookSecret
)
```

## Data Flow Diagram

```
┌──────────────────┐
│  Fathom.video   │
│   (Meeting)     │
└────────┬─────────┘
         │ Recording complete
         ▼
┌──────────────────┐
│ Fathom Webhook  │
│ (with transcript)│
└────────┬─────────┘
         │ POST request
         ▼
┌──────────────────────────────┐
│ /api/webhooks/fathom/{userId}│
│  - Validate user             │
│  - Parse webhook data        │
│  - Create CallRecord         │
└────────┬─────────────────────┘
         │
         ├─────────────────────┐
         ▼                     ▼
┌──────────────────┐   ┌─────────────────┐
│ DeepSeek Analysis│   │ Call Evaluation │
│  (French Coach)  │   │  (Scoring)      │
└────────┬─────────┘   └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │   Head of Sales      │
         │     Dashboard        │
         └──────────────────────┘
```

## Supported Fathom Formats

The webhook handler supports multiple Fathom data formats:

### Format 1: Old Flat Format
```json
[
  {
    "fathom_user_emaill": "user@domain.com",
    "meeting_title": "Sales Call",
    "transcript_plaintext": "...",
    "recording_duration_in_minutes": "45.5"
  }
]
```

### Format 2: New Nested Format
```json
[
  {
    "id": "12345",
    "fathom_user": {
      "email": "user@domain.com",
      "name": "John Doe"
    },
    "meeting": {
      "title": "Sales Call",
      "scheduled_start_time": "2025-01-23T10:00:00Z"
    },
    "recording": {
      "duration_in_minutes": 45.5,
      "share_url": "https://fathom.video/share/..."
    },
    "transcript": {
      "plaintext": "..."
    }
  }
]
```

### Format 3: JSON String Wrapper
```json
[
  {
    "data": "{...}"  // JSON string that gets parsed
  }
]
```

All formats are automatically detected and normalized.

## Testing

### Manual Test Script

Run the test script to verify your API key:

```bash
FATHOM_API_KEY=your_key_here npx tsx scripts/test-fathom-connection.ts
```

Expected output:
```
=== Fathom API Connection Test ===

✓ API Key found (length: 32 characters)
✓ Testing connection...

✅ SUCCESS: Fathom API connection works!

Details:
  - Message: Connection successful - API key is valid
  - Meetings found: 15
  - API version: v1

🎉 Your Fathom integration is ready!
```

### Via Settings UI

1. Go to Settings → Webhooks → Fathom.video
2. Enter API key
3. Click "Test Connection"
4. Should show green success message

## Troubleshooting

### Connection Test Fails

**Error: "Invalid API key - please check your credentials"**
- Verify API key is correct
- Check you're using the latest API key from Fathom
- Regenerate API key in Fathom if needed

**Error: "Rate limit exceeded"**
- Wait a few minutes before retrying
- Fathom has rate limits on API calls

### Webhook Not Receiving Data

1. **Check webhook was created**
   - After saving config, verify success message shows webhook ID
   - Log into Fathom → Settings → Webhooks
   - Verify webhook exists with your app URL

2. **Check webhook URL is reachable**
   - Ensure your app is publicly accessible
   - If using ngrok/localhost, update webhook URL manually in Fathom

3. **Check webhook logs**
   - Server logs show all webhook requests
   - Look for `=== FATHOM WEBHOOK REQUEST START ===`

### Calls Not Appearing in Dashboard

1. **Check user mapping**
   - Webhook URL must include correct userId
   - User must exist and be active in database

2. **Check call record creation**
   - Look for database entries in `call_records` collection
   - Check `status` field (should be "evaluated" after processing)

3. **Check analysis processing**
   - Look for DeepSeek analysis errors in logs
   - Verify DEEPSEEK_API_KEY is set in environment

## API Reference

### FathomService Methods

```typescript
class FathomService {
  // Test API key connection
  async testConnection(): Promise<{
    success: boolean
    message: string
    details?: any
  }>

  // Create webhook with transcript support
  async createWebhook(webhookUrl: string): Promise<{
    id: string
    secret: string
  }>

  // Fetch historical meetings
  async getHistoricalMeetings(maxMeetings: number): Promise<any[]>

  // Verify webhook signature
  static verifyWebhookSignature(
    body: string,
    signature: string,
    webhookSecret: string
  ): boolean
}
```

### Integration Actions

```typescript
// Save integration and auto-create webhook
await saveIntegrationConfiguration(
  'fathom',
  { apiKey: 'your-key' },
  'https://yourapp.com'
)

// Test connection
await testIntegrationConnection(
  'fathom',
  { apiKey: 'your-key' }
)
```

## Webhook API Specification

As per Fathom's API documentation: https://developers.fathom.ai/api-reference/webhooks/create-a-webhook

### Create Webhook Endpoint

```
POST https://api.fathom.ai/external/v1/webhooks
```

### Request Headers
```
X-Api-Key: your_api_key_here
Content-Type: application/json
```

### Request Body
```json
{
  "destination_url": "https://yourapp.com/api/webhooks/fathom/{userId}",
  "include_transcript": true,
  "include_action_items": true,
  "include_summary": true,
  "include_crm_matches": false,
  "triggered_for": ["my_recordings", "shared_external_recordings"]
}
```

### Response
```json
{
  "id": "wh_xxxxxxxxxxxxx",
  "secret": "whsec_xxxxxxxxxxxxx",
  "destination_url": "https://yourapp.com/api/webhooks/fathom/{userId}",
  "include_transcript": true,
  "include_action_items": true,
  "include_summary": true,
  "include_crm_matches": false,
  "triggered_for": ["my_recordings", "shared_external_recordings"],
  "created_at": "2025-01-23T10:00:00Z"
}
```

## Next Steps

Once your Fathom integration is set up:

1. ✅ Automatic call recording import
2. ✅ Automatic transcript analysis
3. ✅ View analyzed calls in Head of Sales dashboard
4. ✅ Review call scores and outcomes
5. ✅ Get AI-powered coaching insights in French

## Support

For issues or questions:
- Check server logs for detailed error messages
- Review this documentation
- Test using the provided test script
- Verify all environment variables are set correctly
