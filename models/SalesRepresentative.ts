import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IGoals {
  revenue: { target: number; current: number }
  deals: { target: number; current: number }
  calls: { target: number; current: number }
}

export interface ISalesRepresentative extends Document {
  organizationId: Types.ObjectId
  name: string
  role: string
  avatar: string
  totalRevenue: number
  dealsClosedQTD: number
  conversionRate: number
  avgDealSize: number
  callsThisMonth: number
  trend: 'up' | 'down'
  trendValue: number
  goals: IGoals
  createdAt: Date
  updatedAt: Date
}

const goalsSchema = new Schema<IGoals>({
  revenue: {
    target: { type: Number, required: true },
    current: { type: Number, required: true, default: 0 }
  },
  deals: {
    target: { type: Number, required: true },
    current: { type: Number, required: true, default: 0 }
  },
  calls: {
    target: { type: Number, required: true },
    current: { type: Number, required: true, default: 0 }
  }
}, { _id: false })

const salesRepresentativeSchema = new Schema<ISalesRepresentative>({
  organizationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true
  },
  name: { type: String, required: true },
  role: { type: String, required: true },
  avatar: { type: String, required: true },
  totalRevenue: { type: Number, required: true, default: 0 },
  dealsClosedQTD: { type: Number, required: true, default: 0 },
  conversionRate: { type: Number, required: true, default: 0 },
  avgDealSize: { type: Number, required: true, default: 0 },
  callsThisMonth: { type: Number, required: true, default: 0 },
  trend: { 
    type: String, 
    required: true,
    enum: ['up', 'down'],
    default: 'up'
  },
  trendValue: { type: Number, required: true, default: 0 },
  goals: { type: goalsSchema, required: true }
}, {
  timestamps: true
})

export default mongoose.models.SalesRepresentative || mongoose.model<ISalesRepresentative>('SalesRepresentative', salesRepresentativeSchema)