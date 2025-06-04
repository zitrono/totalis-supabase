# Totalis Types v1.0.154 - Successfully Published

## Overview
Successfully published totalis_types v1.0.154 to pub.dev on June 4, 2025.

## Key Achievement
- **Fully Enum-Agnostic Type Generation**: The CI/CD pipeline now automatically extracts all enum types from the PostgreSQL database without any manual configuration.
- **Published Version**: 1.0.154 (previous was 1.0.146)

## Enum-Agnostic Implementation
The system now automatically extracts 16 enum types from the database:
- versions_platform
- ins_status
- progress_status
- status
- sex
- cards_type
- content_type
- message_type
- role
- queue_operation_type
- queue_status
- level
- recommendation_type
- devices_platform
- feedback_feedback_type
- profiles_sex

## CI/CD Workflow Updates

### 1. Removed Manual Enum Fallback
- Both `generate-publish-types.yml` and `publish-types-on-tag.yml` now rely entirely on automatic enum extraction
- No hardcoded enum definitions in workflows

### 2. Fixed IPv6 Connectivity Issues
- Switched from direct database connection to Supabase pooler endpoint
- Database URL: `aws-0-eu-central-1.pooler.supabase.com` (IPv4 compatible)
- Added IPv4-forcing environment variables

### 3. OIDC Publishing Limitations Discovered
OIDC publishing to pub.dev has strict requirements:
- Only works from `push` events to `tags` (not branches)
- Doesn't work with `workflow_dispatch` (runs on branch refType)
- Doesn't work with `repository_dispatch` events
- GitHub App-created tags don't trigger other workflows

### 4. Current Publishing Process
1. Automatic generation when migrations/functions change
2. GitHub App creates tag (e.g., v1.0.154)
3. Manual tag push required to trigger OIDC publishing:
   ```bash
   git tag v1.0.154 -m "Trigger OIDC publishing"
   git push origin v1.0.154
   ```

## Workflows Created/Updated
- `generate-publish-types.yml` - Main generation workflow
- `publish-types-on-tag.yml` - OIDC publishing (requires tag push)
- `retry-publish-types.yml` - Manual retry workflow (has limitations)

## Next Steps
Consider alternative approaches:
1. Use pub.dev tokens instead of OIDC
2. Implement a GitHub Action that can push tags with proper permissions
3. Document the manual tag push requirement for releases