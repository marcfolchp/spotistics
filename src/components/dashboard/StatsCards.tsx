'use client';

import { formatDurationMinutes } from '@/lib/utils/date';
import type { ListeningStats } from '@/types';

interface StatsCardsProps {
  stats: ListeningStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const totalMinutes = Math.round(stats.totalListeningTime / 60000); // Convert to minutes
  const totalDays = Math.round(stats.totalListeningTime / 86400000); // Convert to days

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Tracks"
        value={stats.totalTracks.toLocaleString()}
        description="Songs played"
      />
      <StatCard
        title="Unique Artists"
        value={stats.totalArtists.toLocaleString()}
        description="Different artists"
      />
      <StatCard
        title="Total Listening Time"
        value={formatDurationMinutes(stats.totalListeningTime)}
        description={`${totalDays} days of music`}
      />
      <StatCard
        title="Date Range"
        value={`${new Date(stats.dateRange.start).getFullYear()} - ${new Date(stats.dateRange.end).getFullYear()}`}
        description="Years of data"
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg bg-[#181818] p-3 transition-colors hover:bg-[#282828] sm:p-4 lg:p-6">
      <p className="text-xs font-medium text-[#B3B3B3] sm:text-sm">{title}</p>
      <p className="mt-1 text-xl font-bold text-white sm:mt-2 sm:text-2xl lg:text-3xl">{value}</p>
      <p className="mt-0.5 text-[10px] text-[#6A6A6A] sm:mt-1 sm:text-xs">{description}</p>
    </div>
  );
}

