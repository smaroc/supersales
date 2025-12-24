import { CallRecord, CallAnalysis, CallEvaluation } from './types'
import { ObjectId } from 'mongodb'

/**
 * Transform MongoDB CallRecord to Tinybird format
 */
export function transformCallRecordForTinybird(
  record: CallRecord & { _id?: ObjectId }
): Record<string, unknown> {
  const id = record._id?.toString() || new ObjectId().toString()

  return {
    id,
    organization_id: record.organizationId.toString(),
    user_id: record.userId.toString(),
    sales_rep_id: record.salesRepId,
    sales_rep_name: record.salesRepName || '',
    source: record.source,
    fathom_call_id: record.fathomCallId || null,
    fireflies_call_id: record.firefliesCallId || null,
    zoom_call_id: record.zoomCallId || null,
    claap_call_id: record.claapCallId || null,
    title: record.title || '',
    transcript: record.transcript || '',
    recording_url: record.recordingUrl || null,
    share_url: record.shareUrl || null,
    scheduled_start_time: record.scheduledStartTime instanceof Date
      ? record.scheduledStartTime.toISOString()
      : record.scheduledStartTime,
    scheduled_end_time: record.scheduledEndTime instanceof Date
      ? record.scheduledEndTime.toISOString()
      : record.scheduledEndTime,
    actual_duration: record.actualDuration || 0,
    scheduled_duration: record.scheduledDuration || 0,
    has_external_invitees: record.hasExternalInvitees ? 1 : 0,
    status: record.status || 'pending',
    evaluation_id: record.evaluationId || null,
    created_at: record.createdAt instanceof Date
      ? record.createdAt.toISOString()
      : record.createdAt || new Date().toISOString(),
    updated_at: record.updatedAt instanceof Date
      ? record.updatedAt.toISOString()
      : record.updatedAt || new Date().toISOString(),
  }
}

/**
 * Transform MongoDB CallAnalysis to Tinybird format
 * Returns main record + flattened arrays for objections
 */
export function transformCallAnalysisForTinybird(
  analysis: CallAnalysis & { _id?: ObjectId }
): {
  main: Record<string, unknown>
  objections: Record<string, unknown>[]
} {
  const analysisId = analysis._id?.toString() || new ObjectId().toString()
  const createdAt = analysis.createdAt instanceof Date
    ? analysis.createdAt.toISOString()
    : analysis.createdAt || new Date().toISOString()
  const updatedAt = analysis.updatedAt instanceof Date
    ? analysis.updatedAt.toISOString()
    : analysis.updatedAt || new Date().toISOString()

  const main = {
    id: analysisId,
    organization_id: analysis.organizationId.toString(),
    user_id: analysis.userId || '',
    call_record_id: analysis.callRecordId.toString(),
    sales_rep_id: analysis.salesRepId || '',
    type_of_call: analysis.typeOfCall || 'other',
    closeur: analysis.closeur || '',
    prospect: analysis.prospect || '',
    duree_appel: analysis.dureeAppel || '',
    vente_effectuee: analysis.venteEffectuee ? 1 : 0,
    deal_value: analysis.dealValue ?? null,
    product_id: analysis.productId?.toString() || null,
    invoice_status: analysis.invoiceStatus || null,
    temps_de_parole_closeur: analysis.temps_de_parole_closeur || 0,
    temps_de_parole_client: analysis.temps_de_parole_client || 0,
    no_show: analysis.no_show ? 1 : 0,
    pitch_effectue: analysis.pitch_effectue ? 1 : 0,
    note_globale_total: analysis.noteGlobale?.total || 0,
    partie_excellente: analysis.partie_excellente || null,
    partie_a_travailler: analysis.partie_a_travailler || null,
    resume_forces: analysis.resumeForces
      ? JSON.stringify(analysis.resumeForces)
      : null,
    axes_amelioration: analysis.axesAmelioration
      ? JSON.stringify(analysis.axesAmelioration)
      : null,
    analysis_status: analysis.analysisStatus || 'pending',
    is_public: analysis.isPublic ? 1 : 0,
    share_token: analysis.shareToken || null,
    created_at: createdAt,
    updated_at: updatedAt,
  }

  // Flatten objections_lead array into separate records
  const objections = (analysis.objections_lead || []).map((obj, index) => ({
    id: `${analysisId}_obj_${index}`,
    call_analysis_id: analysisId,
    organization_id: analysis.organizationId.toString(),
    sales_rep_id: analysis.salesRepId || '',
    objection: obj.objection || '',
    type_objection: obj.type_objection || null,
    traitement: obj.traitement || null,
    resolue: obj.resolue ? 1 : 0,
    created_at: createdAt,
  }))

  return { main, objections }
}

/**
 * Transform MongoDB CallEvaluation to Tinybird format
 */
export function transformCallEvaluationForTinybird(
  evaluation: CallEvaluation & { _id?: ObjectId }
): Record<string, unknown> {
  const id = evaluation._id?.toString() || new ObjectId().toString()

  return {
    id,
    organization_id: evaluation.organizationId.toString(),
    call_id: evaluation.callId || '',
    sales_rep_id: evaluation.salesRepId || '',
    call_type: evaluation.callType || '',
    evaluation_date: evaluation.evaluationDate instanceof Date
      ? evaluation.evaluationDate.toISOString()
      : evaluation.evaluationDate,
    duration: evaluation.duration || 0,
    outcome: evaluation.outcome || 'follow_up',
    deal_value: evaluation.dealValue ?? null,
    total_score: evaluation.totalScore || 0,
    weighted_score: evaluation.weightedScore || 0,
    created_at: evaluation.createdAt instanceof Date
      ? evaluation.createdAt.toISOString()
      : evaluation.createdAt || new Date().toISOString(),
    updated_at: evaluation.updatedAt instanceof Date
      ? evaluation.updatedAt.toISOString()
      : evaluation.updatedAt || new Date().toISOString(),
  }
}

/**
 * Batch transform multiple CallRecords
 */
export function transformCallRecordsForTinybird(
  records: (CallRecord & { _id?: ObjectId })[]
): Record<string, unknown>[] {
  return records.map(transformCallRecordForTinybird)
}

/**
 * Batch transform multiple CallAnalyses
 * Returns flattened structure for bulk ingestion
 */
export function transformCallAnalysesForTinybird(
  analyses: (CallAnalysis & { _id?: ObjectId })[]
): {
  mains: Record<string, unknown>[]
  objections: Record<string, unknown>[]
} {
  const mains: Record<string, unknown>[] = []
  const objections: Record<string, unknown>[] = []

  for (const analysis of analyses) {
    const transformed = transformCallAnalysisForTinybird(analysis)
    mains.push(transformed.main)
    objections.push(...transformed.objections)
  }

  return { mains, objections }
}

/**
 * Batch transform multiple CallEvaluations
 */
export function transformCallEvaluationsForTinybird(
  evaluations: (CallEvaluation & { _id?: ObjectId })[]
): Record<string, unknown>[] {
  return evaluations.map(transformCallEvaluationForTinybird)
}
