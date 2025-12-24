#!/usr/bin/env npx tsx
/**
 * MongoDB to Tinybird Migration Script
 *
 * This script migrates historical data from MongoDB to Tinybird.
 * Run with: npx tsx scripts/migrate-to-tinybird.ts
 *
 * Prerequisites:
 * - Set TINYBIRD_HOST and TINYBIRD_TOKEN environment variables
 * - Set ENABLE_TINYBIRD_DUAL_WRITE=true (temporarily for migration)
 * - Set MONGODB_URI environment variable
 */

import { MongoClient, ObjectId, Db, Collection } from 'mongodb'
import { CallRecord, CallAnalysis, CallEvaluation, COLLECTIONS } from '../lib/types'
import {
  transformCallRecordForTinybird,
  transformCallAnalysisForTinybird,
  transformCallEvaluationForTinybird,
} from '../lib/tinybird-transformers'

// Configuration
const BATCH_SIZE = 500
const TINYBIRD_HOST = process.env.TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-ai'

// Validate environment
if (!TINYBIRD_TOKEN) {
  console.error('Error: TINYBIRD_TOKEN environment variable is required')
  process.exit(1)
}

// Tinybird API helper
async function ingestToTinybird(
  datasourceName: string,
  data: Record<string, unknown>[]
): Promise<{ successful: number; failed: number }> {
  if (data.length === 0) {
    return { successful: 0, failed: 0 }
  }

  const url = new URL('/v0/events', TINYBIRD_HOST)
  url.searchParams.append('name', datasourceName)

  const ndjson = data.map((row) => JSON.stringify(row)).join('\n')

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TINYBIRD_TOKEN}`,
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjson,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Tinybird ingest error for ${datasourceName}:`, error)
      return { successful: 0, failed: data.length }
    }

    const result = await response.json()
    return {
      successful: result.successful_rows || data.length,
      failed: result.quarantined_rows || 0,
    }
  } catch (error) {
    console.error(`Network error ingesting to ${datasourceName}:`, error)
    return { successful: 0, failed: data.length }
  }
}

// Progress tracker
function logProgress(collection: string, processed: number, total: number) {
  const percentage = Math.round((processed / total) * 100)
  const bar = '='.repeat(Math.floor(percentage / 2)) + ' '.repeat(50 - Math.floor(percentage / 2))
  process.stdout.write(`\r${collection}: [${bar}] ${percentage}% (${processed}/${total})`)
}

// Migration functions
async function migrateCallRecords(db: Db): Promise<{ success: number; failed: number }> {
  console.log('\n--- Migrating Call Records ---')

  const collection = db.collection(COLLECTIONS.CALL_RECORDS) as Collection<CallRecord>
  const total = await collection.countDocuments()

  if (total === 0) {
    console.log('No call records to migrate')
    return { success: 0, failed: 0 }
  }

  console.log(`Found ${total} call records to migrate`)

  let processed = 0
  let totalSuccess = 0
  let totalFailed = 0

  const cursor = collection.find().batchSize(BATCH_SIZE)

  let batch: CallRecord[] = []
  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    if (doc) {
      batch.push(doc)
    }

    if (batch.length >= BATCH_SIZE || !(await cursor.hasNext())) {
      // Transform batch
      const transformed = batch.map(transformCallRecordForTinybird)

      // Ingest to Tinybird
      const result = await ingestToTinybird('call_records', transformed)
      totalSuccess += result.successful
      totalFailed += result.failed

      processed += batch.length
      logProgress('call_records', processed, total)

      batch = []
    }
  }

  console.log(`\nCall records migration complete: ${totalSuccess} success, ${totalFailed} failed`)
  return { success: totalSuccess, failed: totalFailed }
}

async function migrateCallAnalyses(db: Db): Promise<{ success: number; failed: number }> {
  console.log('\n--- Migrating Call Analyses ---')

  const collection = db.collection(COLLECTIONS.CALL_ANALYSIS) as Collection<CallAnalysis>
  const total = await collection.countDocuments()

  if (total === 0) {
    console.log('No call analyses to migrate')
    return { success: 0, failed: 0 }
  }

  console.log(`Found ${total} call analyses to migrate`)

  let processed = 0
  let totalSuccess = 0
  let totalFailed = 0

  const cursor = collection.find().batchSize(BATCH_SIZE)

  let mainBatch: Record<string, unknown>[] = []
  let objectionsBatch: Record<string, unknown>[] = []

  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    if (doc) {
      const { main, objections } = transformCallAnalysisForTinybird(doc)
      mainBatch.push(main)
      objectionsBatch.push(...objections)
    }

    if (mainBatch.length >= BATCH_SIZE || !(await cursor.hasNext())) {
      // Ingest main records
      const mainResult = await ingestToTinybird('call_analysis', mainBatch)
      totalSuccess += mainResult.successful
      totalFailed += mainResult.failed

      // Ingest objections if any
      if (objectionsBatch.length > 0) {
        const objResult = await ingestToTinybird('call_analysis_objections', objectionsBatch)
        // Don't count objections separately - they're part of the same record
        if (objResult.failed > 0) {
          console.warn(`\nWarning: ${objResult.failed} objections failed to ingest`)
        }
      }

      processed += mainBatch.length
      logProgress('call_analysis', processed, total)

      mainBatch = []
      objectionsBatch = []
    }
  }

  console.log(`\nCall analyses migration complete: ${totalSuccess} success, ${totalFailed} failed`)
  return { success: totalSuccess, failed: totalFailed }
}

async function migrateCallEvaluations(db: Db): Promise<{ success: number; failed: number }> {
  console.log('\n--- Migrating Call Evaluations ---')

  const collection = db.collection(COLLECTIONS.CALL_EVALUATIONS) as Collection<CallEvaluation>
  const total = await collection.countDocuments()

  if (total === 0) {
    console.log('No call evaluations to migrate')
    return { success: 0, failed: 0 }
  }

  console.log(`Found ${total} call evaluations to migrate`)

  let processed = 0
  let totalSuccess = 0
  let totalFailed = 0

  const cursor = collection.find().batchSize(BATCH_SIZE)

  let batch: CallEvaluation[] = []
  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    if (doc) {
      batch.push(doc)
    }

    if (batch.length >= BATCH_SIZE || !(await cursor.hasNext())) {
      // Transform batch
      const transformed = batch.map(transformCallEvaluationForTinybird)

      // Ingest to Tinybird
      const result = await ingestToTinybird('call_evaluations', transformed)
      totalSuccess += result.successful
      totalFailed += result.failed

      processed += batch.length
      logProgress('call_evaluations', processed, total)

      batch = []
    }
  }

  console.log(`\nCall evaluations migration complete: ${totalSuccess} success, ${totalFailed} failed`)
  return { success: totalSuccess, failed: totalFailed }
}

// Verification functions
async function verifyMigration(db: Db) {
  console.log('\n--- Verifying Migration ---')

  // Count MongoDB records
  const mongoCallRecords = await db.collection(COLLECTIONS.CALL_RECORDS).countDocuments()
  const mongoCallAnalyses = await db.collection(COLLECTIONS.CALL_ANALYSIS).countDocuments()
  const mongoCallEvaluations = await db.collection(COLLECTIONS.CALL_EVALUATIONS).countDocuments()

  // Query Tinybird counts (simplified - would need actual pipe calls)
  console.log('\nMongoDB record counts:')
  console.log(`  Call Records: ${mongoCallRecords}`)
  console.log(`  Call Analyses: ${mongoCallAnalyses}`)
  console.log(`  Call Evaluations: ${mongoCallEvaluations}`)

  console.log('\nNote: Verify Tinybird counts match using:')
  console.log('  curl -H "Authorization: Bearer $TINYBIRD_TOKEN" \\')
  console.log('    "$TINYBIRD_HOST/v0/sql?q=SELECT+count()+FROM+call_records"')
}

// Main execution
async function main() {
  console.log('='.repeat(60))
  console.log('MongoDB to Tinybird Migration')
  console.log('='.repeat(60))
  console.log(`\nTinybird Host: ${TINYBIRD_HOST}`)
  console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`)
  console.log(`Batch Size: ${BATCH_SIZE}`)
  console.log('')

  // Connect to MongoDB
  console.log('Connecting to MongoDB...')
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB')

  const startTime = Date.now()

  try {
    // Run migrations
    const callRecordsResult = await migrateCallRecords(db)
    const callAnalysesResult = await migrateCallAnalyses(db)
    const callEvaluationsResult = await migrateCallEvaluations(db)

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('Migration Summary')
    console.log('='.repeat(60))

    const totalSuccess =
      callRecordsResult.success +
      callAnalysesResult.success +
      callEvaluationsResult.success

    const totalFailed =
      callRecordsResult.failed +
      callAnalysesResult.failed +
      callEvaluationsResult.failed

    console.log(`\nTotal records migrated: ${totalSuccess}`)
    console.log(`Total records failed: ${totalFailed}`)
    console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`)

    // Verification
    await verifyMigration(db)

    if (totalFailed > 0) {
      console.log('\n⚠️  Some records failed to migrate. Review the logs above.')
      process.exit(1)
    } else {
      console.log('\n✓ Migration completed successfully!')
    }
  } finally {
    await client.close()
    console.log('\nMongoDB connection closed')
  }
}

// Run
main().catch((error) => {
  console.error('\n❌ Migration failed with error:', error)
  process.exit(1)
})
