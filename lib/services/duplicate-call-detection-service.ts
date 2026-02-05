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
   * Detection priority:
   * 1. Platform-specific ID (exact match - same recording)
   * 2. Time-based match (same sales rep + same time window + similar title)
   *    - Handles case where same call is recorded by multiple users (different recording IDs)
   * 3. Composite key (same day + client name + title)
   *    - Fallback for edge cases
   */
  static async checkForDuplicate(
    db: Db,
    params: DuplicateCheckParams
  ): Promise<DuplicateCheckResult> {
    const {
      organizationId,
      salesRepId,
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

    // 1. PRIMARY CHECK: Platform-specific ID (exact match)
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

    // 2. TIME-BASED CHECK: Same sales rep + narrow time window + similar title
    // This catches duplicates when same call is recorded by multiple users (different recording IDs)
    // Use a 30-minute window around the scheduled time
    const timeWindowMs = 30 * 60 * 1000 // 30 minutes
    const timeWindowStart = new Date(scheduledDate.getTime() - timeWindowMs)
    const timeWindowEnd = new Date(scheduledDate.getTime() + timeWindowMs)

    const timeBasedQuery = {
      organizationId,
      salesRepId, // Same sales rep
      scheduledStartTime: { $gte: timeWindowStart, $lte: timeWindowEnd },
      title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') }
    }

    const existingByTimeAndRep = await db
      .collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
      .findOne(timeBasedQuery)

    if (existingByTimeAndRep) {
      return {
        isDuplicate: true,
        existingCallId: existingByTimeAndRep._id?.toString(),
        matchType: 'schedule_match',
        message: `Duplicate found: same sales rep, time window (${scheduledDate.toISOString()}), title "${meetingTitle}"`
      }
    }

    // 3. COMPOSITE KEY CHECK: Same day + client name + title (across all sales reps)
    // This catches edge cases where sales rep resolution differs
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

    return {
      isDuplicate: false,
      message: 'No duplicate found'
    }
  }

  /**
   * Check if a CallAnalysis already exists for a call with matching criteria
   *
   * Detection priority:
   * 1. Same call record ID
   * 2. Time-based match (same sales rep + time window + title)
   * 3. Composite key (same day + client name + title)
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
      salesRepId,
      scheduledStartTime,
      title,
      invitees
    } = callRecord

    // 1. Check if analysis exists for this exact call record
    const existingAnalysisForRecord = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).findOne({
      callRecordId: callRecord._id
    })

    if (existingAnalysisForRecord) {
      return {
        isDuplicate: true,
        existingAnalysisId: existingAnalysisForRecord._id?.toString(),
        existingCallId: callRecord._id?.toString(),
        matchType: 'exact_id',
        message: 'Analysis already exists for this call record'
      }
    }

    // Get date boundaries
    const scheduledDate = new Date(scheduledStartTime)
    const dayStart = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate(), 23, 59, 59, 999)

    // Normalize meeting title for comparison
    const normalizedTitle = (title || '').toLowerCase().trim()

    // 2. TIME-BASED CHECK: Same sales rep + narrow time window + similar title
    const timeWindowMs = 30 * 60 * 1000 // 30 minutes
    const timeWindowStart = new Date(scheduledDate.getTime() - timeWindowMs)
    const timeWindowEnd = new Date(scheduledDate.getTime() + timeWindowMs)

    const timeBasedMatch = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).aggregate([
      {
        $match: {
          organizationId,
          salesRepId,
          scheduledStartTime: { $gte: timeWindowStart, $lte: timeWindowEnd },
          title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
          _id: { $ne: callRecord._id } // Exclude current record
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
          'analysis.0': { $exists: true }
        }
      },
      {
        $limit: 1
      }
    ]).toArray()

    if (timeBasedMatch.length > 0) {
      const matchedRecord = timeBasedMatch[0]
      const existingAnalysis = matchedRecord.analysis?.[0]

      return {
        isDuplicate: true,
        existingCallId: matchedRecord._id?.toString(),
        existingAnalysisId: existingAnalysis?._id?.toString(),
        matchType: 'schedule_match',
        message: `Analysis already exists for same sales rep, time window (${scheduledDate.toISOString()}), title "${title}"`
      }
    }

    // 3. COMPOSITE KEY CHECK: Same day + client name + title
    const clientName = invitees?.find(i => i.name && i.name.trim().length > 0)?.name?.trim()

    if (clientName) {
      const compositeMatch = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).aggregate([
        {
          $match: {
            organizationId,
            scheduledStartTime: { $gte: dayStart, $lte: dayEnd },
            title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
            'invitees.name': { $regex: new RegExp(escapeRegex(clientName), 'i') },
            _id: { $ne: callRecord._id }
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
            'analysis.0': { $exists: true }
          }
        },
        {
          $limit: 1
        }
      ]).toArray()

      if (compositeMatch.length > 0) {
        const matchedRecord = compositeMatch[0]
        const existingAnalysis = matchedRecord.analysis?.[0]

        return {
          isDuplicate: true,
          existingCallId: matchedRecord._id?.toString(),
          existingAnalysisId: existingAnalysis?._id?.toString(),
          matchType: 'schedule_match',
          message: `Analysis already exists for same date (${scheduledDate.toISOString().split('T')[0]}), client "${clientName}", title "${title}"`
        }
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
