'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface TalkRatioChartProps {
  closerPercentage: number
  clientPercentage: number
}

export function TalkRatioChart({ closerPercentage, clientPercentage }: TalkRatioChartProps) {
  const data = [
    { name: 'Closer', value: closerPercentage },
    { name: 'Client', value: clientPercentage },
  ]

  const COLORS = ['#8b5cf6', '#06b6d4'] // Purple for closer, Cyan for client

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            {payload[0].name}: {payload[0].value}%
          </p>
        </div>
      )
    }
    return null
  }

  // Custom label to show percentage
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={50}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => {
              if (value === 'Closer') return 'Closer'
              if (value === 'Client') return 'Client'
              return value
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
