# Supabase User Tokens Table

This table stores user refresh tokens for automatic background syncing of recently played tracks.

## SQL Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Create user_tokens table
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE
    ON user_tokens FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Purpose

This table allows the app to:
- Store refresh tokens securely in the database
- Automatically sync recently played tracks in the background
- Keep user data up-to-date without requiring manual uploads
- Support hourly background sync jobs

## Security

- Refresh tokens are stored encrypted at rest by Supabase
- Only accessible via the service role key (server-side only)
- Tokens are deleted when users log out

