/**
 * Script to create MongoDB indexes for performance optimization
 * Run with: npx tsx scripts/create-indexes.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { MongoClient } from 'mongodb'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-ai'

console.log('MongoDB URI configured:', MONGODB_URI ? '✓ Found in environment' : '✗ Using default localhost')

async function createIndex(
  collection: any,
  keys: any,
  options: any
): Promise<void> {
  try {
    await collection.createIndex(keys, options)
    console.log(`✓ Created index: ${options.name}`)
  } catch (error: any) {
    if (error.code === 86) {
      // Index already exists with same name but different spec
      console.log(`⚠ Index ${options.name} already exists (skipping)`)
    } else if (error.code === 85) {
      // Index already exists with same spec
      console.log(`✓ Index ${options.name} already exists`)
    } else {
      throw error
    }
  }
}

async function createIndexes() {
  console.log('Connecting to MongoDB...')
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('Connected successfully')

    const db = client.db()

    // Call Records indexes
    console.log('\nCreating indexes for call_records collection...')
    const callRecords = db.collection('call_records')

    await createIndex(callRecords, { createdAt: -1 }, { name: 'createdAt_-1' })
    await createIndex(callRecords, { organizationId: 1, createdAt: -1 }, { name: 'organizationId_1_createdAt_-1' })
    await createIndex(callRecords, { salesRepId: 1, createdAt: -1 }, { name: 'salesRepId_1_createdAt_-1' })
    await createIndex(callRecords, { fathomCallId: 1, salesRepId: 1 }, { name: 'fathomCallId_1_salesRepId_1', sparse: true })
    await createIndex(callRecords, { claapCallId: 1, salesRepId: 1 }, { name: 'claapCallId_1_salesRepId_1', sparse: true })
    await createIndex(callRecords, { firefliesCallId: 1, salesRepId: 1 }, { name: 'firefliesCallId_1_salesRepId_1', sparse: true })

    // Composite index for duplicate detection: scheduled date + title + client name
    // This supports the new duplicate detection logic that uses these three fields
    await createIndex(callRecords, { organizationId: 1, scheduledStartTime: 1, title: 1, 'invitees.name': 1 }, {
      name: 'org_date_title_client_composite'
    })

    // Unique constraint on platform-specific IDs per organization
    await createIndex(callRecords, { organizationId: 1, fathomCallId: 1 }, {
      name: 'org_fathomCallId_unique',
      unique: true,
      sparse: true  // Allow multiple null values
    })
    await createIndex(callRecords, { organizationId: 1, firefliesCallId: 1 }, {
      name: 'org_firefliesCallId_unique',
      unique: true,
      sparse: true
    })

    // Call Analysis indexes
    console.log('\nCreating indexes for call_analysis collection...')
    const callAnalysis = db.collection('call_analysis')

    await createIndex(callAnalysis, { createdAt: -1 }, { name: 'createdAt_-1' })
    await createIndex(callAnalysis, { organizationId: 1, createdAt: -1 }, { name: 'organizationId_1_createdAt_-1' })
    await createIndex(callAnalysis, { callRecordId: 1 }, { name: 'callRecordId_1' })

    // Users indexes
    console.log('\nCreating indexes for users collection...')
    const users = db.collection('users')

    await createIndex(users, { clerkId: 1 }, { name: 'clerkId_1', unique: true, sparse: true })  // sparse: true allows multiple null/undefined values
    await createIndex(users, { email: 1 }, { name: 'email_1' })
    await createIndex(users, { organizationId: 1 }, { name: 'organizationId_1' })

    // Integrations indexes
    console.log('\nCreating indexes for integrations collection...')
    const integrations = db.collection('integrations')

    await createIndex(integrations, { userId: 1, platform: 1 }, { name: 'userId_1_platform_1' })

    console.log('\n✅ All indexes created successfully!')

    // List all indexes
    console.log('\n📋 Current indexes:')
    const collections = ['call_records', 'call_analysis', 'users', 'integrations']
    for (const collName of collections) {
      const indexes = await db.collection(collName).indexes()
      console.log(`\n${collName}:`)
      indexes.forEach(idx => {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`)
      })
    }

  } catch (error) {
    console.error('Error creating indexes:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\nConnection closed')
  }
}

createIndexes()
