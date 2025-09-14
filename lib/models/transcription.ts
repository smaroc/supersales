import mongoose, { Schema, Document } from 'mongoose'

export interface ITranscription extends Document {
  userId: string
  organizationId: string
  integrationId: string
  platform: 'zoom' | 'fathom' | 'firefiles'
  externalId: string // The ID from the source platform
  title: string
  description?: string
  duration: number // in seconds
  recordingUrl?: string
  transcriptText: string
  participants: {
    name?: string
    email?: string
    role?: string
    duration?: number // time they were in the call
  }[]
  insights: {
    sentiment: 'positive' | 'negative' | 'neutral'
    confidence: number
    keyTopics: string[]
    actionItems: string[]
    questions: string[]
    followUps: string[]
  }
  metadata: {
    recordedAt: Date
    processedAt: Date
    language: string
    platform: string
    meetingType?: string
    externalMeetingId?: string
    webhookData?: any
  }
  processingStatus: 'pending' | 'processing' | 'completed' | 'error'
  processingError?: string
  tags: string[]
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

const TranscriptionSchema = new Schema<ITranscription>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  integrationId: {
    type: String,
    required: true,
    ref: 'Integration'
  },
  platform: {
    type: String,
    required: true,
    enum: ['zoom', 'fathom', 'firefiles']
  },
  externalId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  duration: {
    type: Number,
    required: true
  },
  recordingUrl: String,
  transcriptText: {
    type: String,
    required: true
  },
  participants: [{
    name: String,
    email: String,
    role: String,
    duration: Number
  }],
  insights: {
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    keyTopics: [String],
    actionItems: [String],
    questions: [String],
    followUps: [String]
  },
  metadata: {
    recordedAt: {
      type: Date,
      required: true
    },
    processedAt: Date,
    language: {
      type: String,
      default: 'en'
    },
    platform: {
      type: String,
      required: true
    },
    meetingType: String,
    externalMeetingId: String,
    webhookData: Schema.Types.Mixed
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'error'],
    default: 'pending'
  },
  processingError: String,
  tags: [String],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Indexes for efficient querying
TranscriptionSchema.index({ userId: 1, createdAt: -1 })
TranscriptionSchema.index({ organizationId: 1, createdAt: -1 })
TranscriptionSchema.index({ platform: 1, externalId: 1 }, { unique: true })
TranscriptionSchema.index({ 'metadata.recordedAt': -1 })
TranscriptionSchema.index({ processingStatus: 1 })
TranscriptionSchema.index({ tags: 1 })

export const Transcription = mongoose.models.Transcription || mongoose.model<ITranscription>('Transcription', TranscriptionSchema)