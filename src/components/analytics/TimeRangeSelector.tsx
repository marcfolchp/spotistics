'use client';

import { getTimeRangeLabel, type TimeRange } from '@/lib/utils/date-ranges';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const timeRanges: TimeRange[] = ['today', 'week', 'month', 'year', 'all'];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex w-fit flex-nowrap gap-1.5 rounded-full bg-[#2A2A2A] p-1.5 sm:gap-2 sm:p-2 md:gap-2 md:p-2 lg:gap-2.5 lg:p-2.5">
        {timeRanges.map((range) => (
          <button
            key={range}
            onClick={() => onChange(range)}
            className={`flex-shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-semibold leading-tight transition-all active:scale-95 sm:px-3.5 sm:py-2 sm:text-xs md:px-4 md:py-2 md:text-sm lg:px-5 lg:py-3 lg:text-base ${
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

