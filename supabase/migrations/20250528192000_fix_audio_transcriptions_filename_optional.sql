-- Make filename optional in audio_transcriptions table
-- Since we don't store audio files, filename is not required

ALTER TABLE audio_transcriptions 
ALTER COLUMN filename DROP NOT NULL;

-- Update comment to reflect new behavior
COMMENT ON COLUMN audio_transcriptions.filename IS 'Optional filename - audio files are not stored, only transcriptions';