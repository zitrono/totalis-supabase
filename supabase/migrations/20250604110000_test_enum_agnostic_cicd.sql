-- Test migration to verify enum-agnostic CI/CD
-- This migration adds a comment to demonstrate the system automatically
-- adapts to database changes without manual enum configuration

COMMENT ON TYPE public.sex IS 'User sex/gender enum - automatically extracted by CI/CD';
COMMENT ON TYPE public.role IS 'Message role enum - automatically extracted by CI/CD';
COMMENT ON TYPE public.content_type IS 'Content type enum - automatically extracted by CI/CD';