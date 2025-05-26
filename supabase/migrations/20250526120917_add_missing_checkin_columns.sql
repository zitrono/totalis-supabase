-- Add missing columns to checkins table
DO $$ 
BEGIN
  -- Add brief column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'brief'
  ) THEN
    ALTER TABLE checkins ADD COLUMN brief TEXT;
    RAISE NOTICE 'Added brief column to checkins table';
  END IF;

  -- Add summary column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'summary'
  ) THEN
    ALTER TABLE checkins ADD COLUMN summary TEXT;
    RAISE NOTICE 'Added summary column to checkins table';
  END IF;

  -- Add insight column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'insight'
  ) THEN
    ALTER TABLE checkins ADD COLUMN insight TEXT;
    RAISE NOTICE 'Added insight column to checkins table';
  END IF;

  -- Add wellness_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'wellness_level'
  ) THEN
    ALTER TABLE checkins ADD COLUMN wellness_level INTEGER CHECK (wellness_level BETWEEN 1 AND 10);
    RAISE NOTICE 'Added wellness_level column to checkins table';
  END IF;

  -- Add mood column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'mood'
  ) THEN
    ALTER TABLE checkins ADD COLUMN mood JSONB;
    RAISE NOTICE 'Added mood column to checkins table';
  END IF;

  -- Add questions_asked column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'questions_asked'
  ) THEN
    ALTER TABLE checkins ADD COLUMN questions_asked INTEGER DEFAULT 0;
    RAISE NOTICE 'Added questions_asked column to checkins table';
  END IF;
END $$;