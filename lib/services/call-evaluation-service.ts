import { CallEvaluation } from '../models/call-evaluation'
import { CallType } from '../models/call-type'
import CallRecord from '@/models/CallRecord'
import User from '@/models/User'
import mongoose from 'mongoose'

export class CallEvaluationService {
  /**
   * Process a call record and create an evaluation
   */
  static async processCallRecord(callRecordId: string): Promise<any> {
    try {
      const callRecord = await CallRecord.findById(callRecordId)
        .populate('salesRepId')
      
      if (!callRecord) {
        throw new Error('Call record not found')
      }

      // Get default call type for the organization (or create one)
      let callType = await CallType.findOne({
        organizationId: callRecord.organizationId,
        isDefault: true,
        isActive: true
      })

      if (!callType) {
        // Create a default call type if none exists
        callType = await this.createDefaultCallType(callRecord.organizationId)
      }

      // Determine call outcome based on available data
      const outcome = this.determineCallOutcome(callRecord)
      
      // Calculate basic scores based on available criteria
      const scores = await this.calculateScores(callRecord, callType)
      
      // Calculate total and weighted scores
      const { totalScore, weightedScore } = this.calculateFinalScores(scores)

      // Create the evaluation
      const evaluation = new CallEvaluation({
        organizationId: (callRecord as any).organizationId.toString(),
        callId: (callRecord as any)._id.toString(),
        salesRepId: (callRecord as any).salesRepId.toString(),
        evaluatorId: 'system', // System-generated evaluation
        callTypeId: (callType as any)._id.toString(),
        callType: (callType as any).name,
        evaluationDate: new Date(),
        duration: callRecord.actualDuration,
        outcome,
        scores,
        totalScore,
        weightedScore,
        notes: `Auto-generated evaluation from ${callRecord.source} integration`,
        recording: {
          url: callRecord.recordingUrl,
          transcription: callRecord.transcript,
          duration: callRecord.actualDuration
        },
        nextSteps: this.generateNextSteps(outcome, callRecord),
        followUpDate: this.calculateFollowUpDate(outcome)
      })

      await evaluation.save()

      // Update the call record
      callRecord.status = 'evaluated'
      callRecord.evaluationId = evaluation._id as mongoose.Types.ObjectId
      callRecord.overallScore = totalScore
      callRecord.outcome = this.mapOutcomeToCallRecord(outcome) as any
      await callRecord.save()

      return evaluation

    } catch (error) {
      console.error('Error processing call record:', error)
      throw error
    }
  }

  /**
   * Create a default call type if none exists
   */
  private static async createDefaultCallType(organizationId: mongoose.Types.ObjectId): Promise<any> {
    const defaultCallType = new CallType({
      organizationId,
      name: 'GENERAL',
      description: 'General sales call evaluation',
      isDefault: true,
      isActive: true,
      criteria: [
        {
          name: 'Call Duration Appropriate',
          description: 'Was the call duration appropriate for the meeting type?',
          type: 'boolean',
          weight: 20,
          isRequired: true
        },
        {
          name: 'External Participants Engaged',
          description: 'Were external participants present and engaged?',
          type: 'boolean',
          weight: 30,
          isRequired: true
        },
        {
          name: 'Meeting Objectives Met',
          description: 'Were the meeting objectives achieved?',
          type: 'scale',
          weight: 30,
          scaleMin: 1,
          scaleMax: 5,
          isRequired: true
        },
        {
          name: 'Overall Call Quality',
          description: 'Overall quality of the sales call',
          type: 'scale',
          weight: 20,
          scaleMin: 1,
          scaleMax: 5,
          isRequired: true
        }
      ]
    })

    await defaultCallType.save()
    return defaultCallType
  }

  /**
   * Determine call outcome based on available data
   */
  private static determineCallOutcome(callRecord: any): string {
    // Basic heuristics - can be enhanced with AI/ML later
    const duration = callRecord.actualDuration
    const hasExternalInvitees = callRecord.hasExternalInvitees
    const transcript = callRecord.transcript || ''
    
    // No show if very short duration and no external participants
    if (duration < 2 && !hasExternalInvitees) {
      return 'no_show'
    }
    
    // Check transcript for positive/negative indicators
    const positiveIndicators = [
      'next steps', 'follow up', 'proposal', 'quote', 'agreement', 'deal',
      'contract', 'move forward', 'interested', 'yes', 'approved'
    ]
    
    const negativeIndicators = [
      'not interested', 'no budget', 'not now', 'pass', 'decline',
      'cannot proceed', 'not a fit', 'budget concerns'
    ]
    
    const lowerTranscript = transcript.toLowerCase()
    const positiveCount = positiveIndicators.filter(word => lowerTranscript.includes(word)).length
    const negativeCount = negativeIndicators.filter(word => lowerTranscript.includes(word)).length
    
    if (positiveCount > negativeCount && positiveCount > 0) {
      return duration > 30 ? 'closed_won' : 'follow_up_required'
    } else if (negativeCount > positiveCount && negativeCount > 0) {
      return 'closed_lost'
    }
    
    // Default to follow-up required for meaningful conversations
    return duration > 10 ? 'follow_up_required' : 'closed_lost'
  }

  /**
   * Calculate scores based on call data and criteria
   */
  private static async calculateScores(callRecord: any, callType: any): Promise<any[]> {
    const scores = []
    
    for (const criteria of callType.criteria) {
      let score: number | boolean | string = 0
      
      switch (criteria.name) {
        case 'Call Duration Appropriate':
          // Score based on whether duration is reasonable (5-90 minutes)
          score = callRecord.actualDuration >= 5 && callRecord.actualDuration <= 90
          break
          
        case 'External Participants Engaged':
          score = callRecord.hasExternalInvitees && callRecord.invitees.some((i: any) => i.isExternal)
          break
          
        case 'Meeting Objectives Met':
          // Base score on duration and external participation
          if (callRecord.actualDuration > 30 && callRecord.hasExternalInvitees) {
            score = 4
          } else if (callRecord.actualDuration > 15) {
            score = 3
          } else if (callRecord.actualDuration > 5) {
            score = 2
          } else {
            score = 1
          }
          break
          
        case 'Overall Call Quality':
          // Base on multiple factors
          let qualityScore = 1
          if (callRecord.actualDuration > 10) qualityScore++
          if (callRecord.hasExternalInvitees) qualityScore++
          if (callRecord.transcript && callRecord.transcript.length > 100) qualityScore++
          if (callRecord.actualDuration <= callRecord.scheduledDuration * 1.2) qualityScore++
          score = Math.min(qualityScore, 5)
          break
          
        default:
          // Default scoring logic
          if (criteria.type === 'boolean') {
            score = true
          } else if (criteria.type === 'scale') {
            score = Math.ceil((criteria.scaleMax - criteria.scaleMin) / 2) + criteria.scaleMin
          }
      }
      
      scores.push({
        criteriaId: criteria._id?.toString() || '',
        criteriaName: criteria.name,
        score,
        maxScore: criteria.type === 'scale' ? criteria.scaleMax : (criteria.type === 'boolean' ? 1 : 100),
        weight: criteria.weight
      })
    }
    
    return scores
  }

  /**
   * Calculate final total and weighted scores
   */
  private static calculateFinalScores(scores: any[]): { totalScore: number; weightedScore: number } {
    let totalScore = 0
    let weightedScore = 0
    let totalWeight = 0
    
    for (const score of scores) {
      const normalizedScore = this.normalizeScore(score.score, score.maxScore)
      totalScore += normalizedScore
      weightedScore += normalizedScore * (score.weight / 100)
      totalWeight += score.weight
    }
    
    return {
      totalScore: Math.round((totalScore / scores.length) * 100) / 100,
      weightedScore: Math.round(weightedScore * 100) / 100
    }
  }

  /**
   * Normalize score to 0-1 scale
   */
  private static normalizeScore(score: number | boolean | string, maxScore: number = 1): number {
    if (typeof score === 'boolean') {
      return score ? 1 : 0
    }
    if (typeof score === 'string') {
      return 0.5 // Default for text scores
    }
    return Math.min(score / maxScore, 1)
  }

  /**
   * Generate next steps based on outcome
   */
  private static generateNextSteps(outcome: string, callRecord: any): string[] {
    const nextSteps = []
    
    switch (outcome) {
      case 'closed_won':
        nextSteps.push('Send contract/proposal')
        nextSteps.push('Schedule implementation call')
        nextSteps.push('Introduce to customer success team')
        break
        
      case 'follow_up_required':
        nextSteps.push('Schedule follow-up meeting')
        nextSteps.push('Send recap email with discussed points')
        nextSteps.push('Prepare additional materials requested')
        break
        
      case 'closed_lost':
        nextSteps.push('Send thank you email')
        nextSteps.push('Add to nurture campaign')
        nextSteps.push('Schedule check-in for future opportunities')
        break
        
      case 'no_show':
        nextSteps.push('Send email to reschedule')
        nextSteps.push('Follow up with alternative meeting times')
        break
        
      default:
        nextSteps.push('Review call recording')
        nextSteps.push('Update CRM with call notes')
    }
    
    return nextSteps
  }

  /**
   * Calculate follow-up date based on outcome
   */
  private static calculateFollowUpDate(outcome: string): Date | undefined {
    const now = new Date()
    
    switch (outcome) {
      case 'closed_won':
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
        
      case 'follow_up_required':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week
        
      case 'closed_lost':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 3 months
        
      case 'no_show':
        return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days
        
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week
    }
  }

  /**
   * Map evaluation outcome to call record outcome
   */
  private static mapOutcomeToCallRecord(evaluationOutcome: string): string {
    const mapping: Record<string, string> = {
      'closed_won': 'success',
      'closed_lost': 'failure',
      'follow_up_required': 'follow_up',
      'no_show': 'no_show',
      'cancelled': 'failure'
    }
    
    return mapping[evaluationOutcome] || 'follow_up'
  }
}