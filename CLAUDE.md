# Claude Code Instructions

## Core Rules

### Feature Implementation
- Before implementing any feature, receive explicit approval from the user of what the feature is and how it is going to function.

### File Modification Rules
- If making changes to this CLAUDE.md file, always receive explicit approval from the user.

### Migration Plan Compliance
- Follow the requirements outlined in `migration-plan.md`
- Mark progress in the migration plan document as work is completed
- Require explicit approval from user to modify the migration plan

### Database Operations
- When applying database migrations, always use the `-p` flag: `npx supabase db push -p "password"`
- This prevents SCRAM authentication errors common with Supabase CLI
