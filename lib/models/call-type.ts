import mongoose, { Schema, Document } from 'mongoose'

export interface ICallType extends Document {
  organizationId: string
  name: string
  code: string // R1, R2, R3, etc.
  description: string
  order: number
  isActive: boolean
  color: string // For UI display
  metrics: {
    targetClosingRate: number // Expected closing rate %
    avgDuration: number // Average duration in minutes
    followUpRequired: boolean
  }
  evaluationCriteria: {
    name: string
    description: string
    weight: number // 1-10
    type: 'boolean' | 'scale' | 'text'
    scaleMax?: number
  }[]
  createdAt: Date
  updatedAt: Date
}

const CallTypeSchema = new Schema<ICallType>({
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  metrics: {
    targetClosingRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    avgDuration: {
      type: Number,
      min: 0,
      default: 30
    },
    followUpRequired: {
      type: Boolean,
      default: false
    }
  },
  evaluationCriteria: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },
    type: {
      type: String,
      enum: ['boolean', 'scale', 'text'],
      required: true
    },
    scaleMax: {
      type: Number,
      min: 1,
      max: 10
    }
  }]
}, {
  timestamps: true
})

// Compound index for organization and code uniqueness
CallTypeSchema.index({ organizationId: 1, code: 1 }, { unique: true })

export const CallType = mongoose.models.CallType || mongoose.model<ICallType>('CallType', CallTypeSchema)