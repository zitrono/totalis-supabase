# Secure Audio Transcription API

## Overview

The audio transcription Edge Function provides a secure server-side integration with OpenAI's Whisper API, keeping API keys protected while enabling mobile and web clients to transcribe audio.

## Security Features

### 1. Server-Side API Key Storage
- OpenAI API key stored in environment variables (`OPENAI_API_KEY`)
- Never exposed to client applications
- Protected from mobile app reverse engineering

### 2. Authentication Required
- All requests must include valid Supabase JWT token
- User authentication verified before processing
- Automatic user context from auth token

### 3. Rate Limiting
- **Default**: 10 requests per minute per user
- Prevents abuse and controls costs
- Returns `429 Too Many Requests` with `Retry-After` header

### 4. Usage Analytics & Billing
- Every request logged with unique `requestId`
- Tracks file size, processing time, and success rate
- Built-in analytics views for user and admin dashboards

## API Endpoint

```
POST /functions/v1/audio-transcribe
```

## Request Format

### Headers
```
Authorization: Bearer <supabase-jwt-token>
Content-Type: multipart/form-data
```

### Form Data Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| audio | File | Yes | Audio file to transcribe |
| prompt | String | No | Optional context to improve accuracy |
| language | String | No | Language code (e.g., 'en', 'es') |

### Supported Audio Formats
- webm (recommended for web)
- m4a (recommended for iOS)
- mp3 (universal compatibility)
- wav (highest quality)
- ogg
- flac

### File Size Limit
- Maximum: 25MB (OpenAI Whisper limit)

## Response Format

### Success Response (200)
```json
{
  "text": "Transcribed text content",
  "requestId": "uuid-v4",
  "processingTimeMs": 1234
}
```

### Error Responses

#### Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

#### File Too Large (400)
```json
{
  "error": "File too large",
  "maxSize": "25MB"
}
```

#### Unsupported Format (400)
```json
{
  "error": "Unsupported audio format",
  "supportedFormats": ["webm", "m4a", "mp3", "wav", "ogg", "flac"]
}
```

#### Service Unavailable (503)
```json
{
  "error": "Service temporarily unavailable"
}
```

## Client Implementation Examples

### Flutter/Dart
```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:dio/dio.dart';

Future<String> transcribeAudio(File audioFile) async {
  final supabase = Supabase.instance.client;
  
  // Prepare form data
  final formData = FormData.fromMap({
    'audio': await MultipartFile.fromFile(
      audioFile.path,
      filename: 'recording.mp3',
    ),
    'prompt': 'Medical consultation about wellness',
    'language': 'en',
  });
  
  // Call edge function
  final response = await supabase.functions.invoke(
    'audio-transcribe',
    body: formData,
  );
  
  if (response.error != null) {
    throw Exception(response.error!.message);
  }
  
  return response.data['text'];
}
```

### JavaScript/TypeScript
```typescript
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('language', 'en');
  
  const { data, error } = await supabase.functions.invoke('audio-transcribe', {
    body: formData
  });
  
  if (error) throw error;
  return data.text;
}
```

### Swift (iOS)
```swift
func transcribeAudio(audioData: Data) async throws -> String {
    let formData = MultipartFormData()
    formData.append(
        audioData, 
        withName: "audio", 
        fileName: "recording.m4a", 
        mimeType: "audio/m4a"
    )
    
    let response = try await supabase.functions
        .invoke("audio-transcribe", body: formData)
    
    guard let text = response.data?["text"] as? String else {
        throw TranscriptionError.invalidResponse
    }
    
    return text
}
```

## Usage Analytics

### User Statistics Function
```sql
SELECT * FROM get_user_audio_usage(auth.uid());
```

Returns:
- `total_requests`: Total transcription requests
- `successful_requests`: Successful transcriptions
- `total_mb_processed`: Total MB of audio processed
- `total_minutes_audio`: Estimated minutes transcribed
- `total_characters`: Total characters in transcriptions
- `avg_processing_time_ms`: Average processing time

### Admin Analytics View
```sql
SELECT * FROM admin_audio_analytics
ORDER BY hour DESC
LIMIT 24;
```

## Cost Optimization

### Recommended Audio Settings
- **Format**: MP3
- **Sample Rate**: 16kHz (mono)
- **Bitrate**: 32kbps
- **Result**: ~240KB per minute of audio

### Client-Side Compression
```javascript
// Example using Web Audio API
async function compressAudio(audioBlob: Blob): Promise<Blob> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Downsample to mono
  const monoBuffer = audioContext.createBuffer(
    1, 
    audioBuffer.length, 
    16000
  );
  
  // ... compression logic
  
  return new Blob([compressedData], { type: 'audio/mp3' });
}
```

## Database Schema

### Usage Logs Table
```sql
CREATE TABLE audio_usage_logs (
  id UUID PRIMARY KEY,
  request_id UUID UNIQUE,
  user_id UUID REFERENCES auth.users,
  file_size INTEGER,
  mime_type TEXT,
  processing_time_ms INTEGER,
  transcription_length INTEGER,
  success BOOLEAN,
  created_at TIMESTAMPTZ
);
```

## Deployment

### Environment Variables Required
```bash
OPENAI_API_KEY=sk-...  # Your OpenAI API key
```

### Deploy Function
```bash
npx supabase functions deploy audio-transcribe
npx supabase secrets set OPENAI_API_KEY=your-key-here
```

## Monitoring & Alerts

### Check Failed Requests
```sql
SELECT 
  date_trunc('hour', created_at) as hour,
  COUNT(*) as failed_count
FROM audio_usage_logs
WHERE success = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Monitor Rate Limiting
Check Edge Function logs for rate limit violations to adjust limits if needed.

## Security Best Practices

1. **Never expose API keys** - Always use server-side functions
2. **Validate file types** - Check MIME types and file extensions
3. **Implement rate limiting** - Prevent abuse and control costs
4. **Log all requests** - For security auditing and billing
5. **Use HTTPS only** - All requests must be encrypted
6. **Rotate API keys** - Regular key rotation for security

## Troubleshooting

### Common Issues

1. **"Service temporarily unavailable"**
   - Check if `OPENAI_API_KEY` is set correctly
   - Verify OpenAI API status

2. **"Rate limit exceeded"**
   - Wait for the time specified in `retryAfter`
   - Implement client-side request queuing

3. **"File too large"**
   - Compress audio before uploading
   - Split long recordings into chunks

4. **Poor transcription quality**
   - Use the `prompt` parameter for context
   - Ensure good audio quality
   - Specify the correct `language`