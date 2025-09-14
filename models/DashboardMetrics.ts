import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IDashboardMetrics extends Document {
  organizationId: Types.ObjectId
  totalCalls: number
  conversionRate: number
  totalRevenue: number
  teamPerformance: number
  period: string // 'daily', 'weekly', 'monthly', 'quarterly'
  date: Date
  createdAt: Date
  updatedAt: Date
}

const dashboardMetricsSchema = new Schema<IDashboardMetrics>({
  organizationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true
  },
  totalCalls: { type: Number, required: true, default: 0 },
  conversionRate: { type: Number, required: true, default: 0 },
  totalRevenue: { type: Number, required: true, default: 0 },
  teamPerformance: { type: Number, required: true, default: 0 },
  period: { 
    type: String, 
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    default: 'monthly'
  },
  date: { type: Date, required: true }
}, {
  timestamps: true
})

export default mongoose.models.DashboardMetrics || mongoose.model<IDashboardMetrics>('DashboardMetrics', dashboardMetricsSchema)