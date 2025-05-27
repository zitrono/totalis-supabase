# Edge Function Deployment Guide

This guide explains how to deploy Supabase Edge Functions without Docker using GitHub Actions and the `--use-api` flag.

## Prerequisites

1. **GitHub Repository Secrets**
   - `SUPABASE_ACCESS_TOKEN`: Generate at https://app.supabase.com/account/tokens
   - `SUPABASE_PROJECT_ID`: Find in Dashboard → Settings → General

## Deployment Methods

### 1. Automatic Deployment (Push to main/master)

Functions are automatically deployed when you push changes to the `supabase/functions/` directory on the main or master branch.

### 2. Manual Deployment (GitHub Actions)

1. Go to the "Actions" tab in your GitHub repository
2. Click on "Deploy Edge Functions" workflow
3. Click "Run workflow"
4. Optional: Enter a specific function name to deploy only that function
5. Click "Run workflow" to start deployment

### 3. CLI Deployment (Without Docker)

```bash
# Deploy all functions
supabase functions deploy --use-api --project-ref YOUR_PROJECT_ID

# Deploy specific function
supabase functions deploy function-name --use-api --project-ref YOUR_PROJECT_ID
```

**Note**: The `--use-api` flag bypasses Docker requirements.

### 4. Supabase Dashboard (Emergency/Testing)

1. Navigate to your Supabase project
2. Go to Edge Functions section
3. Click "New Function"
4. Copy/paste your function code
5. Click "Deploy"

## Function Structure

```
supabase/functions/
├── function-name/
│   └── index.ts
```

## Setting Up GitHub Secrets

1. **Generate Access Token**
   - Go to https://app.supabase.com/account/tokens
   - Click "Generate new token"
   - Give it a descriptive name (e.g., "GitHub Actions")
   - Copy the token immediately (it won't be shown again)

2. **Find Project ID**
   - Go to your Supabase Dashboard
   - Settings → General
   - Copy the "Reference ID" (format: `abcdefghijklmnop`)

3. **Add to GitHub**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add both `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID`

## Testing Deployed Functions

```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/function-name' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"your": "data"}'
```

## Workflow File Location

`.github/workflows/deploy-edge-functions.yml`

## Troubleshooting

- **Authentication errors**: Verify your `SUPABASE_ACCESS_TOKEN` is valid
- **Project not found**: Check your `SUPABASE_PROJECT_ID` is correct
- **Function not deploying**: Ensure the function directory exists under `supabase/functions/`
- **CLI errors**: Update to latest Supabase CLI with `npm install -g supabase@latest`

## Important Notes

- The `--use-api` flag is experimental but stable for production use
- This method is faster than Docker-based deployment
- Local development still requires Docker for `supabase functions serve`
- GitHub Actions deployment completely bypasses Docker requirements