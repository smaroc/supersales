/**
 * Fathom API Connection Test Script
 *
 * Usage:
 * 1. Set your FATHOM_API_KEY environment variable
 * 2. Run: npx tsx scripts/test-fathom-connection.ts
 */

import { FathomService } from '../lib/services/fathom-service'

async function testFathomConnection() {
  console.log('=== Fathom API Connection Test ===\n')

  const apiKey = process.env.FATHOM_API_KEY

  if (!apiKey) {
    console.error('❌ Error: FATHOM_API_KEY environment variable not set')
    console.log('\nUsage: FATHOM_API_KEY=your_key_here npx tsx scripts/test-fathom-connection.ts')
    process.exit(1)
  }

  console.log('✓ API Key found (length:', apiKey.length, 'characters)')
  console.log('✓ Testing connection...\n')

  const fathomService = new FathomService({ apiKey })

  try {
    // Test connection
    const result = await fathomService.testConnection()

    if (result.success) {
      console.log('✅ SUCCESS: Fathom API connection works!')
      console.log('\nDetails:')
      console.log('  - Message:', result.message)
      if (result.details) {
        console.log('  - Meetings found:', result.details.meetingsFound)
        console.log('  - API version:', result.details.apiVersion)
      }
      console.log('\n🎉 Your Fathom integration is ready!')
      console.log('\nNext steps:')
      console.log('  1. Go to your Settings page in the app')
      console.log('  2. Navigate to Webhooks → Fathom.video')
      console.log('  3. Enter your API key')
      console.log('  4. Click "Test Connection" then "Save Configuration"')
      console.log('  5. The webhook will be automatically created with transcript support')
    } else {
      console.log('❌ FAILED:', result.message)
      if (result.details) {
        console.log('\nError details:', JSON.stringify(result.details, null, 2))
      }
      process.exit(1)
    }
  } catch (error: any) {
    console.error('❌ Connection test failed with error:')
    console.error(error.message)
    if (error.cause) {
      console.error('\nError cause:', JSON.stringify(error.cause, null, 2))
    }
    process.exit(1)
  }
}

testFathomConnection()
