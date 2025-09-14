import mongoose, { Schema, Document } from 'mongoose'

export interface IIntegration extends Document {
  userId: string
  organizationId: string
  platform: 'zoom' | 'fathom' | 'firefiles'
  isActive: boolean
  configuration: {
    clientId?: string
    clientSecret?: string
    apiKey?: string
    webhookSecret?: string
    workspaceId?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: Date
  }
  webhookUrl: string
  lastSync: Date
  syncStatus: 'idle' | 'syncing' | 'error'
  syncError?: string
  createdAt: Date
  updatedAt: Date
}

const IntegrationSchema = new Schema<IIntegration>({
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
  platform: {
    type: String,
    required: true,
    enum: ['zoom', 'fathom', 'firefiles']
  },
  isActive: {
    type: Boolean,
    default: false
  },
  configuration: {
    clientId: { type: String, select: false }, // Hidden by default for security
    clientSecret: { type: String, select: false },
    apiKey: { type: String, select: false },
    webhookSecret: { type: String, select: false },
    workspaceId: String,
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    expiresAt: Date
  },
  webhookUrl: {
    type: String,
    required: true
  },
  lastSync: {
    type: Date,
    default: Date.now
  },
  syncStatus: {
    type: String,
    enum: ['idle', 'syncing', 'error'],
    default: 'idle'
  },
  syncError: String
}, {
  timestamps: true
})

// Compound index for user-platform uniqueness
IntegrationSchema.index({ userId: 1, platform: 1 }, { unique: true })

export const Integration = mongoose.models.Integration || mongoose.model<IIntegration>('Integration', IntegrationSchema)