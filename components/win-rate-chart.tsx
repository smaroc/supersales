'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

interface WinRateChartProps {
  winRate: number
}

export function WinRateChart({ winRate }: WinRateChartProps) {
  const data = [
    {
      name: 'Win Rate',
      value: winRate,
      fill: '#f59e0b',
    },
  ]

  return (
    <div className="h-[100px] w-full flex items-center justify-center relative">
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
        <div className="text-2xl font-bold text-gray-900">{winRate}</div>
        <div className="text-xs text-gray-600">%</div>
      </div>
    </div>
  )
}
