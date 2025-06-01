# OIDC Publishing Setup for totalis_types

## Manual Setup Required

To enable OIDC authentication for publishing, you need to:

1. **Visit pub.dev Admin Page**:
   - Go to: https://pub.dev/packages/totalis_types/admin
   - Login with your Google account (zitrono000@gmail.com)

2. **Enable GitHub Actions Publishing**:
   - In the "Automated publishing" section
   - Click "Enable publishing from GitHub Actions"
   - Enter repository: `zitrono/totalis` 
   - Set Tag-pattern to: `types-v{{version}}` (matches our git tags like `types-v1.0.100`)
   - Save changes

3. **Repository Configuration**:
   - Our workflow already has correct permissions:
     ```yaml
     permissions:
       id-token: write      # Required for OIDC
       contents: write      # To create tags
     ```

## How It Works

- When we push to main with schema/function changes, workflow runs
- Package is built with version `1.0.{build_number}`
- Git tag `types-v1.0.{build_number}` is created
- OIDC authentication happens automatically
- Package publishes to pub.dev

## Testing Locally

Before enabling OIDC, test the package generation:

```bash
cd /Users/zitrono/dev/totalis/totalis-supabase

# Test the full workflow locally (dry run)
./scripts/test-types-generation.sh
```

## Current Status

- ✅ Package exists on pub.dev (totalis_types v1.0.99)
- ✅ Workflow updated for OIDC authentication  
- ⏳ OIDC publishing needs to be enabled on pub.dev admin page
- ⏳ Local testing recommended before enabling

## Next Steps

1. Run local dry run test
2. Enable OIDC on pub.dev admin page
3. Test with actual workflow run