'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface CompletionChartProps {
  completed: number
  total: number
}

export function CompletionChart({ completed, total }: CompletionChartProps) {
  const pending = total - completed
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const data = [
    { name: 'Complétées', value: completed },
    { name: 'En attente', value: pending },
  ]

  const COLORS = ['#3b82f6', '#e5e7eb']

  return (
    <div className="h-[100px] w-full flex items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={50}
            fill="#8884d8"
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute text-center">
        <div className="text-xl font-bold text-gray-900">{completed}</div>
        <div className="text-xs text-gray-600">/{total}</div>
      </div>
    </div>
  )
}
