-- Add missing columns to checkins table
-- Run this if you get errors about missing columns

-- Add columns if they don't exist
DO $$ 
BEGIN
  -- Add brief column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'brief'
  ) THEN
    ALTER TABLE checkins ADD COLUMN brief TEXT;
  END IF;

  -- Add summary column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'summary'
  ) THEN
    ALTER TABLE checkins ADD COLUMN summary TEXT;
  END IF;

  -- Add insight column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'insight'
  ) THEN
    ALTER TABLE checkins ADD COLUMN insight TEXT;
  END IF;

  -- Add wellness_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'wellness_level'
  ) THEN
    ALTER TABLE checkins ADD COLUMN wellness_level INTEGER CHECK (wellness_level BETWEEN 1 AND 10);
  END IF;

  -- Add mood column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'mood'
  ) THEN
    ALTER TABLE checkins ADD COLUMN mood JSONB;
  END IF;

  -- Add questions_asked column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkins' AND column_name = 'questions_asked'
  ) THEN
    ALTER TABLE checkins ADD COLUMN questions_asked INTEGER DEFAULT 0;
  END IF;
END $$;