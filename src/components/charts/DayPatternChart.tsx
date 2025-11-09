'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DayPattern } from '@/types';

interface DayPatternChartProps {
  data: DayPattern[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DayPatternChart({ data }: DayPatternChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    day: DAY_NAMES[item.day],
    plays: item.playCount,
  }));

  return (
    <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
      <h3 className="mb-3 text-base font-bold text-white sm:mb-4 sm:text-lg">
        Listening by Day of Week
      </h3>
      <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <ResponsiveContainer width="100%" height={250} minHeight={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis
              dataKey="day"
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
            <Bar dataKey="plays" fill="#1DB954" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

