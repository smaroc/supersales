'use client'

import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface SparklineChartProps {
  data: number[]
  color?: string
}

export function SparklineChart({ data, color = '#10b981' }: SparklineChartProps) {
  // Convert array of numbers to chart data format
  const chartData = data.map((value, index) => ({
    index,
    value,
  }))

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
