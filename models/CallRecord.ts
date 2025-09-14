import mongoose, { Document, Schema, Model } from 'mongoose'

export interface ICallRecord extends Document {
  organizationId: mongoose.Types.ObjectId
  salesRepId: mongoose.Types.ObjectId
  salesRepName: string
  
  // External integration IDs
  fathomCallId?: string
  zoomCallId?: string
  firefilesCallId?: string
  
  // Call details
  title: string
  scheduledStartTime: Date
  scheduledEndTime: Date
  actualDuration: number // in minutes
  scheduledDuration: number // in minutes
  
  // Content
  transcript?: string
  recordingUrl?: string
  shareUrl?: string
  
  // Participants
  invitees: Array<{
    email: string
    name: string
    isExternal: boolean
  }>
  hasExternalInvitees: boolean
  
  // Integration source
  source: 'fathom' | 'zoom' | 'firefiles' | 'manual'
  
  // Processing status
  status: 'pending_evaluation' | 'evaluated' | 'archived'
  
  // Metadata
  metadata?: {
    fathomUserName?: string
    fathomUserTeam?: string
    meetingJoinUrl?: string
    externalDomains?: string
    [key: string]: any
  }
  
  // Evaluation results (populated after processing)
  evaluationId?: mongoose.Types.ObjectId
  callTypeId?: mongoose.Types.ObjectId
  overallScore?: number
  outcome?: 'success' | 'failure' | 'follow_up' | 'no_show'
  
  createdAt: Date
  updatedAt: Date
}

const CallRecordSchema = new Schema<ICallRecord>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  salesRepId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  salesRepName: {
    type: String,
    required: true
  },
  
  // External integration IDs
  fathomCallId: {
    type: String,
    sparse: true,
    index: true
  },
  zoomCallId: {
    type: String,
    sparse: true,
    index: true
  },
  firefilesCallId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Call details
  title: {
    type: String,
    required: true
  },
  scheduledStartTime: {
    type: Date,
    required: true,
    index: true
  },
  scheduledEndTime: {
    type: Date,
    required: true
  },
  actualDuration: {
    type: Number,
    default: 0
  },
  scheduledDuration: {
    type: Number,
    default: 0
  },
  
  // Content
  transcript: {
    type: String,
    default: ''
  },
  recordingUrl: {
    type: String
  },
  shareUrl: {
    type: String
  },
  
  // Participants
  invitees: [{
    email: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    isExternal: {
      type: Boolean,
      default: false
    }
  }],
  hasExternalInvitees: {
    type: Boolean,
    default: false
  },
  
  // Integration source
  source: {
    type: String,
    enum: ['fathom', 'zoom', 'firefiles', 'manual'],
    required: true,
    index: true
  },
  
  // Processing status
  status: {
    type: String,
    enum: ['pending_evaluation', 'evaluated', 'archived'],
    default: 'pending_evaluation',
    index: true
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Evaluation results
  evaluationId: {
    type: Schema.Types.ObjectId,
    ref: 'CallEvaluation'
  },
  callTypeId: {
    type: Schema.Types.ObjectId,
    ref: 'CallType'
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  outcome: {
    type: String,
    enum: ['success', 'failure', 'follow_up', 'no_show']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Compound indexes
CallRecordSchema.index({ organizationId: 1, scheduledStartTime: -1 })
CallRecordSchema.index({ organizationId: 1, salesRepId: 1, scheduledStartTime: -1 })
CallRecordSchema.index({ organizationId: 1, source: 1, status: 1 })

// Ensure uniqueness for external call IDs within organization
CallRecordSchema.index(
  { organizationId: 1, fathomCallId: 1 },
  { unique: true, sparse: true }
)
CallRecordSchema.index(
  { organizationId: 1, zoomCallId: 1 },
  { unique: true, sparse: true }
)
CallRecordSchema.index(
  { organizationId: 1, firefilesCallId: 1 },
  { unique: true, sparse: true }
)

// Virtual for calculating call efficiency
CallRecordSchema.virtual('callEfficiency').get(function() {
  if (!this.scheduledDuration || this.scheduledDuration === 0) return null
  return (this.actualDuration / this.scheduledDuration) * 100
})

// Virtual for duration difference
CallRecordSchema.virtual('durationDifference').get(function() {
  return this.actualDuration - this.scheduledDuration
})

// Static methods
CallRecordSchema.statics.findByOrganization = function(organizationId: mongoose.Types.ObjectId, filters: any = {}) {
  return this.find({ organizationId, ...filters }).sort({ scheduledStartTime: -1 })
}

CallRecordSchema.statics.findBySalesRep = function(
  organizationId: mongoose.Types.ObjectId, 
  salesRepId: mongoose.Types.ObjectId, 
  filters: any = {}
) {
  return this.find({ organizationId, salesRepId, ...filters }).sort({ scheduledStartTime: -1 })
}

// Instance methods
CallRecordSchema.methods.markAsEvaluated = function(evaluationId: mongoose.Types.ObjectId, score: number, outcome: string) {
  this.status = 'evaluated'
  this.evaluationId = evaluationId
  this.overallScore = score
  this.outcome = outcome
  return this.save()
}

const CallRecord: Model<ICallRecord> = mongoose.models.CallRecord || mongoose.model<ICallRecord>('CallRecord', CallRecordSchema)

export default CallRecord