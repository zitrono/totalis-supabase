# Testing Pre-Preview Validation

## Test Scenarios

### 1. Valid PR (Should Pass)
- Proper migration naming
- TypeScript compiles
- No hardcoded secrets

### 2. Invalid Migration Name (Should Fail)
```sql
-- File: 20250528200000_bad-naming-convention.sql
-- This should fail validation (hyphen instead of underscore)
```

### 3. TypeScript Error (Should Fail)
```typescript
// Missing type reference
// Missing error handling type guard
catch (error) {
  console.log(error.message) // Should fail
}
```

### 4. Hardcoded Secret (Should Fail)
```typescript
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Expected Behavior

1. PR created → Pre-preview validation runs immediately
2. If validation passes → Preview deployment triggers automatically
3. If validation fails → No preview created, PR comment explains errors
4. Developer can manually trigger preview after fixing issues

## Verification Steps

1. Create PR with invalid code
2. See pre-preview validation fail quickly (30s)
3. Fix issues and push
4. See validation pass and preview auto-deploy