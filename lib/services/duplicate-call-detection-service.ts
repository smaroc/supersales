import { Db, ObjectId } from 'mongodb'
import { CallRecord, User, COLLECTIONS } from '@/lib/types'

export interface DuplicateCheckParams {
  organizationId: ObjectId
  salesRepId: string // The user ID of the sales rep this call should be assigned to
  scheduledStartTime: Date
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
   * Check if a call already exists in the database FOR THIS SPECIFIC SALES REP
   *
   * Important: The same call can exist for different sales reps (e.g., both were on the call)
   * We only check for duplicates for the SAME sales rep.
   *
   * Checks in order:
   * 1. Exact match by platform-specific call ID + salesRepId
   * 2. Match by scheduled date + salesRepId + (lead email OR name)
   */
  static async checkForDuplicate(
    db: Db,
    params: DuplicateCheckParams
  ): Promise<DuplicateCheckResult> {
    const {
      organizationId,
      salesRepId,
      scheduledStartTime,
      salesRepEmail,
      salesRepName,
      leadEmails,
      leadNames,
      fathomCallId,
      firefliesCallId,
      zoomCallId,
      claapCallId
    } = params

    // 1. Check by platform-specific ID + salesRepId (exact match for this user)
    const idConditions: any[] = []

    if (fathomCallId) idConditions.push({ fathomCallId })
    if (firefliesCallId) idConditions.push({ firefliesCallId })
    if (zoomCallId) idConditions.push({ zoomCallId })
    if (claapCallId) idConditions.push({ claapCallId })

    if (idConditions.length > 0) {
      const idQuery = {
        organizationId,
        salesRepId, // Check for THIS specific sales rep
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
          message: 'Call already exists for this sales rep with matching platform ID'
        }
      }
    }

    // 2. Check by scheduled date + salesRepId + lead info
    // Create a time window of +/- 30 minutes around the scheduled start time
    const timeWindowMs = 30 * 60 * 1000 // 30 minutes
    const startTimeMin = new Date(scheduledStartTime.getTime() - timeWindowMs)
    const startTimeMax = new Date(scheduledStartTime.getTime() + timeWindowMs)

    // Build lead matching conditions
    const leadConditions: any[] = []
    if (leadEmails && leadEmails.length > 0) {
      const normalizedEmails = leadEmails.map(e => e.toLowerCase().trim()).filter(Boolean)
      if (normalizedEmails.length > 0) {
        leadConditions.push({ 'invitees.email': { $in: normalizedEmails } })
      }
    }
    if (leadNames && leadNames.length > 0) {
      const namePatterns = leadNames
        .filter(Boolean)
        .map(name => ({ 'invitees.name': { $regex: new RegExp(escapeRegex(name), 'i') } }))
      if (namePatterns.length > 0) {
        leadConditions.push(...namePatterns)
      }
    }

    // Only proceed with schedule match if we have lead info
    if (leadConditions.length > 0) {
      const scheduleMatchQuery = {
        organizationId,
        salesRepId, // Check for THIS specific sales rep
        scheduledStartTime: { $gte: startTimeMin, $lte: startTimeMax },
        $or: leadConditions
      }

      const existingBySchedule = await db
        .collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
        .findOne(scheduleMatchQuery)

      if (existingBySchedule) {
        return {
          isDuplicate: true,
          existingCallId: existingBySchedule._id?.toString(),
          matchType: 'schedule_match',
          message: 'Call already exists for this sales rep with similar schedule and lead'
        }
      }
    }

    return {
      isDuplicate: false,
      message: 'No duplicate found'
    }
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
