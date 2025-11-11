# Supabase Quick Start Guide

## Quick Setup (5 minutes)

### 1. Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in:
   - Name: `wrappedify`
   - Database Password: (create a strong password - save it!)
   - Region: (choose closest to you)
4. Click "Create new project"
5. Wait 1-2 minutes for setup

### 2. Get Your Credentials

1. In Supabase dashboard → **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **KEEP SECRET!**

### 3. Create Database Tables

1. Go to **SQL Editor** in Supabase dashboard
2. Click "New query"
3. Copy and paste this SQL:

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_listening_data_user_id ON listening_data(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_data_played_at ON listening_data(played_at);
CREATE INDEX IF NOT EXISTS idx_user_data_summary_user_id ON user_data_summary(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listening_data_updated_at
  BEFORE UPDATE ON listening_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_data_summary_updated_at
  BEFORE UPDATE ON user_data_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run"
5. You should see "Success. No rows returned"

### 4. Add Environment Variables

Add to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: 
- Replace `your-project-id`, `your_anon_public_key_here`, and `your_service_role_key_here` with your actual values
- Never commit `.env.local` to git
- The service role key is SECRET - never expose it client-side

### 5. Restart Your Dev Server

```bash
npm run dev:8080
```

### 6. Test It

1. Go to your app
2. Log in with Spotify
3. Upload a Spotify data export (JSON or ZIP)
4. Check Supabase dashboard → **Table Editor** → `listening_data`
5. You should see your data!

## What Happens Now?

- ✅ ZIP files are automatically extracted
- ✅ JSON files are parsed and cleaned
- ✅ Data is stored in Supabase
- ✅ Analytics fetch from Supabase
- ✅ Data persists across sessions

## Troubleshooting

**Error: "SUPABASE_SERVICE_ROLE_KEY not configured"**
- Make sure you added all 3 environment variables
- Restart your dev server after adding them

**Error: "Failed to store data"**
- Check your Supabase credentials are correct
- Verify tables were created (check SQL Editor)
- Check Supabase logs in dashboard

**Data not appearing**
- Check Supabase dashboard → Table Editor
- Verify data was inserted
- Check browser console for errors

## Next Steps

- Set up Row Level Security (RLS) for production
- Configure database backups
- Monitor usage and costs
- Set up alerts

For detailed setup instructions, see `docs/supabase-setup.md`

