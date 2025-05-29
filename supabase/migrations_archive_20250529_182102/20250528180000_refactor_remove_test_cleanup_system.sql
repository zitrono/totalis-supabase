-- Remove test cleanup system since we're using throwaway preview instances

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS public.test_data_summary;

-- Drop functions
DROP FUNCTION IF EXISTS public.cleanup_test_data(interval);
DROP FUNCTION IF EXISTS public.mark_as_test_data(jsonb);
DROP FUNCTION IF EXISTS public.create_test_user(text, text);
DROP FUNCTION IF EXISTS public.clean_test_data();

-- Drop indexes created for test metadata tracking
DROP INDEX IF EXISTS idx_profiles_test_metadata;
DROP INDEX IF EXISTS idx_athletes_test_metadata;
DROP INDEX IF EXISTS idx_coaches_test_metadata;
DROP INDEX IF EXISTS idx_categories_test_metadata;
DROP INDEX IF EXISTS idx_student_categories_test_metadata;
DROP INDEX IF EXISTS idx_exercises_test_metadata;
DROP INDEX IF EXISTS idx_exercise_muscles_test_metadata;
DROP INDEX IF EXISTS idx_exercise_equipment_test_metadata;
DROP INDEX IF EXISTS idx_user_exercises_test_metadata;
DROP INDEX IF EXISTS idx_user_exercise_metrics_test_metadata;
DROP INDEX IF EXISTS idx_workouts_test_metadata;
DROP INDEX IF EXISTS idx_sessions_test_metadata;
DROP INDEX IF EXISTS idx_sets_test_metadata;
DROP INDEX IF EXISTS idx_blocks_test_metadata;
DROP INDEX IF EXISTS idx_block_exercises_test_metadata;
DROP INDEX IF EXISTS idx_muscles_test_metadata;
DROP INDEX IF EXISTS idx_equipment_test_metadata;
DROP INDEX IF EXISTS idx_feedback_test_metadata;
DROP INDEX IF EXISTS idx_coach_feedback_test_metadata;
DROP INDEX IF EXISTS idx_user_points_test_metadata;
DROP INDEX IF EXISTS idx_user_badges_test_metadata;
DROP INDEX IF EXISTS idx_user_achievements_test_metadata;
DROP INDEX IF EXISTS idx_gamification_events_test_metadata;

-- Drop test cleanup log table
DROP TABLE IF EXISTS public.test_cleanup_log;

-- Note: We're keeping the metadata JSONB columns in tables as they might be used
-- for other purposes beyond test cleanup. If you want to remove them entirely,
-- uncomment the following section:

/*
-- Remove metadata columns from all tables
ALTER TABLE public.profiles DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.athletes DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.coaches DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.categories DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.student_categories DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.exercises DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.exercise_muscles DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.exercise_equipment DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.user_exercises DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.user_exercise_metrics DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.workouts DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.sets DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.blocks DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.block_exercises DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.muscles DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.equipment DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.feedback DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.coach_feedback DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.user_points DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.user_badges DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.user_achievements DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.gamification_events DROP COLUMN IF EXISTS metadata;
*/