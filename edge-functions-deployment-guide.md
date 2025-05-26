# Edge Functions Deployment Guide

## Current Status

### ✅ Implemented Edge Functions

1. **audio-transcribe** (NEW)
   - Handles audio file uploads (mp3, wav, m4a, ogg, webm)
   - 25MB file size limit per OpenAI Whisper API
   - Stores files in `voice-recordings` bucket
   - Creates transcription records in database
   - Ready for OpenAI Whisper integration

2. **checkin-start**
   - Initializes check-in sessions
   - Generates dynamic questions based on category

3. **checkin-process**
   - Handles check-in responses
   - Manages check-in completion

4. **chat-ai-response**
   - Generates AI chat responses
   - Includes chat history context

5. **recommendations**
   - Creates personalized recommendations
   - Stores in database

6. **analytics-summary**
   - Generates user analytics
   - Provides insights

7. **langflow-webhook**
   - Receives Langflow callbacks

### ❌ Deployment Blocked

Edge functions cannot be deployed without Docker Desktop installed and running.

## Deployment Steps (When Docker is Available)

```bash
# 1. Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# 2. Start Docker Desktop
# Make sure Docker daemon is running

# 3. Deploy all functions
cd /Users/zitrono/dev/totalis-supabase
npx supabase functions deploy

# 4. Deploy specific function
npx supabase functions deploy audio-transcribe

# 5. Set environment variables
npx supabase secrets set OPENAI_API_KEY=your-key-here
npx supabase secrets set LANGFLOW_ENDPOINT=your-endpoint-here
```

## Audio Upload Configuration

### Supported Formats (OpenAI Whisper)
- MP3 (recommended for compression)
- WAV (highest quality)
- M4A
- FLAC
- OGG
- WEBM

### Optimal Settings
- **File Size**: Max 25MB
- **Sample Rate**: 16kHz (Whisper converts internally)
- **Bitrate**: 32kbps for good balance
- **Format**: MP3 for best compression

### Test Audio Upload

```bash
# Test with mock audio
npm run test:audio

# Test specific format
npm run test:interactive
# Then type: audio
```

## Database Migration Required

Apply the voice transcriptions table:

```sql
-- Go to Supabase SQL Editor
-- Run the migration from: supabase/migrations/006_add_voice_transcriptions.sql
```

## Integration Points

### Flutter App
```dart
// Audio upload with transcription
final response = await supabase.functions.invoke(
  'audio-transcribe',
  body: FormData.fromMap({
    'audio': MultipartFile.fromBytes(
      audioBytes,
      filename: 'recording.mp3',
      contentType: MediaType('audio', 'mp3'),
    ),
    'contextType': 'chat',
    'contextId': chatId,
  }),
);

// Direct storage upload (no transcription)
final path = await supabase.storage
  .from('voice-recordings')
  .uploadBinary(
    'path/to/file.mp3',
    audioBytes,
    fileOptions: FileOptions(contentType: 'audio/mp3'),
  );
```

### Test Client Usage
```typescript
// Create mock audio file
const audioFile = await client.createMockAudioFile(5, 'mp3');

// Upload and transcribe
const result = await client.uploadAndTranscribeAudio(
  audioFile,
  'chat',
  'session-123'
);

// Get transcription history
const history = await client.getTranscriptionHistory();
```

## OpenAI Integration (TODO)

Replace mock transcription in `audio-transcribe/index.ts`:

```typescript
async function transcribeAudio(
  audioBuffer: ArrayBuffer, 
  mimeType: string
): Promise<{ text: string; duration: number }> {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: mimeType }));
  formData.append('model', 'whisper-1');
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
    },
    body: formData
  });
  
  const data = await response.json();
  return {
    text: data.text,
    duration: data.duration || 0
  };
}
```

## Next Steps

1. **Install Docker Desktop** to enable deployment
2. **Deploy edge functions** using Supabase CLI
3. **Apply database migration** for voice_transcriptions table
4. **Test with real audio** files
5. **Integrate OpenAI API** for actual transcription
6. **Update Flutter app** to use audio upload