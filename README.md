# Totalis Supabase

Totalis wellness platform migrated to Supabase infrastructure.

## Project Status

🚧 **Migration in Progress** - Following the [Migration Plan](../totalis/totalis-migration-plan.md)

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run tests**
   ```bash
   npm test
   ```

## Project Structure

```
totalis-supabase/
├── src/
│   ├── api/          # API endpoints and handlers
│   ├── config/       # Configuration management
│   ├── migration/    # Data migration scripts
│   ├── tests/        # Test suites
│   └── utils/        # Utility functions
├── supabase/
│   ├── functions/    # Edge functions
│   └── migrations/   # Database migrations
└── .github/
    └── workflows/    # CI/CD pipelines
```

## Configuration

See [PROJECT-CONFIG.md](PROJECT-CONFIG.md) for detailed configuration options.

## Migration Progress

- [ ] Phase 1: Test Client & GitHub Setup
- [ ] Phase 2: Supabase Infrastructure
- [ ] Phase 3: Production Data Migration
- [ ] Phase 4: Edge Functions & Basic n8n
- [ ] Phase 5: Core Features Implementation
- [ ] Phase 6: Mobile App Migration
- [ ] Phase 7: Production Launch

## Key Decisions

- **Default Coach**: Daniel
- **Anonymous Users**: No expiration
- **Voice Recording**: 60 seconds max
- **AI Logic**: Handled by n8n
- **Check-ins**: AI-driven, no fixed limits

## Documentation

- [Migration Plan](../totalis/totalis-migration-plan.md)
- [Architecture](../totalis/architecture-recommendation.md)
- [Database Schema](../totalis/supabase-database-schema.md)
- [Project Config](PROJECT-CONFIG.md)

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch
```

## Security

- Never commit `.env` file
- Use GitHub secrets for CI/CD
- Service keys are admin-level access

---

*Created: January 25, 2025*