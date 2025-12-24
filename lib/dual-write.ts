import { getTinybirdClient, isTinybirdDualWriteEnabled } from './tinybird'
import {
  transformCallRecordForTinybird,
  transformCallAnalysisForTinybird,
  transformCallEvaluationForTinybird,
} from './tinybird-transformers'
import { CallRecord, CallAnalysis, CallEvaluation } from './types'
import { ObjectId } from 'mongodb'

/**
 * Write CallRecord to Tinybird (after MongoDB insert)
 * Fails silently with logging to not block the primary write
 */
export async function dualWriteCallRecord(
  record: CallRecord & { _id?: ObjectId }
): Promise<void> {
  if (!isTinybirdDualWriteEnabled()) {
    return
  }

  try {
    const tinybird = getTinybirdClient()
    const tinybirdData = transformCallRecordForTinybird(record)
    await tinybird.ingest('call_records', tinybirdData)
  } catch (error) {
    // Log but don't fail the MongoDB write
    console.error('[Tinybird] Dual-write failed for CallRecord:', error)
  }
}

/**
 * Write CallAnalysis to Tinybird (after MongoDB insert/update)
 * Also writes flattened objections to separate table
 * Fails silently with logging to not block the primary write
 */
export async function dualWriteCallAnalysis(
  analysis: CallAnalysis & { _id?: ObjectId }
): Promise<void> {
  if (!isTinybirdDualWriteEnabled()) {
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
    console.error('[Tinybird] Dual-write failed for CallAnalysis:', error)
  }
}

/**
 * Write CallEvaluation to Tinybird (after MongoDB insert)
 * Fails silently with logging to not block the primary write
 */
export async function dualWriteCallEvaluation(
  evaluation: CallEvaluation & { _id?: ObjectId }
): Promise<void> {
  if (!isTinybirdDualWriteEnabled()) {
    return
  }

  try {
    const tinybird = getTinybirdClient()
    const tinybirdData = transformCallEvaluationForTinybird(evaluation)
    await tinybird.ingest('call_evaluations', tinybirdData)
  } catch (error) {
    console.error('[Tinybird] Dual-write failed for CallEvaluation:', error)
  }
}

/**
 * Update CallRecord in Tinybird
 * Since Tinybird is append-only, we insert a new row with updated values
 * The pipes use ORDER BY updated_at DESC LIMIT 1 to get latest version
 */
export async function dualWriteCallRecordUpdate(
  record: CallRecord & { _id?: ObjectId }
): Promise<void> {
  // Same as insert - Tinybird handles dedup via query
  return dualWriteCallRecord(record)
}

/**
 * Update CallAnalysis in Tinybird
 * Since Tinybird is append-only, we insert a new row with updated values
 * The pipes use ORDER BY updated_at DESC LIMIT 1 to get latest version
 */
export async function dualWriteCallAnalysisUpdate(
  analysis: CallAnalysis & { _id?: ObjectId }
): Promise<void> {
  // Same as insert - Tinybird handles dedup via query
  return dualWriteCallAnalysis(analysis)
}

/**
 * Update CallEvaluation in Tinybird
 * Since Tinybird is append-only, we insert a new row with updated values
 */
export async function dualWriteCallEvaluationUpdate(
  evaluation: CallEvaluation & { _id?: ObjectId }
): Promise<void> {
  // Same as insert - Tinybird handles dedup via query
  return dualWriteCallEvaluation(evaluation)
}

/**
 * Batch write multiple CallRecords to Tinybird
 * Useful for migration scripts
 */
export async function batchWriteCallRecords(
  records: (CallRecord & { _id?: ObjectId })[]
): Promise<{ success: number; failed: number }> {
  if (!isTinybirdDualWriteEnabled() || records.length === 0) {
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
    console.error('[Tinybird] Batch write failed for CallRecords:', error)
    return { success: 0, failed: records.length }
  }
}

/**
 * Batch write multiple CallAnalyses to Tinybird
 * Useful for migration scripts
 */
export async function batchWriteCallAnalyses(
  analyses: (CallAnalysis & { _id?: ObjectId })[]
): Promise<{ success: number; failed: number }> {
  if (!isTinybirdDualWriteEnabled() || analyses.length === 0) {
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
    console.error('[Tinybird] Batch write failed for CallAnalyses:', error)
    return { success: 0, failed: analyses.length }
  }
}

/**
 * Batch write multiple CallEvaluations to Tinybird
 * Useful for migration scripts
 */
export async function batchWriteCallEvaluations(
  evaluations: (CallEvaluation & { _id?: ObjectId })[]
): Promise<{ success: number; failed: number }> {
  if (!isTinybirdDualWriteEnabled() || evaluations.length === 0) {
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
    console.error('[Tinybird] Batch write failed for CallEvaluations:', error)
    return { success: 0, failed: evaluations.length }
  }
}
