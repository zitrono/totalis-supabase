# GitHub Secrets Setup for CI/CD

Before pushing to trigger the CI/CD pipeline, you need to configure the following secrets in your GitHub repository settings.

## Required Secrets

### 1. Supabase Keys
These can be found in your Supabase project dashboard under Settings > API:

- **SUPABASE_ANON_KEY**: The anonymous/public key
- **SUPABASE_SERVICE_ROLE_KEY**: The service role key (keep this secret!)

### 2. Supabase CLI Authentication
Get these from your Supabase account:

- **SUPABASE_ACCESS_TOKEN**: Personal access token
  - Generate at: https://app.supabase.com/account/tokens
  - Give it a descriptive name like "GitHub Actions"
  
- **SUPABASE_PROJECT_ID**: Your project reference ID
  - Found in: Settings > General > Reference ID
  - Format: `abcdefghijklmnop`

## How to Add Secrets

1. Go to your GitHub repository
2. Click on Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the exact name shown above

## Verify Setup

After adding all secrets, you can verify by:
1. Making a small change
2. Pushing to a feature branch
3. Creating a pull request
4. Checking the Actions tab to see if tests run

## Security Notes

- Never commit these values to your repository
- Use different keys for development and production
- Rotate keys periodically
- The service role key bypasses RLS - use carefully!

## Local Development

For local development, create a `.env` file:

```env
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Remember: `.env` is in `.gitignore` and should never be committed!