# Vercel Cron Job Setup

This guide will help you set up an automatic hourly sync of recently played tracks using Vercel Cron.

## Step 1: Create vercel.json

The `vercel.json` file has already been created in your project root with the following configuration:

```json
{
  "crons": [
    {
      "path": "/api/sync/recently-played",
      "schedule": "0 * * * *"
    }
  ]
}
```

This configures Vercel to call `/api/sync/recently-played` once per day at midnight (00:00 UTC).

**Note**: Vercel Hobby plan is limited to daily cron jobs. For hourly syncs, you'll need to upgrade to Pro plan or use an external cron service.

## Step 2: Set Environment Variables in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following environment variables:

### Required Variables:

- **`SYNC_SECRET_KEY`** (optional, for manual triggers)
  - Generate a secure random string: `openssl rand -hex 32`
  - Or use an online generator
  - This is used for manual API calls (not required for Vercel Cron)

- **`CRON_SECRET`** (not needed)
  - Vercel automatically secures cron jobs with the `x-vercel-cron` header
  - No need to set this variable

### Existing Variables (make sure these are set):

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

5. **Important**: Make sure to select the correct **Environment** (Production, Preview, Development) for each variable
6. Click **Save** for each variable

## Step 3: Deploy to Vercel

1. Push your changes to your Git repository:
   ```bash
   git add vercel.json
   git commit -m "Add Vercel cron job for hourly sync"
   git push
   ```

2. Vercel will automatically deploy your changes

3. After deployment, Vercel will automatically set up the cron job

## Step 4: Verify the Cron Job

1. Go to your Vercel Dashboard → Your Project → **Deployments**
2. Click on the latest deployment
3. Go to the **Functions** tab
4. You should see `/api/sync/recently-played` listed
5. Check the **Cron Jobs** section in your project settings to see the scheduled job

## Step 5: Test the Sync

### Option A: Wait for the Cron Job

The cron job will run automatically every hour. Check your Vercel logs to see if it's working:
1. Go to Vercel Dashboard → Your Project → **Logs**
2. Filter by `/api/sync/recently-played`
3. Wait for the next hour (when the cron runs)

### Option B: Manual Test

You can manually trigger the sync by calling the API:

```bash
curl -X GET https://your-domain.vercel.app/api/sync/recently-played \
  -H "Authorization: Bearer YOUR_SYNC_SECRET_KEY"
```

**Note**: Vercel cron jobs are automatically secured. You can't manually trigger them with the `x-vercel-cron` header - only Vercel can send that header.

## Step 6: Monitor the Sync

1. **Vercel Logs**: Check the logs in your Vercel dashboard to see sync activity
2. **Supabase**: Check your `listening_data` table to see new tracks being added
3. **Analytics Page**: Users should see updated data when they visit the analytics page

## Troubleshooting

### Cron Job Not Running

1. **Check vercel.json**: Make sure the file is in the project root
2. **Check Schedule**: The schedule `0 * * * *` means "every hour at minute 0"
3. **Check Deployment**: Make sure you've deployed after adding `vercel.json`
4. **Check Logs**: Look for errors in Vercel logs

### 401 Unauthorized Errors

1. **Check Environment Variables**: Make sure `CRON_SECRET` or `SYNC_SECRET_KEY` is set
2. **Check Header**: Vercel automatically sends `x-vercel-cron` header with a secret value
3. **Check Code**: The sync route checks for both Vercel cron header and secret key

### No New Tracks Being Added

1. **Check User Tokens**: Make sure users have logged in and their refresh tokens are stored in `user_tokens` table
2. **Check Spotify API**: Verify that users have played new tracks since the last sync
3. **Check Logs**: Look for errors in the sync process

### Rate Limiting

Spotify API has rate limits:
- **Recently Played**: 50 tracks per request
- **Rate Limit**: 10,000 requests per hour per user

The sync handles rate limiting automatically with delays between requests.

## Cron Schedule Options

You can change the schedule in `vercel.json`:

**Hobby Plan (Daily Limit):**
- `0 0 * * *` - Once per day at midnight UTC (current, compatible with Hobby plan)
- `0 12 * * *` - Once per day at noon UTC
- `0 0 * * 1` - Once per week (Monday at midnight)

**Pro Plan (Unlimited):**
- `0 * * * *` - Every hour at minute 0
- `*/30 * * * *` - Every 30 minutes
- `0 */2 * * *` - Every 2 hours

**Note**: Vercel Hobby plan is limited to **one cron job per day**. For hourly syncs, you'll need to:
- Upgrade to Pro plan, OR
- Use an external cron service (see `docs/background-sync-setup.md` for alternatives)

For more schedule options, see [Vercel Cron Documentation](https://vercel.com/docs/cron-jobs).

## Security Notes

- Vercel automatically secures cron jobs with the `x-vercel-cron` header
- The sync route verifies this header or the `SYNC_SECRET_KEY`
- Only authorized requests can trigger the sync
- User refresh tokens are stored securely in Supabase

