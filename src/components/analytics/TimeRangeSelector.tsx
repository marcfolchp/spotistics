'use client';

import { getTimeRangeLabel, type TimeRange } from '@/lib/utils/date-ranges';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const timeRanges: TimeRange[] = ['today', 'week', 'month', 'year', 'all'];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex w-fit flex-wrap gap-1 rounded-full bg-[#2A2A2A] p-1 sm:gap-1.5 sm:p-1.5">
      {timeRanges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold leading-tight transition-all active:scale-95 sm:px-4 sm:py-2 sm:text-sm ${
            value === range
              ? 'bg-white text-black'
              : 'text-[#B3B3B3] hover:text-white'
          }`}
        >
          {getTimeRangeLabel(range)}
        </button>
      ))}
    </div>
  );
}

