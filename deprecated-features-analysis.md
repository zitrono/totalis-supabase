# Deprecated Features Analysis - Totalis Platform

## Executive Summary

This document identifies backend features and infrastructure that are not used by the mobile client and should NOT be migrated to Supabase. The analysis reveals that approximately 60% of backend functionality is unused, including the entire admin system, various infrastructure services, and advanced AI features.

## Features to EXCLUDE from Migration

### 1. Admin System (Entire Module)
The admin API exists in code but is **not mounted** in the main application:
- Admin authentication (separate from user auth)
- Admin CRUD operations
- User management endpoints
- Category keyword management
- System configuration endpoints
- Direct message manipulation
- Coach category management

**Decision**: Admin functionality will be handled directly through Supabase Dashboard.

### 2. Infrastructure Services

#### Elasticsearch
- Used for logging and search functionality
- Not exposed to mobile app
- **Decision**: Use Supabase's built-in logging and full-text search

#### RabbitMQ/Message Routing
- Complex message broker setup
- Used for background job processing
- **Decision**: Use Supabase webhooks and n8n for async processing

#### Redis Caching
- Custom caching layer
- **Decision**: Leverage Supabase's edge caching and SDK caching

#### Logstash Integration
- Centralized logging infrastructure
- **Decision**: Use Supabase's built-in observability

### 3. Unused User Features

#### User Summarization
- Backend has AI-powered user summarization
- Fields exist in database but no mobile UI uses them
- Endpoints: `/users/summarize/id/{id}`
- **Decision**: Exclude from migration

#### Keyword/Tagging System
- Complex keyword management for categories
- Tables: `tls_keyword`, `tls_category_keyword`
- No mobile app usage
- **Decision**: Exclude from migration

#### Secondary Recommendations
- "How" and "Why" recommendation types
- Endpoints exist but not called by mobile
- **Decision**: Exclude from migration

#### Account Management
- Account linking (`bind_other_account`)
- Account deletion endpoints
- Not implemented in mobile UI
- **Decision**: Exclude from migration

### 4. Content Management Features

#### Guideline Parsing
- Google Docs integration for parsing guidelines
- Background job: `GuidelineParsingJob`
- Separate `/api/guideline` endpoints
- **Decision**: Exclude - admins will manage content directly in Supabase

#### Category Prompts
- Prompt templates stored with categories
- Mobile app doesn't use category-specific prompts
- All chats are generic regardless of category
- **Decision**: Exclude from migration

#### Dynamic Category Creation
- POST endpoints for creating categories via API
- Mobile only reads categories
- **Decision**: Categories managed directly in Supabase

### 5. Advanced Messaging Features

#### Message Editing
- `/checkin/change_message` endpoint
- Not implemented in mobile UI
- **Decision**: Exclude from migration

#### Proposal System
- Check-in proposals endpoint exists
- Not actively used in current mobile flow
- **Decision**: Exclude from migration

### 6. Variable System
- Generic variable storage and retrieval
- `/variable/get/{name}` endpoint
- Minimal usage (only shortcuts)
- **Decision**: Simplify to app configuration table

## Features to KEEP in Migration

### Core User Features
✅ User authentication and profiles  
✅ Coach selection and display  
✅ Category hierarchy (read-only for users)  
✅ Chat messaging system  
✅ Check-in conversations  
✅ First-level recommendations  
✅ Image storage and retrieval  
✅ Favorites management  

### Simplified Architecture
✅ Single message table (chat + check-ins)  
✅ Basic user profiles  
✅ Coach assignments  
✅ Category structure  
✅ Real-time subscriptions  

## Migration Simplifications

### 1. Database Schema
- Remove: `tls_keyword`, `tls_category_keyword`, `tls_admin`
- Remove: `summarization` fields from user profile
- Remove: `prompt` and `guideline` fields from categories
- Simplify: Merge check-ins into messages table

### 2. API Surface
- Reduce from ~50 endpoints to ~15 endpoints
- Focus on CRUD operations for core entities
- Leverage Supabase SDK instead of custom endpoints

### 3. Background Processing
- Replace RabbitMQ with n8n webhooks
- Remove background jobs infrastructure
- Simplify to event-driven architecture

### 4. Caching Strategy
- Remove Redis dependency
- Use Supabase client-side caching
- Leverage edge function caching

## Cost Savings

By excluding these features:
1. **Infrastructure**: Eliminate Redis, RabbitMQ, Elasticsearch costs
2. **Complexity**: Reduce codebase by ~60%
3. **Maintenance**: Fewer services to monitor and update
4. **Development**: Faster iteration with simpler architecture

## Conclusion

The migration to Supabase presents an opportunity to dramatically simplify the Totalis architecture by focusing only on actively used features. By excluding deprecated and unused functionality, the platform will be more maintainable, cost-effective, and aligned with actual user needs.

---

*Document created: May 24, 2025*  
*Purpose: Identify features to exclude from Supabase migration*