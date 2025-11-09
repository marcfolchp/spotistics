# GitHub Actions Cron Job Setup

This guide explains how to set up a free cron job using GitHub Actions to sync recently played tracks.

## Why GitHub Actions?

- **Free**: Unlimited minutes for public repos, 2,000 minutes/month for private repos
- **Flexible**: Can run hourly, every 30 minutes, or any schedule you want
- **Reliable**: GitHub's infrastructure is very reliable
- **Easy to set up**: Just add a workflow file

## Setup Instructions

### 1. Create GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

1. **`SYNC_API_URL`**: Your Vercel API endpoint
   ```
   https://spotistics-five.vercel.app/api/sync/recently-played
   ```

2. **`SYNC_SECRET_KEY`**: A secret key for authentication (same as your `SYNC_SECRET_KEY` in Vercel)
   - Generate a random string: `openssl rand -hex 32`
   - Or use any secure random string

### 2. Update Vercel Environment Variables

Make sure `SYNC_SECRET_KEY` is set in Vercel environment variables (same value as GitHub secret).

### 3. The Workflow File

The workflow file (`.github/workflows/sync-recently-played.yml`) is already created. It will:
- Run every hour at minute 0 (1:00, 2:00, 3:00, etc.)
- Call your sync API endpoint with authentication
- Can be manually triggered from GitHub Actions UI

### 4. Customize the Schedule

Edit `.github/workflows/sync-recently-played.yml` to change the schedule:

```yaml
schedule:
  # Every hour
  - cron: '0 * * * *'
  
  # Every 30 minutes
  - cron: '*/30 * * * *'
  
  # Every 15 minutes
  - cron: '*/15 * * * *'
  
  # Every day at midnight UTC
  - cron: '0 0 * * *'
  
  # Every 6 hours
  - cron: '0 */6 * * *'
```

Cron format: `minute hour day month weekday`

### 5. Test the Workflow

1. Go to your GitHub repository
2. Click "Actions" tab
3. Find "Sync Recently Played Tracks" workflow
4. Click "Run workflow" to test manually

## Other Free Cron Job Options

### 2. EasyCron (Free Tier)
- **URL**: https://www.easycron.com
- **Free**: 1 job, runs every 5 minutes minimum
- **Pros**: Simple setup, email notifications
- **Cons**: Limited to 1 job on free tier

### 3. Cron-job.org (Free Tier)
- **URL**: https://cron-job.org
- **Free**: Unlimited jobs, runs every 1 minute minimum
- **Pros**: Very flexible, good free tier
- **Cons**: Requires email verification

### 4. Render Cron Jobs (Free Tier)
- **URL**: https://render.com
- **Free**: 750 hours/month
- **Pros**: Good for background jobs
- **Cons**: Requires deploying a service

### 5. Railway (Free Tier)
- **URL**: https://railway.app
- **Free**: $5 credit/month
- **Pros**: Easy setup, good for cron jobs
- **Cons**: Limited free credits

### 6. Supabase Edge Functions + pg_cron
- If you're using Supabase, you can use `pg_cron` extension
- **Pros**: Integrated with your database
- **Cons**: Requires Supabase Pro plan for some features

## Recommendation

**GitHub Actions** is the best free option because:
- ✅ You already have the code on GitHub
- ✅ No external service needed
- ✅ Very reliable
- ✅ Can run as frequently as you want
- ✅ Free for public repos
- ✅ Easy to monitor and debug

## Monitoring

- Check GitHub Actions tab for run history
- Check Vercel logs for API calls
- Add error notifications if needed

