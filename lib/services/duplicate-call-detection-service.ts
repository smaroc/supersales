import { Db, ObjectId } from 'mongodb'
import { CallRecord, CallAnalysis, User, COLLECTIONS } from '@/lib/types'

export interface DuplicateCheckParams {
  organizationId: ObjectId
  salesRepId: string // The user ID of the sales rep this call should be assigned to
  scheduledStartTime: Date
  meetingTitle: string // Required for composite key matching
  salesRepEmail?: string
  salesRepName?: string
  leadEmails?: string[]
  leadNames?: string[]
  // Platform-specific IDs for exact match
  fathomCallId?: string
  firefliesCallId?: string
  zoomCallId?: string
  claapCallId?: string
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingCallId?: string
  existingAnalysisId?: string
  matchType?: 'exact_id' | 'schedule_match'
  message: string
}

export interface ResolveSalesRepParams {
  db: Db
  organizationId: ObjectId
  salesRepEmail?: string
  salesRepName?: string
  fallbackUserId?: ObjectId // The user from the webhook URL (e.g., head of sales)
}

export interface ResolveSalesRepResult {
  user: User | null
  resolvedBy: 'email' | 'name' | 'fallback' | 'not_found'
}

export class DuplicateCallDetectionService {
  /**
   * Resolve the actual sales rep user from webhook data
   *
   * Priority:
   * 1. Find user by email from webhook (sales rep's email)
   * 2. Find user by name from webhook (if email not found)
   * 3. Fall back to the user from webhook URL (head of sales integration)
   */
  static async resolveSalesRep(
    params: ResolveSalesRepParams
  ): Promise<ResolveSalesRepResult> {
    const { db, organizationId, salesRepEmail, salesRepName, fallbackUserId } = params

    // 1. Try to find by email (most reliable)
    if (salesRepEmail) {
      const userByEmail = await db.collection(COLLECTIONS.USERS).findOne({
        email: salesRepEmail.toLowerCase().trim(),
        organizationId,
        isActive: true
      }) as User | null

      if (userByEmail) {
        return { user: userByEmail, resolvedBy: 'email' }
      }
    }

    // 2. Try to find by name (less reliable, but useful)
    if (salesRepName) {
      // Try exact match first
      const nameParts = salesRepName.trim().split(/\s+/)
      if (nameParts.length >= 2) {
        const userByName = await db.collection(COLLECTIONS.USERS).findOne({
          firstName: { $regex: new RegExp(`^${escapeRegex(nameParts[0])}$`, 'i') },
          lastName: { $regex: new RegExp(`^${escapeRegex(nameParts.slice(1).join(' '))}$`, 'i') },
          organizationId,
          isActive: true
        }) as User | null

        if (userByName) {
          return { user: userByName, resolvedBy: 'name' }
        }
      }

      // Try partial match on full name
      const userByFullName = await db.collection(COLLECTIONS.USERS).findOne({
        $expr: {
          $regexMatch: {
            input: { $concat: ['$firstName', ' ', '$lastName'] },
            regex: escapeRegex(salesRepName),
            options: 'i'
          }
        },
        organizationId,
        isActive: true
      }) as User | null

      if (userByFullName) {
        return { user: userByFullName, resolvedBy: 'name' }
      }
    }

    // 3. Fall back to the user from webhook URL
    if (fallbackUserId) {
      const fallbackUser = await db.collection(COLLECTIONS.USERS).findOne({
        _id: fallbackUserId,
        isActive: true
      }) as User | null

      if (fallbackUser) {
        return { user: fallbackUser, resolvedBy: 'fallback' }
      }
    }

    return { user: null, resolvedBy: 'not_found' }
  }

  /**
   * Check if a call already exists in the database
   *
   * Primary duplicate detection uses composite key:
   * - Scheduled date (same day)
   * - Client/Lead name (from invitees)
   * - Meeting title
   *
   * Assumption: Only one call can have the same scheduled date + client name + meeting title
   *
   * Fallback check uses platform-specific IDs if available.
   */
  static async checkForDuplicate(
    db: Db,
    params: DuplicateCheckParams
  ): Promise<DuplicateCheckResult> {
    const {
      organizationId,
      scheduledStartTime,
      meetingTitle,
      leadNames,
      fathomCallId,
      firefliesCallId,
      zoomCallId,
      claapCallId
    } = params

    // Normalize meeting title for comparison (lowercase, trimmed)
    const normalizedTitle = meetingTitle.toLowerCase().trim()

    // Get the start and end of the scheduled day for date-only comparison
    const scheduledDate = new Date(scheduledStartTime)
    const dayStart = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate(), 23, 59, 59, 999)

    // 1. PRIMARY CHECK: Composite key (scheduled date + client name + meeting title)
    // Get first external client name from lead names
    const clientName = leadNames?.find(name => name && name.trim().length > 0)?.trim()

    if (clientName) {
      const compositeQuery = {
        organizationId,
        scheduledStartTime: { $gte: dayStart, $lte: dayEnd },
        title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
        'invitees.name': { $regex: new RegExp(escapeRegex(clientName), 'i') }
      }

      const existingByComposite = await db
        .collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
        .findOne(compositeQuery)

      if (existingByComposite) {
        return {
          isDuplicate: true,
          existingCallId: existingByComposite._id?.toString(),
          matchType: 'schedule_match',
          message: `Duplicate found: same date (${scheduledDate.toISOString().split('T')[0]}), client "${clientName}", title "${meetingTitle}"`
        }
      }
    }

    // 2. FALLBACK CHECK: Platform-specific ID (if composite key check didn't find duplicate)
    const idConditions: any[] = []

    if (fathomCallId) idConditions.push({ fathomCallId })
    if (firefliesCallId) idConditions.push({ firefliesCallId })
    if (zoomCallId) idConditions.push({ zoomCallId })
    if (claapCallId) idConditions.push({ claapCallId })

    if (idConditions.length > 0) {
      const idQuery = {
        organizationId,
        $or: idConditions
      }

      const existingByPlatformId = await db
        .collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
        .findOne(idQuery)

      if (existingByPlatformId) {
        return {
          isDuplicate: true,
          existingCallId: existingByPlatformId._id?.toString(),
          matchType: 'exact_id',
          message: 'Call already exists with matching platform ID'
        }
      }
    }

    return {
      isDuplicate: false,
      message: 'No duplicate found'
    }
  }

  /**
   * Check if a CallAnalysis already exists for a call with matching composite key
   *
   * Uses the same composite key as CallRecords: scheduled date + client name + meeting title
   * This prevents duplicate analyses when the same call arrives from multiple sources.
   *
   * @param db Database connection
   * @param callRecord The call record to check for existing analysis
   * @returns DuplicateCheckResult indicating if analysis already exists
   */
  static async checkForDuplicateAnalysis(
    db: Db,
    callRecord: CallRecord
  ): Promise<DuplicateCheckResult> {
    const {
      organizationId,
      scheduledStartTime,
      title,
      invitees
    } = callRecord

    // Get the start and end of the scheduled day for date-only comparison
    const scheduledDate = new Date(scheduledStartTime)
    const dayStart = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate(), 23, 59, 59, 999)

    // Get first external client name from invitees
    const clientName = invitees?.find(i => i.name && i.name.trim().length > 0)?.name?.trim()

    // Normalize meeting title for comparison
    const normalizedTitle = (title || '').toLowerCase().trim()

    if (!clientName) {
      // Can't do composite key check without client name, fall back to callRecordId check
      const existingAnalysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).findOne({
        callRecordId: callRecord._id
      })

      if (existingAnalysis) {
        return {
          isDuplicate: true,
          existingAnalysisId: existingAnalysis._id?.toString(),
          existingCallId: callRecord._id?.toString(),
          matchType: 'exact_id',
          message: 'Analysis already exists for this call record'
        }
      }

      return {
        isDuplicate: false,
        message: 'No duplicate analysis found (no client name for composite check)'
      }
    }

    // Find any CallRecord with matching composite key that already has an analysis
    const matchingCallRecordsWithAnalysis = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).aggregate([
      {
        $match: {
          organizationId,
          scheduledStartTime: { $gte: dayStart, $lte: dayEnd },
          title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
          'invitees.name': { $regex: new RegExp(escapeRegex(clientName), 'i') }
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.CALL_ANALYSIS,
          localField: '_id',
          foreignField: 'callRecordId',
          as: 'analysis'
        }
      },
      {
        $match: {
          'analysis.0': { $exists: true } // Has at least one analysis
        }
      },
      {
        $limit: 1
      }
    ]).toArray()

    if (matchingCallRecordsWithAnalysis.length > 0) {
      const matchedRecord = matchingCallRecordsWithAnalysis[0]
      const existingAnalysis = matchedRecord.analysis?.[0]

      return {
        isDuplicate: true,
        existingCallId: matchedRecord._id?.toString(),
        existingAnalysisId: existingAnalysis?._id?.toString(),
        matchType: 'schedule_match',
        message: `Analysis already exists for same date (${scheduledDate.toISOString().split('T')[0]}), client "${clientName}", title "${title}"`
      }
    }

    return {
      isDuplicate: false,
      message: 'No duplicate analysis found'
    }
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
