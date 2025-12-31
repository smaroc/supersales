/**
 * Script to safely remove duplicate CallRecords and CallAnalysis based on composite key
 * Composite key: scheduled date (same day) + meeting title + client name
 *
 * Handles both MongoDB and Tinybird:
 * - MongoDB: Deletes duplicate records directly
 * - Tinybird: Truncates tables and re-syncs from clean MongoDB (append-only, can't delete rows)
 *
 * Usage:
 *   DRY RUN (review only):     npx tsx scripts/cleanup-duplicate-calls.ts
 *   DELETE MONGODB ONLY:       npx tsx scripts/cleanup-duplicate-calls.ts --execute
 *   DELETE + RESYNC TINYBIRD:  npx tsx scripts/cleanup-duplicate-calls.ts --execute --resync-tinybird
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { MongoClient, ObjectId } from 'mongodb'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-ai'
const TINYBIRD_HOST = process.env.TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN
const EXECUTE_MODE = process.argv.includes('--execute')
const RESYNC_TINYBIRD = process.argv.includes('--resync-tinybird')

interface DuplicateGroup {
  compositeKey: string
  organizationId: ObjectId
  scheduledDate: string
  title: string
  clientName: string
  records: Array<{
    _id: ObjectId
    source: string
    createdAt: Date
    hasTranscript: boolean
    transcriptLength: number
    status: string
    analysisIds: ObjectId[]
  }>
  keepRecord: ObjectId
  deleteRecords: ObjectId[]
  deleteAnalyses: ObjectId[]
}

async function findDuplicates(db: any): Promise<DuplicateGroup[]> {
  console.log('\n🔍 Finding duplicate call records...\n')

  // Aggregation to find duplicates based on composite key
  const duplicates = await db.collection('call_records').aggregate([
    {
      // Create composite key fields
      $addFields: {
        scheduledDate: {
          $dateToString: { format: '%Y-%m-%d', date: '$scheduledStartTime' }
        },
        normalizedTitle: { $toLower: { $trim: { input: '$title' } } },
        clientName: { $arrayElemAt: ['$invitees.name', 0] }
      }
    },
    {
      // Group by composite key
      $group: {
        _id: {
          organizationId: '$organizationId',
          scheduledDate: '$scheduledDate',
          normalizedTitle: '$normalizedTitle',
          clientName: '$clientName'
        },
        count: { $sum: 1 },
        records: {
          $push: {
            _id: '$_id',
            source: '$source',
            createdAt: '$createdAt',
            transcript: '$transcript',
            status: '$status',
            title: '$title'
          }
        }
      }
    },
    {
      // Only keep groups with duplicates
      $match: { count: { $gt: 1 } }
    },
    {
      // Sort by count descending
      $sort: { count: -1 }
    }
  ]).toArray()

  console.log(`Found ${duplicates.length} groups of duplicates\n`)

  const duplicateGroups: DuplicateGroup[] = []

  for (const dup of duplicates) {
    // Get analysis records for each call record
    const recordsWithAnalysis = await Promise.all(
      dup.records.map(async (record: any) => {
        const analyses = await db.collection('call_analysis').find({
          callRecordId: record._id
        }).toArray()

        return {
          _id: record._id,
          source: record.source || 'unknown',
          createdAt: record.createdAt || new Date(0),
          hasTranscript: !!(record.transcript && record.transcript.trim()),
          transcriptLength: record.transcript?.length || 0,
          status: record.status || 'unknown',
          analysisIds: analyses.map((a: any) => a._id)
        }
      })
    )

    // Sort records to determine which one to keep
    // Priority: 1. Has transcript, 2. Longer transcript, 3. Has analysis, 4. Oldest
    const sortedRecords = recordsWithAnalysis.sort((a, b) => {
      // Prefer records with transcripts
      if (a.hasTranscript !== b.hasTranscript) {
        return a.hasTranscript ? -1 : 1
      }
      // Prefer longer transcripts
      if (a.transcriptLength !== b.transcriptLength) {
        return b.transcriptLength - a.transcriptLength
      }
      // Prefer records with analyses
      if (a.analysisIds.length !== b.analysisIds.length) {
        return b.analysisIds.length - a.analysisIds.length
      }
      // Prefer older records (first one created)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    const keepRecord = sortedRecords[0]
    const deleteRecords = sortedRecords.slice(1)

    // Collect all analysis IDs to delete (from records being deleted)
    const deleteAnalyses = deleteRecords.flatMap(r => r.analysisIds)

    duplicateGroups.push({
      compositeKey: `${dup._id.scheduledDate}|${dup._id.normalizedTitle}|${dup._id.clientName}`,
      organizationId: dup._id.organizationId,
      scheduledDate: dup._id.scheduledDate,
      title: dup._id.normalizedTitle,
      clientName: dup._id.clientName || '(no client name)',
      records: sortedRecords,
      keepRecord: keepRecord._id,
      deleteRecords: deleteRecords.map(r => r._id),
      deleteAnalyses
    })
  }

  return duplicateGroups
}

function printDuplicateReport(groups: DuplicateGroup[]) {
  console.log('=' .repeat(80))
  console.log('DUPLICATE CALL RECORDS REPORT')
  console.log('=' .repeat(80))

  let totalToDelete = 0
  let totalAnalysesToDelete = 0

  for (const group of groups) {
    console.log(`\n📅 Date: ${group.scheduledDate}`)
    console.log(`📝 Title: "${group.title}"`)
    console.log(`👤 Client: "${group.clientName}"`)
    console.log(`📊 Total duplicates: ${group.records.length}`)
    console.log('')

    for (const record of group.records) {
      const isKeep = record._id.equals(group.keepRecord)
      const marker = isKeep ? '✅ KEEP' : '❌ DELETE'
      console.log(`  ${marker}: ${record._id}`)
      console.log(`    Source: ${record.source}`)
      console.log(`    Created: ${record.createdAt}`)
      console.log(`    Transcript: ${record.hasTranscript ? `${record.transcriptLength} chars` : 'none'}`)
      console.log(`    Status: ${record.status}`)
      console.log(`    Analyses: ${record.analysisIds.length}`)
    }

    totalToDelete += group.deleteRecords.length
    totalAnalysesToDelete += group.deleteAnalyses.length

    console.log('-'.repeat(80))
  }

  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log(`Duplicate groups found: ${groups.length}`)
  console.log(`Call records to DELETE: ${totalToDelete}`)
  console.log(`Call analyses to DELETE: ${totalAnalysesToDelete}`)
  console.log(`Call records to KEEP: ${groups.length}`)
  console.log('='.repeat(80))

  return { totalToDelete, totalAnalysesToDelete }
}

async function executeDeletion(db: any, groups: DuplicateGroup[]) {
  console.log('\n🚨 EXECUTING DELETION...\n')

  let deletedRecords = 0
  let deletedAnalyses = 0

  for (const group of groups) {
    // Delete analyses first (foreign key references)
    if (group.deleteAnalyses.length > 0) {
      const analysisResult = await db.collection('call_analysis').deleteMany({
        _id: { $in: group.deleteAnalyses }
      })
      deletedAnalyses += analysisResult.deletedCount
      console.log(`  Deleted ${analysisResult.deletedCount} analyses for group: ${group.compositeKey}`)
    }

    // Delete call records
    if (group.deleteRecords.length > 0) {
      const recordResult = await db.collection('call_records').deleteMany({
        _id: { $in: group.deleteRecords }
      })
      deletedRecords += recordResult.deletedCount
      console.log(`  Deleted ${recordResult.deletedCount} call records for group: ${group.compositeKey}`)
    }
  }

  console.log('\n✅ DELETION COMPLETE')
  console.log(`  Total call records deleted: ${deletedRecords}`)
  console.log(`  Total call analyses deleted: ${deletedAnalyses}`)

  return { deletedRecords, deletedAnalyses }
}

// ============================================================================
// TINYBIRD FUNCTIONS
// ============================================================================

async function tinybirdRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: string
): Promise<any> {
  if (!TINYBIRD_TOKEN) {
    throw new Error('TINYBIRD_TOKEN not configured')
  }

  const url = `${TINYBIRD_HOST}${endpoint}`
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TINYBIRD_TOKEN}`,
      'Content-Type': body ? 'application/x-ndjson' : 'application/json',
    },
    body,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tinybird API error: ${response.status} - ${error}`)
  }

  return response.json()
}

async function truncateTinybirdDatasource(datasourceName: string): Promise<void> {
  console.log(`  Truncating Tinybird datasource: ${datasourceName}...`)
  try {
    await tinybirdRequest(`/v0/datasources/${datasourceName}/truncate`, 'POST')
    console.log(`  ✅ Truncated ${datasourceName}`)
  } catch (error: any) {
    if (error.message.includes('404')) {
      console.log(`  ⚠️  Datasource ${datasourceName} not found (skipping)`)
    } else {
      throw error
    }
  }
}

async function ingestToTinybird(
  datasourceName: string,
  records: Record<string, unknown>[]
): Promise<{ successful: number; quarantined: number }> {
  if (records.length === 0) {
    return { successful: 0, quarantined: 0 }
  }

  const BATCH_SIZE = 1000
  let totalSuccessful = 0
  let totalQuarantined = 0

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const ndjson = batch.map(r => JSON.stringify(r)).join('\n')

    const result = await tinybirdRequest(
      `/v0/events?name=${datasourceName}`,
      'POST',
      ndjson
    )

    totalSuccessful += result.successful_rows || 0
    totalQuarantined += result.quarantined_rows || 0

    console.log(`  Ingested batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} to ${datasourceName}`)
  }

  return { successful: totalSuccessful, quarantined: totalQuarantined }
}

function transformCallRecordForTinybird(record: any): Record<string, unknown> {
  return {
    id: record._id?.toString() || '',
    organization_id: record.organizationId?.toString() || '',
    user_id: record.userId?.toString() || '',
    sales_rep_id: record.salesRepId || '',
    sales_rep_name: record.salesRepName || '',
    source: record.source || '',
    fathom_call_id: record.fathomCallId || null,
    fireflies_call_id: record.firefliesCallId || null,
    zoom_call_id: record.zoomCallId || null,
    claap_call_id: record.claapCallId || null,
    title: record.title || '',
    transcript: record.transcript || '',
    scheduled_start_time: record.scheduledStartTime?.toISOString() || null,
    scheduled_end_time: record.scheduledEndTime?.toISOString() || null,
    actual_duration: record.actualDuration || 0,
    scheduled_duration: record.scheduledDuration || 0,
    recording_url: record.recordingUrl || '',
    share_url: record.shareUrl || '',
    has_external_invitees: record.hasExternalInvitees ? 1 : 0,
    status: record.status || 'pending',
    created_at: record.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: record.updatedAt?.toISOString() || new Date().toISOString(),
  }
}

function transformCallAnalysisForTinybird(analysis: any): Record<string, unknown> {
  return {
    id: analysis._id?.toString() || '',
    organization_id: analysis.organizationId?.toString() || '',
    call_record_id: analysis.callRecordId?.toString() || '',
    user_id: analysis.userId || '',
    sales_rep_id: analysis.salesRepId || '',
    type_of_call: analysis.typeOfCall || '',
    closeur: analysis.closeur || '',
    prospect: analysis.prospect || '',
    duree_appel: analysis.dureeAppel || '',
    vente_effectuee: analysis.venteEffectuee ? 1 : 0,
    deal_value: analysis.dealValue || null,
    note_globale_total: analysis.noteGlobale?.total || 0,
    note_globale_sur100: analysis.noteGlobale?.sur100 || '0',
    analysis_status: analysis.analysisStatus || 'pending',
    created_at: analysis.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: analysis.updatedAt?.toISOString() || new Date().toISOString(),
  }
}

async function resyncTinybird(db: any): Promise<void> {
  console.log('\n🔄 RESYNCING TINYBIRD FROM MONGODB...\n')

  if (!TINYBIRD_TOKEN) {
    console.log('⚠️  TINYBIRD_TOKEN not configured, skipping Tinybird resync')
    return
  }

  // Step 1: Truncate Tinybird datasources
  console.log('Step 1: Truncating Tinybird datasources...')
  await truncateTinybirdDatasource('call_records')
  await truncateTinybirdDatasource('call_analysis')
  await truncateTinybirdDatasource('call_analysis_objections')

  // Step 2: Re-ingest CallRecords from MongoDB
  console.log('\nStep 2: Re-ingesting call_records...')
  const callRecords = await db.collection('call_records').find({}).toArray()
  console.log(`  Found ${callRecords.length} call records in MongoDB`)

  if (callRecords.length > 0) {
    const tinybirdRecords = callRecords.map(transformCallRecordForTinybird)
    const recordsResult = await ingestToTinybird('call_records', tinybirdRecords)
    console.log(`  ✅ Ingested ${recordsResult.successful} call records (${recordsResult.quarantined} quarantined)`)
  }

  // Step 3: Re-ingest CallAnalysis from MongoDB
  console.log('\nStep 3: Re-ingesting call_analysis...')
  const callAnalyses = await db.collection('call_analysis').find({}).toArray()
  console.log(`  Found ${callAnalyses.length} call analyses in MongoDB`)

  if (callAnalyses.length > 0) {
    const tinybirdAnalyses = callAnalyses.map(transformCallAnalysisForTinybird)
    const analysesResult = await ingestToTinybird('call_analysis', tinybirdAnalyses)
    console.log(`  ✅ Ingested ${analysesResult.successful} call analyses (${analysesResult.quarantined} quarantined)`)
  }

  console.log('\n✅ TINYBIRD RESYNC COMPLETE')
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🧹 Duplicate Call Records Cleanup Script')
  console.log('========================================\n')

  if (EXECUTE_MODE) {
    console.log('⚠️  EXECUTE MODE ENABLED - Will actually delete records!')
    if (RESYNC_TINYBIRD) {
      console.log('⚠️  TINYBIRD RESYNC ENABLED - Will truncate and resync Tinybird!')
    }
    console.log('')
  } else {
    console.log('ℹ️  DRY RUN MODE - No changes will be made')
    console.log('   Run with --execute to delete duplicates from MongoDB')
    console.log('   Run with --execute --resync-tinybird to also resync Tinybird\n')
  }

  console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`)
  console.log(`Tinybird: ${TINYBIRD_TOKEN ? '✅ Configured' : '❌ Not configured'}`)

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB\n')

    const db = client.db()

    // Find duplicates
    const duplicateGroups = await findDuplicates(db)

    if (duplicateGroups.length === 0) {
      console.log('✨ No duplicates found in MongoDB!')

      // Even if no duplicates, allow Tinybird resync if requested
      if (EXECUTE_MODE && RESYNC_TINYBIRD) {
        console.log('\nProceeding with Tinybird resync (no MongoDB changes needed)...')
        await resyncTinybird(db)
      }
      return
    }

    // Print report
    const { totalToDelete, totalAnalysesToDelete } = printDuplicateReport(duplicateGroups)

    if (EXECUTE_MODE) {
      // Confirm before deletion
      console.log('\n⚠️  About to delete from MongoDB:')
      console.log(`   - ${totalToDelete} call records`)
      console.log(`   - ${totalAnalysesToDelete} call analyses`)

      if (RESYNC_TINYBIRD) {
        console.log('\n⚠️  Then will resync Tinybird:')
        console.log('   - Truncate call_records, call_analysis, call_analysis_objections')
        console.log('   - Re-ingest all records from clean MongoDB')
      }

      console.log('\nProceeding in 3 seconds...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Execute MongoDB deletion
      await executeDeletion(db, duplicateGroups)

      // Resync Tinybird if requested
      if (RESYNC_TINYBIRD) {
        await resyncTinybird(db)
      }
    } else {
      console.log('\n📋 To execute the cleanup, run:')
      console.log('   npx tsx scripts/cleanup-duplicate-calls.ts --execute')
      console.log('\n📋 To also resync Tinybird after cleanup:')
      console.log('   npx tsx scripts/cleanup-duplicate-calls.ts --execute --resync-tinybird')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Connection closed')
  }
}

main()
