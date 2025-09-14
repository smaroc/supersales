import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IKeyMoment {
  time: string
  type: 'objection' | 'positive' | 'decision' | 'question' | 'negative' | 'concern' | 'end'
  text: string
}

export interface ICallAnalysis extends Document {
  organizationId: Types.ObjectId
  client: string
  representative: string
  duration: string
  date: Date
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  topics: string[]
  outcome: string
  keyMoments: IKeyMoment[]
  createdAt: Date
  updatedAt: Date
}

const keyMomentSchema = new Schema<IKeyMoment>({
  time: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['objection', 'positive', 'decision', 'question', 'negative', 'concern', 'end']
  },
  text: { type: String, required: true }
}, { _id: false })

const callAnalysisSchema = new Schema<ICallAnalysis>({
  organizationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true
  },
  client: { type: String, required: true },
  representative: { type: String, required: true },
  duration: { type: String, required: true },
  date: { type: Date, required: true },
  sentiment: { 
    type: String, 
    required: true,
    enum: ['positive', 'negative', 'neutral']
  },
  score: { type: Number, required: true, min: 0, max: 100 },
  topics: [{ type: String, required: true }],
  outcome: { type: String, required: true },
  keyMoments: [keyMomentSchema]
}, {
  timestamps: true
})

export default mongoose.models.CallAnalysis || mongoose.model<ICallAnalysis>('CallAnalysis', callAnalysisSchema)