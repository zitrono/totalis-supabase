# Deploy Edge Functions - Quick Guide

## Your Project Information
- **Project ID**: `ilnmgducvjnzmmznklws`
- **Project URL**: `https://ilnmgducvjnzmmznklws.supabase.co`

## Method 1: Automated CLI Deployment (NEW - No Docker Required!)

```bash
# Set environment variables
export SUPABASE_ACCESS_TOKEN='your-access-token-here'
export SUPABASE_PROJECT_ID='ilnmgducvjnzmmznklws'

# Run the deployment script
./scripts/deploy-edge-functions.sh
```

Get your access token from: https://app.supabase.com/account/tokens

## Method 2: GitHub Actions (Recommended for CI/CD)

1. **Run the setup script for instructions**:
   ```bash
   ./scripts/setup-github-secrets.sh
   ```

2. **Deploy**:
   - Push your code to main/master branch
   - Or manually: Actions tab → "Deploy Edge Functions" → Run workflow

## Method 3: Direct CLI Command

```bash
# Set your access token
export SUPABASE_ACCESS_TOKEN='your-token-here'

# Deploy using --use-api flag (no Docker needed)
cd /Users/zitrono/dev/totalis-supabase
./supabase-cli functions deploy checkin-process --use-api --project-ref ilnmgducvjnzmmznklws
```

## Method 4: Supabase Dashboard

1. Go to: https://app.supabase.com/project/ilnmgducvjnzmmznklws/functions
2. Click "New function"
3. Name: `checkin-process`
4. Copy the contents of `/supabase/functions/checkin-process/index.ts`
5. Click "Deploy"

## Testing Your Deployed Function

```bash
curl -i --location --request POST \
  'https://ilnmgducvjnzmmznklws.supabase.co/functions/v1/checkin-process' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "start",
    "category_id": "some-category-uuid"
  }'
```

## Scripts Created for You

- `scripts/deploy-edge-functions.sh` - Automated deployment script
- `scripts/setup-github-secrets.sh` - GitHub secrets setup guide
- `.github/workflows/deploy-edge-functions.yml` - GitHub Actions workflow

## Current Function Status

The `checkin-process` function is ready at:
`/Users/zitrono/dev/totalis-supabase/supabase/functions/checkin-process/index.ts`

It implements:
- Start check-in action
- Complete check-in action
- JWT authentication
- Proper error handling