'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ListeningFrequency } from '@/types';
import { format } from 'date-fns';

interface ListeningFrequencyChartProps {
  data: ListeningFrequency[];
  groupBy?: 'day' | 'month' | 'year';
}

export function ListeningFrequencyChart({ data, groupBy = 'day' }: ListeningFrequencyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    date: format(item.date, getDateFormat(groupBy)),
    plays: item.playCount,
    duration: Math.round(item.totalDuration / 60000), // Convert to minutes
  }));

  return (
    <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
      <h3 className="mb-3 text-base font-bold text-white sm:mb-4 sm:text-lg">
        Listening Frequency
      </h3>
      <div className="w-full overflow-x-auto">
        <ResponsiveContainer width="100%" height={250} minHeight={250}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#B3B3B3', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: '#B3B3B3', fontSize: 10 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#181818',
                border: '1px solid #2A2A2A',
                borderRadius: '0.5rem',
                fontSize: '12px',
                color: '#FFFFFF',
              }}
              labelStyle={{ color: '#FFFFFF' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#B3B3B3' }} />
            <Line
              type="monotone"
              dataKey="plays"
              stroke="#1DB954"
              strokeWidth={2}
              name="Plays"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function getDateFormat(groupBy: 'day' | 'month' | 'year'): string {
  switch (groupBy) {
    case 'day':
      return 'MMM dd';
    case 'month':
      return 'MMM yyyy';
    case 'year':
      return 'yyyy';
    default:
      return 'MMM dd';
  }
}

