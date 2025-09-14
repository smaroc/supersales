# Integration Setup Guide

This guide covers how to set up integrations with Zoom, Fathom.video, and Firefiles.ai for automatic call transcription sync.

## Overview

The integration system allows you to:
- Connect your Zoom, Fathom.video, and Firefiles.ai accounts
- Automatically receive transcriptions via webhooks
- Store and analyze call data in your sales AI dashboard
- Process insights from call recordings

## Environment Variables

Add these to your `.env.local` file:

```bash
# Integration Encryption Key (32 characters) - REQUIRED
INTEGRATION_ENCRYPTION_KEY=your-32-character-secret-key-here!!

# Optional: Custom webhook base URL (defaults to NEXTAUTH_URL)
WEBHOOK_BASE_URL=https://yourapp.com
```

## Integration Setup

### 1. Zoom Integration

**Requirements:**
- Zoom Pro, Business, or Enterprise account
- Zoom Marketplace app creation access

**Setup Steps:**

1. **Create Zoom App:**
   - Go to [Zoom Marketplace](https://marketplace.zoom.us/)
   - Create a new OAuth app
   - Set redirect URL to your domain
   - Note the Client ID and Client Secret

2. **Configure Webhooks:**
   - In your Zoom app, go to "Event Subscriptions"
   - Add webhook endpoint: `https://yourapp.com/api/webhooks/zoom`
   - Subscribe to these events:
     - `recording.completed`
     - `meeting.ended`

3. **Required Scopes:**
   - `meeting:read`
   - `recording:read`
   - `user:read`

4. **Settings Configuration:**
   - Go to Settings > Integrations > Zoom
   - Enter Client ID and Client Secret
   - Test connection
   - Save configuration

### 2. Fathom.video Integration

**Requirements:**
- Fathom.video account with API access

**Setup Steps:**

1. **Get API Credentials:**
   - Log into your Fathom.video account
   - Go to Settings → API & Integrations
   - Generate an API key
   - Create a webhook secret

2. **Configure Webhook:**
   - Set webhook URL: `https://yourapp.com/api/webhooks/fathom`
   - Configure to trigger on:
     - `recording.transcribed`
     - `recording.processed`

3. **Settings Configuration:**
   - Go to Settings > Integrations > Fathom.video
   - Enter API Key and Webhook Secret
   - Test connection
   - Save configuration

### 3. Firefiles.ai Integration

**Requirements:**
- Firefiles.ai workspace with API access

**Setup Steps:**

1. **Get API Credentials:**
   - Access your Firefiles.ai workspace
   - Go to Settings → API
   - Generate an API key
   - Copy your Workspace ID

2. **Configure Webhook:**
   - Set webhook endpoint: `https://yourapp.com/api/webhooks/firefiles`
   - Enable events:
     - `transcription.completed`
     - `recording.uploaded`
     - `analysis.completed`

3. **Settings Configuration:**
   - Go to Settings > Integrations > Firefiles.ai
   - Enter API Key and Workspace ID
   - Test connection
   - Save configuration

## Webhook URLs

The system automatically generates webhook URLs for each integration:

- **Zoom:** `https://yourapp.com/api/webhooks/zoom`
- **Fathom:** `https://yourapp.com/api/webhooks/fathom`
- **Firefiles:** `https://yourapp.com/api/webhooks/firefiles`

## Security

### API Key Encryption
- All sensitive data (API keys, secrets) are encrypted using AES-256-CBC
- Encryption key must be 32 characters long
- Keys are never stored in plain text

### Webhook Verification
- Zoom: Uses OAuth signature verification
- Fathom: HMAC SHA-256 signature verification
- Firefiles: Timestamp + HMAC SHA-256 verification

### Access Control
- User-specific integrations (isolated per user)
- Organization-level data separation
- Protected API endpoints with authentication

## Data Flow

1. **Meeting/Call Occurs:**
   - Recording happens on integrated platform
   - Platform processes recording and transcript

2. **Webhook Triggered:**
   - Platform sends webhook to your endpoint
   - System verifies webhook signature

3. **Data Processing:**
   - System fetches transcript from platform API
   - Creates transcription record in database
   - Processes insights and metadata

4. **Dashboard Update:**
   - New transcription appears in dashboard
   - Analysis and insights are available
   - Search and filtering capabilities enabled

## API Endpoints

### Integration Management
- `GET /api/integrations/[platform]` - Get integration status
- `POST /api/integrations/[platform]` - Save integration config
- `DELETE /api/integrations/[platform]` - Deactivate integration
- `POST /api/integrations/[platform]/test` - Test connection

### Webhook Endpoints
- `POST /api/webhooks/zoom` - Zoom webhook handler
- `POST /api/webhooks/fathom` - Fathom webhook handler  
- `POST /api/webhooks/firefiles` - Firefiles webhook handler

## Troubleshooting

### Common Issues

1. **Connection Test Fails:**
   - Verify API credentials are correct
   - Check network connectivity
   - Ensure API endpoints are accessible

2. **Webhooks Not Receiving:**
   - Verify webhook URLs are correct
   - Check webhook configuration on platform
   - Ensure webhook endpoint is publicly accessible

3. **Signature Verification Fails:**
   - Verify webhook secrets are correct
   - Check that webhook body is being read correctly
   - Ensure timestamp headers are included

### Logs and Monitoring

Check application logs for:
- Integration connection attempts
- Webhook processing results
- API call errors
- Database operation results

### Testing Webhooks

Use tools like ngrok for local development:
```bash
ngrok http 3000
# Use the generated URL for webhook endpoints
```

## Development

### Adding New Integrations

1. Create service class in `/lib/services/[platform]-service.ts`
2. Add webhook handler in `/app/api/webhooks/[platform]/route.ts`
3. Update settings page with new integration
4. Add database models if needed
5. Update this documentation

### Testing

Run integration tests with mock webhook payloads to ensure proper processing.

### Database Models

- **Integration:** Stores platform configs and status
- **Transcription:** Stores call transcripts and metadata

## Support

For integration issues:
1. Check this documentation
2. Verify platform-specific requirements
3. Test API connections
4. Check webhook configurations
5. Review application logs