# Fathom Connection Testing - Server Logs Reference

## Overview
Comprehensive server-side logging has been added to track Fathom API connection testing. All logs use the `[FathomService]` and `[integrations]` prefixes for easy filtering.

## Log Flow

### 1. Integration Action Logs (`app/actions/integrations.ts`)
When a user clicks "Test Connection" in the settings page:

```
[integrations] Testing connection for platform: fathom
[integrations] Payload keys: [ 'apiKey', 'webhookSecret' ]
[integrations] User authenticated: user@example.com
[integrations] Platform validated: fathom
[integrations] Payload validated successfully
[integrations] Initiating connection test for: fathom
```

### 2. FathomService Test Connection Logs (`lib/services/fathom-service.ts`)

#### Start of Test
```
[FathomService] Starting connection test...
[FathomService] Base URL: https://api.fathom.ai/external/v1
[FathomService] API Key present: true
[FathomService] API Key length: 64
```

#### API Request
```
[FathomService] API Call - GET https://api.fathom.ai/external/v1/meetings?limit=1
[FathomService] Request headers: {
  'X-Api-Key': 'fathom_abc...',
  'Content-Type': 'application/json'
}
```

#### Success Response
```
[FathomService] Response status: 200 OK
[FathomService] Response headers: {
  'content-type': 'application/json',
  'x-ratelimit-limit': '60',
  'x-ratelimit-remaining': '59',
  ...
}
[FathomService] Response data: {
  "meetings": [
    {
      "id": "abc123",
      "title": "Sales Call",
      ...
    }
  ]
}
[FathomService] Connection test successful!
[FathomService] Meetings found: 1
```

#### Error Response (Invalid API Key)
```
[FathomService] Response status: 401 Unauthorized
[FathomService] Response headers: { ... }
[FathomService] Error response body: {"error": "Invalid API key"}
[FathomService] Connection test failed!
[FathomService] Error status: 401
[FathomService] Error message: Invalid API key
[FathomService] Authentication failed - invalid credentials
```

#### Error Response (Rate Limit)
```
[FathomService] Response status: 429 Too Many Requests
[FathomService] Error response body: {"error": "Rate limit exceeded"}
[FathomService] Connection test failed!
[FathomService] Error status: 429
[FathomService] Error message: Rate limit exceeded
[FathomService] Rate limit exceeded
```

### 3. Final Integration Result
```
[integrations] Connection test completed for: fathom
[integrations] Test result: {
  "success": true,
  "message": "Connection successful - API key is valid",
  "details": {
    "meetingsFound": 1,
    "apiVersion": "v1"
  }
}
```

## Filtering Logs

### View all Fathom-related logs:
```bash
# In development (terminal running npm run dev)
grep "Fathom"

# In production logs
grep "\[FathomService\]\|\[integrations\].*fathom"
```

### View only errors:
```bash
grep "ERROR\|\[FathomService\].*failed\|\[integrations\].*failed"
```

## Common Error Patterns

### Missing API Key
```
[FathomService] Connection test failed - No API key provided
```

### Invalid Credentials (401/403)
```
[FathomService] Response status: 401 Unauthorized
[FathomService] Authentication failed - invalid credentials
```

### Rate Limiting (429)
```
[FathomService] Response status: 429 Too Many Requests
[FathomService] Rate limit exceeded
```

### Network/Connection Issues
```
[FathomService] Connection test failed!
[FathomService] Error message: fetch failed
```

## Security Notes

- API keys are partially masked in logs (first 10 characters + `...`)
- Full API keys are NEVER logged
- Authorization headers show truncated tokens only
- Response data may contain sensitive information - ensure logs are secured in production

## Production Considerations

For production environments, consider:
1. Using a structured logging service (e.g., Winston, Pino)
2. Setting log levels (DEBUG, INFO, WARN, ERROR)
3. Storing logs securely with proper access controls
4. Rotating logs regularly
5. Removing or reducing verbose logging in production builds
