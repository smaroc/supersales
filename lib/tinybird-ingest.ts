import { getTinybirdClient, isTinybirdConfigured } from './tinybird'
import {
  transformCallRecordForTinybird,
  transformCallAnalysisForTinybird,
  transformCallEvaluationForTinybird,
} from './tinybird-transformers'
import { CallRecord, CallAnalysis, CallEvaluation } from './types'
import { ObjectId } from 'mongodb'

/**
 * Ingest CallRecord to Tinybird (after MongoDB insert)
 * Fails silently with logging to not block the primary write
 */
export async function tinybirdIngestCallRecord(
  record: CallRecord & { _id?: ObjectId }
): Promise<void> {
  if (!isTinybirdConfigured()) {
    return
  }

  try {
    const tinybird = getTinybirdClient()
    const tinybirdData = transformCallRecordForTinybird(record)
    await tinybird.ingest('call_records', tinybirdData)
  } catch (error) {
    console.error('[Tinybird] Ingest failed for CallRecord:', error)
  }
}

/**
 * Ingest CallAnalysis to Tinybird (after MongoDB insert/update)
 * Also ingests flattened objections to separate table
 * Fails silently with logging to not block the primary write
 */
export async function tinybirdIngestCallAnalysis(
  analysis: CallAnalysis & { _id?: ObjectId }
): Promise<void> {
  if (!isTinybirdConfigured()) {
    return
  }

  try {
    const tinybird = getTinybirdClient()
    const { main, objections } = transformCallAnalysisForTinybird(analysis)

    // Ingest main record and objections in parallel
    const promises: Promise<unknown>[] = [
      tinybird.ingest('call_analysis', main),
    ]

    if (objections.length > 0) {
      promises.push(tinybird.ingest('call_analysis_objections', objections))
    }

    await Promise.all(promises)
  } catch (error) {
    console.error('[Tinybird] Ingest failed for CallAnalysis:', error)
  }
}

/**
 * Ingest CallEvaluation to Tinybird (after MongoDB insert)
 * Fails silently with logging to not block the primary write
 */
export async function tinybirdIngestCallEvaluation(
  evaluation: CallEvaluation & { _id?: ObjectId }
): Promise<void> {
  if (!isTinybirdConfigured()) {
    return
  }

  try {
    const tinybird = getTinybirdClient()
    const tinybirdData = transformCallEvaluationForTinybird(evaluation)
    await tinybird.ingest('call_evaluations', tinybirdData)
  } catch (error) {
    console.error('[Tinybird] Ingest failed for CallEvaluation:', error)
  }
}

/**
 * Batch ingest multiple CallRecords to Tinybird
 * Useful for migration scripts
 */
export async function batchIngestCallRecords(
  records: (CallRecord & { _id?: ObjectId })[]
): Promise<{ success: number; failed: number }> {
  if (!isTinybirdConfigured() || records.length === 0) {
    return { success: 0, failed: 0 }
  }

  try {
    const tinybird = getTinybirdClient()
    const tinybirdData = records.map(transformCallRecordForTinybird)
    const result = await tinybird.ingest('call_records', tinybirdData)
    return {
      success: result.successful_rows,
      failed: result.quarantined_rows,
    }
  } catch (error) {
    console.error('[Tinybird] Batch ingest failed for CallRecords:', error)
    return { success: 0, failed: records.length }
  }
}

/**
 * Batch ingest multiple CallAnalyses to Tinybird
 * Useful for migration scripts
 */
export async function batchIngestCallAnalyses(
  analyses: (CallAnalysis & { _id?: ObjectId })[]
): Promise<{ success: number; failed: number }> {
  if (!isTinybirdConfigured() || analyses.length === 0) {
    return { success: 0, failed: 0 }
  }

  try {
    const tinybird = getTinybirdClient()

    const mains: Record<string, unknown>[] = []
    const objections: Record<string, unknown>[] = []

    for (const analysis of analyses) {
      const transformed = transformCallAnalysisForTinybird(analysis)
      mains.push(transformed.main)
      objections.push(...transformed.objections)
    }

    const promises: Promise<unknown>[] = [
      tinybird.ingest('call_analysis', mains),
    ]

    if (objections.length > 0) {
      promises.push(tinybird.ingest('call_analysis_objections', objections))
    }

    await Promise.all(promises)
    return { success: analyses.length, failed: 0 }
  } catch (error) {
    console.error('[Tinybird] Batch ingest failed for CallAnalyses:', error)
    return { success: 0, failed: analyses.length }
  }
}

/**
 * Batch ingest multiple CallEvaluations to Tinybird
 * Useful for migration scripts
 */
export async function batchIngestCallEvaluations(
  evaluations: (CallEvaluation & { _id?: ObjectId })[]
): Promise<{ success: number; failed: number }> {
  if (!isTinybirdConfigured() || evaluations.length === 0) {
    return { success: 0, failed: 0 }
  }

  try {
    const tinybird = getTinybirdClient()
    const tinybirdData = evaluations.map(transformCallEvaluationForTinybird)
    const result = await tinybird.ingest('call_evaluations', tinybirdData)
    return {
      success: result.successful_rows,
      failed: result.quarantined_rows,
    }
  } catch (error) {
    console.error('[Tinybird] Batch ingest failed for CallEvaluations:', error)
    return { success: 0, failed: evaluations.length }
  }
}
