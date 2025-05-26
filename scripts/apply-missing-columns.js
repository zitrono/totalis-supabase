const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function applyMissingColumns() {
  console.log('🚀 Checking and adding missing columns to checkins table...\n');

  // Create admin client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Test if we can query the checkins table with all columns
    console.log('📝 Checking checkins table columns...');
    
    const { data, error } = await supabase
      .from('checkins')
      .select('id, brief, summary, insight, wellness_level, mood, questions_asked')
      .limit(1);
    
    if (error) {
      console.log('❌ Some columns are missing. Please apply this SQL in Supabase Dashboard:\n');
      console.log('Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor\n');
      console.log('Run this SQL:');
      console.log('```sql');
      console.log(`-- Add missing columns to checkins table
DO $$ 
BEGIN
  -- Add brief column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'brief'
  ) THEN
    ALTER TABLE checkins ADD COLUMN brief TEXT;
    RAISE NOTICE 'Added brief column';
  END IF;

  -- Add summary column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'summary'
  ) THEN
    ALTER TABLE checkins ADD COLUMN summary TEXT;
    RAISE NOTICE 'Added summary column';
  END IF;

  -- Add insight column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'insight'
  ) THEN
    ALTER TABLE checkins ADD COLUMN insight TEXT;
    RAISE NOTICE 'Added insight column';
  END IF;

  -- Add wellness_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'wellness_level'
  ) THEN
    ALTER TABLE checkins ADD COLUMN wellness_level INTEGER CHECK (wellness_level BETWEEN 1 AND 10);
    RAISE NOTICE 'Added wellness_level column';
  END IF;

  -- Add mood column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'mood'
  ) THEN
    ALTER TABLE checkins ADD COLUMN mood JSONB;
    RAISE NOTICE 'Added mood column';
  END IF;

  -- Add questions_asked column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'questions_asked'
  ) THEN
    ALTER TABLE checkins ADD COLUMN questions_asked INTEGER DEFAULT 0;
    RAISE NOTICE 'Added questions_asked column';
  END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'checkins' 
  AND column_name IN ('brief', 'summary', 'insight', 'wellness_level', 'mood', 'questions_asked')
ORDER BY column_name;`);
      console.log('```\n');
      console.log('After running the SQL, run the tests again with:');
      console.log('npm run test:remote -- edge-functions-remote.test.ts');
    } else {
      console.log('✅ All required columns exist in checkins table!');
      console.log('\nYou can now run the tests:');
      console.log('npm run test:remote -- edge-functions-remote.test.ts');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyMissingColumns();