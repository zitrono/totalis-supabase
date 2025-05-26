# Totalis Production Database Analysis

## Overview
The production Totalis database is running PostgreSQL 15.1 in a Docker container on server 194.163.136.137. The database name is `totalis` with user `totalis`.

## Database Tables (19 total)

### Core User/Coach Tables
1. **tls_user** - User profiles with Firebase authentication
   - Links to coach, image, and user preferences
   - Contains summarization and mood_config fields

2. **tls_coach** - AI coach definitions
   - Multiple image sizes (30, 45, 60)
   - Voice settings and prompts
   - Sex indicator for persona

3. **tls_admin** - Admin users with Firebase auth

### Category/Content Tables
4. **tls_category** - Hierarchical wellness categories
   - Self-referential parent_id for tree structure
   - Prompt templates for check-ins
   - Guidelines file storage
   - Color theming and icons
   - Follow-up chat settings

5. **tls_keyword** - Keywords for categorization
6. **tls_category_keyword** - Many-to-many junction table (BUT incorrectly references tls_coach!)

### Check-in/Messaging Tables
7. **tls_checkin** - User check-in records
   - Links to user_category
   - Contains summary, insight, and brief fields
   - Level indicator (0-100 scale presumed)

8. **tls_message** - Conversation messages
   - Links to check-in, user_category, and coach
   - Role-based (user/assistant)
   - Answers JSON field
   - Check-in end flag

9. **tls_checkin_recommendation** - Primary recommendations
   - Insight, title, why, action fields
   - Importance and order indicators

10. **tls_checkin_recommendation_2** - Secondary recommendations
    - Links to categories
    - Relevance field explains connection

### User Relations
11. **tls_user_category** - User's subscribed categories
    - is_favorite flag
    - Many-to-many between users and categories

### System/Infrastructure Tables
12. **tls_image** - Binary image storage
13. **tls_prompt** - Named prompt templates
14. **tls_variable** - System variables/settings
15. **tls_system** - System configuration
16. **block** - Entity blocking system
17. **pa_var** - Template variables
18. **tls_public_identifier** - Public access tracking
19. **tls_public_subscriber** - Email subscription list

## Complete Database Relationships

### All Foreign Key Constraints (21 total)

| Table | Constraint Name | Column | References | Foreign Column | Delete Action |
|-------|----------------|---------|------------|----------------|---------------|
| tls_category | tls_category_category_id_fk | parent_id | tls_category | id | SET NULL |
| tls_category | tls_category_icon_image_id_fk | icon_id | tls_image | id | SET NULL |
| tls_category | tls_category_icon_secondary_image_id_fk | icon_id_secondary | tls_image | id | SET NULL |
| tls_category_keyword | tls_category_keyword_category_id | category_id | tls_coach | id | CASCADE |
| tls_category_keyword | tls_category_keyword_keyword_id | keyword_id | tls_coach | id | CASCADE |
| tls_checkin | tls_checkin_user_category_id_fk | user_category_id | tls_user_category | id | CASCADE |
| tls_checkin_recommendation | tls_checkin_recommendation_checkin_id_fk | checkin_id | tls_checkin | id | CASCADE |
| tls_checkin_recommendation_2 | tls_checkin_recommendation_2_category_id_fk | category_id | tls_category | id | CASCADE |
| tls_checkin_recommendation_2 | tls_checkin_recommendation_2_checkin_id_fk | checkin_id | tls_checkin | id | CASCADE |
| tls_coach | tls_coach_tls_image_id_fk | image_id | tls_image | id | CASCADE |
| tls_coach | tls_coach_tls_image_id_fk_2 | image30_id | tls_image | id | SET NULL |
| tls_coach | tls_coach_tls_image_id_fk_3 | image45_id | tls_image | id | SET NULL |
| tls_coach | tls_coach_tls_image_id_fk_4 | image60_id | tls_image | id | SET NULL |
| tls_image | tls_image_user_id_fk | user_id | tls_user | id | SET NULL |
| tls_message | tls_message_checkin_id | checkin_id | tls_checkin | id | CASCADE |
| tls_message | tls_message_coach_id | coach_id | tls_coach | id | SET NULL |
| tls_message | tls_message_user_category_id | user_category_id | tls_user_category | id | CASCADE |
| tls_user | tls_user_coach_id | coach_id | tls_coach | id | SET NULL |
| tls_user | tls_user_tls_image_id_fk | image_id | tls_image | id | CASCADE |
| tls_user_category | tls_user_category_category_id_fk | category_id | tls_category | id | CASCADE |
| tls_user_category | tls_user_category_user_id_fk | user_id | tls_user | id | CASCADE |

### Delete Action Legend
- **CASCADE (c)**: Deletes dependent records automatically
- **SET NULL (n)**: Sets foreign key to NULL in dependent records

### Relationship Analysis

#### Valid Relationships (ON DELETE CASCADE) - 11 total
1. **User → User Categories**: Proper cascade ensures no orphaned subscriptions
2. **User Category → Check-ins**: Proper cascade for check-in history
3. **User Category → Messages**: Proper cascade for message history
4. **Check-in → Messages**: Proper cascade for conversation threads
5. **Check-in → Recommendations (both tables)**: Proper cascade for recommendations
6. **Category → User Categories**: Proper cascade when category is removed
7. **Category → Secondary Recommendations**: Proper cascade for recommendations
8. **Coach → Primary Image**: Proper cascade (but coach main image should be required)
9. **User → Profile Image**: Proper cascade for user avatars
10. **tls_category_keyword** foreign keys: CASCADE but pointing to wrong table!

#### Problematic Relationships (ON DELETE SET NULL) - 10 total
1. **tls_user.coach_id → tls_coach**: Users lose their coach assignment
2. **tls_category.parent_id → tls_category**: Breaks category hierarchy
3. **tls_category.icon_id → tls_image**: Categories lose their icons
4. **tls_category.icon_id_secondary → tls_image**: Categories lose secondary icons
5. **tls_coach.image30_id → tls_image**: Coach loses avatar variations
6. **tls_coach.image45_id → tls_image**: Coach loses avatar variations
7. **tls_coach.image60_id → tls_image**: Coach loses avatar variations
8. **tls_image.user_id → tls_user**: Images become orphaned
9. **tls_message.coach_id → tls_coach**: Messages lose coach context
10. **All image relationships**: Should use storage service instead

### Critical Issues Found

1. **tls_category_keyword table has incorrect foreign keys**:
   - Both category_id and keyword_id reference tls_coach instead of their proper tables
   - This is a major data integrity issue that makes the table unusable

2. **Circular dependency risk**:
   - tls_user references tls_image
   - tls_image references tls_user
   - Could cause issues during deletion

3. **Orphaned record risks**:
   - Deleting a coach orphans all users assigned to that coach
   - Deleting parent categories breaks the category tree structure
   - Deleting images leaves NULL references throughout the system

## Schema Comparison with Proposed Supabase Design

### Tables to Migrate
1. tls_user → user_profiles (simplified)
2. tls_coach → coaches
3. tls_category → categories (keep hierarchy)
4. tls_checkin → check_ins
5. tls_message → messages
6. tls_checkin_recommendation → recommendations (merged both types)
7. tls_user_category → user_categories

### Tables to Exclude
- tls_admin (use Supabase Auth)
- tls_image (use Supabase Storage)
- tls_prompt, tls_variable, tls_system (move to config)
- block, pa_var (unused)
- tls_public_* (marketing features)
- tls_keyword, tls_category_keyword (unused/broken)

### Key Differences from Proposed Schema
1. Production has separate recommendation tables (primary and secondary)
2. Production stores images as binary in database (inefficient)
3. Production has more granular coach image sizes
4. Production uses JSON fields for answers and mood_config
5. Production lacks proper RLS and uses application-level security

## Migration Considerations
1. Fix the tls_category_keyword foreign key issue before migration
2. Extract binary images to Supabase Storage during migration
3. Merge the two recommendation tables into one with a type field
4. Convert Firebase UIDs to Supabase Auth IDs
5. Implement proper RLS policies to replace application security
6. Consider keeping the "brief" field from check-ins (appears in dev branch)