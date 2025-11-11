# Supabase Setup Guide

This guide will help you set up Supabase for storing user Spotify data.

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the project details:
   - **Name**: Wrappedify (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find:
   - **Project URL**: Copy this (e.g., `https://xxxxx.supabase.co`)
   - **anon public key**: Copy this (starts with `eyJ...`)
   - **service_role key**: Copy this (starts with `eyJ...`) - **Keep this secret!**

## Step 3: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the following SQL:

```sql
-- Create listening_data table
CREATE TABLE IF NOT EXISTS listening_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  played_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('api', 'export')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_data_summary table
CREATE TABLE IF NOT EXISTS user_data_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  total_tracks INTEGER NOT NULL DEFAULT 0,
  total_artists INTEGER NOT NULL DEFAULT 0,
  total_listening_time_ms BIGINT NOT NULL DEFAULT 0,
  date_range_start TIMESTAMPTZ NOT NULL,
  date_range_end TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create listening_aggregations table for pre-computed analytics
CREATE TABLE IF NOT EXISTS listening_aggregations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  aggregation_type TEXT NOT NULL,
  group_by TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, aggregation_type, group_by)
);

-- Create user_tokens table for storing refresh tokens (for background sync)
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_listening_data_user_id ON listening_data(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_data_played_at ON listening_data(played_at);
CREATE INDEX IF NOT EXISTS idx_user_data_summary_user_id ON user_data_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_aggregations_user_type ON listening_aggregations(user_id, aggregation_type, group_by);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_listening_data_updated_at
  BEFORE UPDATE ON listening_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_data_summary_updated_at
  BEFORE UPDATE ON user_data_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listening_aggregations_updated_at
  BEFORE UPDATE ON listening_aggregations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tokens_updated_at
  BEFORE UPDATE ON user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run" to execute the SQL
5. You should see "Success. No rows returned"

## Step 4: Set Up Row Level Security (RLS)

1. Go to **Authentication** → **Policies**
2. For the `listening_data` table:
   - Click "New Policy"
   - Policy name: "Users can only access their own data"
   - Allowed operation: SELECT, INSERT, UPDATE, DELETE
   - Policy definition:
     ```sql
     (auth.uid()::text = user_id)
     ```
   - Click "Save"

3. For the `user_data_summary` table:
   - Click "New Policy"
   - Policy name: "Users can only access their own summary"
   - Allowed operation: SELECT, INSERT, UPDATE, DELETE
   - Policy definition:
     ```sql
     (auth.uid()::text = user_id)
     ```
   - Click "Save"

**Note**: Since we're using service role key for server-side operations, RLS is bypassed. For client-side operations, you'll need to set up proper authentication.

## Step 5: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important**: 
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose (they're used client-side)
- `SUPABASE_SERVICE_ROLE_KEY` is **SECRET** - never commit it to git or expose it client-side!

## Step 6: Test the Setup

1. Restart your dev server
2. Try uploading a Spotify data export
3. Check your Supabase dashboard → **Table Editor** → `listening_data`
4. You should see your data there!

## Troubleshooting

### Error: "Failed to store data"
- Check that your Supabase credentials are correct
- Verify the tables were created successfully
- Check the Supabase logs in the dashboard

### Error: "SUPABASE_SERVICE_ROLE_KEY not configured"
- Make sure you've added the service role key to `.env.local`
- Restart your dev server after adding it

### Data not appearing
- Check the Supabase dashboard → **Table Editor**
- Verify the data was inserted correctly
- Check the browser console for errors

## Security Notes

- The service role key bypasses RLS - only use it server-side
- For production, consider implementing proper user authentication
- Regularly rotate your service role key
- Monitor your Supabase usage and costs

## Next Steps

- Set up database backups
- Configure monitoring and alerts
- Consider adding indexes for better performance
- Set up database migrations for version control

