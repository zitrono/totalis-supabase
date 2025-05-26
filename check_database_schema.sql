-- Check all tables in the public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check columns for key tables with metadata tracking
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_schema = c.table_schema 
    AND t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND t.table_name IN (
        'coaches',
        'profiles',
        'categories',
        'assessments',
        'assessment_questions',
        'assessment_responses',
        'coach_categories',
        'coach_specializations',
        'bookings',
        'blog_posts',
        'blog_post_categories',
        'blog_categories',
        'pages',
        'testimonials',
        'faq_items',
        'settings'
    )
ORDER BY t.table_name, c.ordinal_position;

-- Check for metadata columns specifically
SELECT 
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name IN ('is_test_data', 'test_data_batch_id', 'test_data_created_at')
ORDER BY table_name, column_name;

-- Check for any existing test data
SELECT 
    table_name,
    'SELECT COUNT(*) as test_records FROM ' || table_name || ' WHERE is_test_data = true;' as count_query
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'is_test_data'
ORDER BY table_name;