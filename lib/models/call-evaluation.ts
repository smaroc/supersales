import mongoose, { Schema, Document } from 'mongoose'

export interface ICallEvaluation extends Document {
  organizationId: string
  callId: string
  salesRepId: string
  evaluatorId: string
  callTypeId: string
  callType: string // R1, R2, R3
  evaluationDate: Date
  
  // Call Details
  duration: number
  outcome: 'closed_won' | 'closed_lost' | 'follow_up_required' | 'no_show' | 'cancelled'
  
  // Metrics
  scores: {
    criteriaId: string
    criteriaName: string
    score: number | boolean | string
    maxScore?: number
    weight: number
  }[]
  
  totalScore: number
  weightedScore: number
  
  // Additional Data
  notes: string
  recording: {
    url?: string
    transcription?: string
    duration: number
  }
  
  nextSteps: string[]
  followUpDate?: Date
  
  createdAt: Date
  updatedAt: Date
}

const CallEvaluationSchema = new Schema<ICallEvaluation>({
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  callId: {
    type: String,
    required: true,
    index: true
  },
  salesRepId: {
    type: String,
    required: true,
    index: true
  },
  evaluatorId: {
    type: String,
    required: true
  },
  callTypeId: {
    type: String,
    required: true,
    ref: 'CallType'
  },
  callType: {
    type: String,
    required: true,
    uppercase: true
  },
  evaluationDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  outcome: {
    type: String,
    required: true,
    enum: ['closed_won', 'closed_lost', 'follow_up_required', 'no_show', 'cancelled']
  },
  scores: [{
    criteriaId: String,
    criteriaName: String,
    score: Schema.Types.Mixed,
    maxScore: Number,
    weight: Number
  }],
  totalScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  weightedScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  recording: {
    url: String,
    transcription: String,
    duration: {
      type: Number,
      default: 0
    }
  },
  nextSteps: [String],
  followUpDate: Date
}, {
  timestamps: true
})

// Indexes for efficient querying
CallEvaluationSchema.index({ organizationId: 1, salesRepId: 1, evaluationDate: -1 })
CallEvaluationSchema.index({ organizationId: 1, callType: 1, evaluationDate: -1 })
CallEvaluationSchema.index({ organizationId: 1, outcome: 1, evaluationDate: -1 })

export const CallEvaluation = mongoose.models.CallEvaluation || mongoose.model<ICallEvaluation>('CallEvaluation', CallEvaluationSchema)