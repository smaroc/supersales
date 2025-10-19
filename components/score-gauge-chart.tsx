'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

interface ScoreGaugeChartProps {
  score: number
}

export function ScoreGaugeChart({ score }: ScoreGaugeChartProps) {
  const data = [
    {
      name: 'Score',
      value: score,
      fill: score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444',
    },
  ]

  return (
    <div className="h-[100px] w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          barSize={12}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-gray-900">{score}</div>
        <div className="text-xs text-gray-600">/100</div>
      </div>
    </div>
  )
}
