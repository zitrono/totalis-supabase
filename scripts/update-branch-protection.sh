#!/bin/bash

# Update branch protection rules to include pre-preview validation

echo "Updating branch protection rules..."

# Create the protection rules JSON
cat > branch-protection.json <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "static-validation",
      "validate-migrations", 
      "validate-functions",
      "validate-config",
      "preview"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# Apply the protection rules
gh api --method PUT repos/zitrono/totalis-supabase/branches/main/protection --input branch-protection.json

echo "✅ Branch protection rules updated"
echo "   - Added 'static-validation' as required check"
echo "   - Preview deployment now requires validation to pass first"

# Clean up
rm branch-protection.json