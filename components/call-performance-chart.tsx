'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { TrendingUp, Award, Users } from 'lucide-react'

interface EvaluationCompetence {
  etapeProcessus: string
  evaluation: number
  temps_passe: number
  temps_passe_mm_ss: string
  timestamps: string
  commentaire: string
  validation: boolean
}

interface CallPerformanceChartProps {
  closeurPercentage: number
  clientPercentage: number
  evaluationCompetences: EvaluationCompetence[]
  callDuration: string
}

export function CallPerformanceChart({
  closeurPercentage,
  clientPercentage,
  evaluationCompetences
}: CallPerformanceChartProps) {
  // Calculate average score
  const averageScore = evaluationCompetences.length > 0
    ? evaluationCompetences.reduce((acc, c) => acc + c.evaluation, 0) / evaluationCompetences.length
    : 0

  // Generate unified data combining scores and talk time flow
  const generateUnifiedChartData = () => {
    if (evaluationCompetences.length === 0) {
      return []
    }

    return evaluationCompetences.map((comp, index) => {
      // Create a smooth wave pattern based on position in the call
      const progress = index / Math.max(evaluationCompetences.length - 1, 1)
      const wave = Math.sin(progress * Math.PI * 2) * 12

      return {
        name: comp.etapeProcessus.length > 20
          ? comp.etapeProcessus.substring(0, 20) + '...'
          : comp.etapeProcessus,
        fullName: comp.etapeProcessus,
        score: comp.evaluation,
        closeur: Math.max(20, Math.min(80, closeurPercentage + wave)),
        client: Math.max(20, Math.min(80, clientPercentage - wave)),
        scoreColor: comp.evaluation >= 7
          ? '#10b981'
          : comp.evaluation >= 5
          ? '#f59e0b'
          : '#ef4444'
      }
    })
  }

  const chartData = generateUnifiedChartData()

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0]; name: string; value: number; color: string; dataKey: string }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-gray-200">
          <p className="text-sm font-bold text-gray-950 mb-3 border-b pb-2">{data.fullName}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs font-medium text-gray-600">Score:</span>
              <span className="text-sm font-bold" style={{ color: data.scoreColor }}>
                {data.score}/10
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-gray-600">Closeur:</span>
              </div>
              <span className="text-sm font-semibold text-blue-600">{Math.round(data.closeur)}%</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-gray-600">Client:</span>
              </div>
              <span className="text-sm font-semibold text-green-600">{Math.round(data.client)}%</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      
      {/* Unified Chart */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-950">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Performance globale - Scores & Dynamique de conversation
          </CardTitle>
          <CardDescription className="text-gray-600">
            Scores d&apos;évaluation par critère et évolution du temps de parole
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <defs>
                  <linearGradient id="closeurGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="clientGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                {/* X-axis: Criterion names */}
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10, fill: '#374151' }}
                  interval={0}
                />

                {/* Left Y-axis: Scores (0-10) */}
                <YAxis
                  yAxisId="score"
                  orientation="left"
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  label={{
                    value: 'Score (/10)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#6b7280',
                    fontSize: 12
                  }}
                />

                {/* Right Y-axis: Talk time (0-100%) */}
                <YAxis
                  yAxisId="time"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  label={{
                    value: 'Temps de parole (%)',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#6b7280',
                    fontSize: 12
                  }}
                />

                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />

                {/* Talk time areas */}
                <Area
                  yAxisId="time"
                  type="monotone"
                  dataKey="closeur"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#closeurGradient)"
                  name="Closeur (%)"
                />
                <Area
                  yAxisId="time"
                  type="monotone"
                  dataKey="client"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#clientGradient)"
                  name="Client (%)"
                />

                {/* Score bars */}
                <Bar
                  yAxisId="score"
                  dataKey="score"
                  name="Score"
                  radius={[8, 8, 0, 0]}
                  barSize={40}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.scoreColor} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
