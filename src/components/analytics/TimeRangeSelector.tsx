'use client';

import { getTimeRangeLabel, type TimeRange } from '@/lib/utils/date-ranges';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const timeRanges: TimeRange[] = ['today', 'week', 'month', 'year', 'all'];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 md:max-w-full">
      <div className="flex w-fit flex-nowrap gap-0.5 rounded-full bg-[#2A2A2A] p-0.5 sm:gap-1 sm:p-1 md:gap-1 md:p-1 lg:gap-1.5 lg:p-1.5">
        {timeRanges.map((range) => (
          <button
            key={range}
            onClick={() => onChange(range)}
            className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold leading-tight transition-all active:scale-95 sm:px-2 sm:py-1 sm:text-[10px] md:px-2.5 md:py-1 md:text-[11px] lg:px-3 lg:py-1.5 lg:text-xs ${
              value === range
                ? 'bg-white text-black'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            {getTimeRangeLabel(range)}
          </button>
        ))}
      </div>
    </div>
  );
}

