import mongoose, { Document, Schema } from 'mongoose'

export interface ICallInsight {
  name: string
  description: string
  keywords: string[]
  weightage: number // 1-10 scale for importance
  category: 'positive' | 'negative' | 'neutral' | 'objection' | 'opportunity'
}

export interface IOrganization extends Document {
  name: string
  domain: string // e.g., "company.com"
  industry: string
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  subscription: {
    plan: 'free' | 'basic' | 'professional' | 'enterprise'
    status: 'active' | 'inactive' | 'trial' | 'expired'
    expiresAt?: Date
  }
  settings: {
    timezone: string
    currency: string
    dateFormat: string
    callRecording: boolean
    autoAnalysis: boolean
  }
  callInsights: ICallInsight[]
  createdAt: Date
  updatedAt: Date
}

const callInsightSchema = new Schema<ICallInsight>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  keywords: [{ type: String, required: true }],
  weightage: { type: Number, required: true, min: 1, max: 10 },
  category: {
    type: String,
    required: true,
    enum: ['positive', 'negative', 'neutral', 'objection', 'opportunity']
  }
}, { _id: true })

const organizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true, trim: true },
  domain: { type: String, required: true, lowercase: true },
  industry: { type: String, required: true },
  size: {
    type: String,
    required: true,
    enum: ['startup', 'small', 'medium', 'large', 'enterprise']
  },
  subscription: {
    plan: {
      type: String,
      required: true,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive', 'trial', 'expired'],
      default: 'trial'
    },
    expiresAt: { type: Date }
  },
  settings: {
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    callRecording: { type: Boolean, default: true },
    autoAnalysis: { type: Boolean, default: true }
  },
  callInsights: [callInsightSchema]
}, {
  timestamps: true
})

// Create indexes for better performance
organizationSchema.index({ domain: 1 }, { unique: true })
organizationSchema.index({ 'subscription.status': 1 })

export default mongoose.models.Organization || mongoose.model<IOrganization>('Organization', organizationSchema)