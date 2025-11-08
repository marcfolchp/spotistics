# Supabase Aggregations Table Setup

## Overview
This document describes the `listening_aggregations` table that stores pre-computed analytics data for fast chart rendering.

## Table Schema

### `listening_aggregations` Table

```sql
CREATE TABLE listening_aggregations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  aggregation_type TEXT NOT NULL, -- 'date_frequency', 'time_pattern', 'day_pattern', 'top_tracks', 'top_artists'
  group_by TEXT, -- 'day', 'month', 'year' (for date_frequency)
  data JSONB NOT NULL, -- The aggregated data points
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, aggregation_type, group_by)
);

-- Index for fast lookups
CREATE INDEX idx_listening_aggregations_user_type ON listening_aggregations(user_id, aggregation_type, group_by);

-- Enable RLS (Row Level Security)
ALTER TABLE listening_aggregations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own aggregations
CREATE POLICY "Users can view own aggregations"
  ON listening_aggregations FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own aggregations"
  ON listening_aggregations FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own aggregations"
  ON listening_aggregations FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own aggregations"
  ON listening_aggregations FOR DELETE
  USING (auth.uid()::text = user_id);
```

## Aggregation Types

### 1. `date_frequency`
Stores listening frequency grouped by day/month/year.

**Data structure:**
```json
[
  { "date": "2017-01-01", "playCount": 45, "totalDuration": 1800000 },
  { "date": "2017-01-02", "playCount": 52, "totalDuration": 2100000 },
  ...
]
```

### 2. `time_pattern`
Stores listening patterns by hour of day (24 data points).

**Data structure:**
```json
[
  { "hour": 0, "playCount": 120 },
  { "hour": 1, "playCount": 85 },
  ...
]
```

### 3. `day_pattern`
Stores listening patterns by day of week (7 data points).

**Data structure:**
```json
[
  { "day": 0, "dayName": "Sunday", "playCount": 1500 },
  { "day": 1, "dayName": "Monday", "playCount": 1800 },
  ...
]
```

### 4. `top_tracks`
Stores top N tracks.

**Data structure:**
```json
[
  { "trackName": "Song Name", "artistName": "Artist", "playCount": 150, "totalDuration": 6000000 },
  ...
]
```

### 5. `top_artists`
Stores top N artists.

**Data structure:**
```json
[
  { "artistName": "Artist Name", "playCount": 500, "totalDuration": 20000000 },
  ...
]
```

## Usage

1. **On Upload**: Compute and store all aggregations
2. **On Analytics Load**: Fetch pre-computed aggregations (fast!)
3. **On Data Update**: Recompute and update aggregations

