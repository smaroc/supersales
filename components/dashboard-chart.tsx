'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, Phone } from 'lucide-react'
import { ChartDataPoint } from '@/app/actions/dashboard-charts'

interface DashboardChartProps {
  data: ChartDataPoint[]
  summary?: {
    totalCalls: number
    totalSales: number
    conversionRate: number
  }
  periodDays?: number
}

export function DashboardChart({ data, summary, periodDays = 30 }: DashboardChartProps) {
  // Get the period label based on days
  const getPeriodLabel = (days: number) => {
    if (days === 7) return '7 derniers jours'
    if (days === 30) return '30 derniers jours'
    if (days === 90) return '90 derniers jours'
    if (days === 365) return 'Cette année'
    return `${days} derniers jours`
  }

  const periodLabel = getPeriodLabel(periodDays)

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-2 text-sm font-medium text-gray-900">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-700">Appels: {payload[0]?.value || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-700">Ventes: {payload[1]?.value || 0}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-gray-950">Activité des {periodLabel}</CardTitle>
            <CardDescription className="text-gray-800">
              Suivi quotidien des appels et des ventes
            </CardDescription>
          </div>
          {summary && (
            <div className="flex gap-6">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">Appels</p>
                </div>
                <p className="text-2xl font-bold text-gray-950">{summary.totalCalls}</p>
                <p className="text-xs text-gray-600">{periodLabel}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-gray-700">Ventes</p>
                </div>
                <p className="text-2xl font-bold text-gray-950">{summary.totalSales}</p>
                <p className="text-xs text-gray-600">{periodLabel}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-medium text-gray-700">Conversion</p>
                </div>
                <p className="text-2xl font-bold text-gray-950">{summary.conversionRate}%</p>
                <p className="text-xs text-gray-600">Taux de réussite</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{
                top: 20,
                right: 20,
                bottom: 20,
                left: 20,
              }}
            >
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                formatter={(value) => {
                  if (value === 'calls') return 'Appels'
                  if (value === 'sales') return 'Ventes'
                  return value
                }}
              />
              {/* Line chart for calls */}
              <Line
                type="monotone"
                dataKey="calls"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                fill="url(#colorCalls)"
              />
              {/* Bar chart for sales/payments */}
              <Bar
                dataKey="sales"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
                opacity={0.8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        
      </CardContent>
    </Card>
  )
}
