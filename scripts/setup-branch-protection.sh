#!/bin/bash

echo "🔒 Setting up Branch Protection Rules..."
echo ""

# Check if gh CLI is authenticated
if ! gh auth status > /dev/null 2>&1; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

# Get the repository details
OWNER="zitrono"
REPO="totalis-supabase"

echo "Creating branch protection rule for 'main' branch..."

# Create branch protection rule using gh api with proper JSON
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/${OWNER}/${REPO}/branches/main/protection" \
  --input - << EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "validate-migrations",
      "validate-functions", 
      "validate-tests",
      "preview"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF

if [ $? -eq 0 ]; then
    echo "✅ Branch protection rules created successfully!"
    echo ""
    echo "Protection enabled for 'main' branch with:"
    echo "- ✅ Require pull request reviews (1 approval)"
    echo "- ✅ Dismiss stale reviews when new commits are pushed"
    echo "- ✅ Require status checks to pass:"
    echo "  - validate-migrations"
    echo "  - validate-functions"
    echo "  - validate-tests"
    echo "  - preview"
    echo "- ✅ Require branches to be up to date"
    echo "- ✅ Require conversation resolution"
    echo "- ✅ Prevent force pushes and deletions"
    echo ""
    echo "View settings at: https://github.com/${OWNER}/${REPO}/settings/branches"
else
    echo "❌ Failed to create branch protection rules"
    echo ""
    echo "You may need to set them up manually at:"
    echo "https://github.com/${OWNER}/${REPO}/settings/branches"
fi