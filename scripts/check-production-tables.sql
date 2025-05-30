-- Check what tables exist in production
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;