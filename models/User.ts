import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IUser extends Document {
  organizationId: Types.ObjectId
  email: string
  firstName: string
  lastName: string
  role: 'owner' | 'admin' | 'manager' | 'head_of_sales' | 'sales_rep' | 'viewer'
  avatar?: string
  isActive: boolean
  lastLoginAt?: Date
  permissions: {
    canViewAllData: boolean
    canManageUsers: boolean
    canManageSettings: boolean
    canExportData: boolean
    canDeleteData: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: {
      email: boolean
      inApp: boolean
      callSummaries: boolean
      weeklyReports: boolean
    }
    dashboard: {
      defaultView: 'overview' | 'calls' | 'ranking' | 'analytics'
      refreshInterval: number // in seconds
    }
  }
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>({
  organizationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  role: {
    type: String,
    required: true,
    enum: ['owner', 'admin', 'manager', 'head_of_sales', 'sales_rep', 'viewer'],
    default: 'sales_rep'
  },
  avatar: { type: String },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
  permissions: {
    canViewAllData: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false },
    canExportData: { type: Boolean, default: false },
    canDeleteData: { type: Boolean, default: false }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      callSummaries: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true }
    },
    dashboard: {
      defaultView: {
        type: String,
        enum: ['overview', 'calls', 'ranking', 'analytics'],
        default: 'overview'
      },
      refreshInterval: { type: Number, default: 300 } // 5 minutes
    }
  }
}, {
  timestamps: true
})

// Create compound indexes for better performance
userSchema.index({ organizationId: 1, email: 1 })
userSchema.index({ organizationId: 1, role: 1 })
userSchema.index({ organizationId: 1, isActive: 1 })

// Set permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'owner':
      case 'admin':
        this.permissions = {
          canViewAllData: true,
          canManageUsers: true,
          canManageSettings: true,
          canExportData: true,
          canDeleteData: true
        }
        break
      case 'manager':
        this.permissions = {
          canViewAllData: true,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: true,
          canDeleteData: false
        }
        break
      case 'head_of_sales':
        this.permissions = {
          canViewAllData: true,
          canManageUsers: true,
          canManageSettings: true,
          canExportData: true,
          canDeleteData: false
        }
        break
      case 'sales_rep':
        this.permissions = {
          canViewAllData: false,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: false,
          canDeleteData: false
        }
        break
      case 'viewer':
        this.permissions = {
          canViewAllData: true,
          canManageUsers: false,
          canManageSettings: false,
          canExportData: false,
          canDeleteData: false
        }
        break
    }
  }
  next()
})

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`
})

// Virtual for initials
userSchema.virtual('initials').get(function() {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase()
})

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema)