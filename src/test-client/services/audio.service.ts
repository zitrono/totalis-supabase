import { SupabaseClient } from '@supabase/supabase-js';

export interface AudioTranscriptionResponse {
  text: string;
  requestId: string;
  processingTimeMs: number;
}

export interface AudioUsageStats {
  totalRequests: number;
  successfulRequests: number;
  totalMbProcessed: number;
  totalMinutesAudio: number;
  totalCharacters: number;
  avgProcessingTimeMs: number;
}

export class TestAudioService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Upload audio file and get transcription from OpenAI Whisper
   * @param audioFile - Audio file (webm, m4a, mp3, wav, ogg, flac)
   * @param options - Optional parameters for transcription
   */
  async uploadAndTranscribe(
    audioFile: File | Blob,
    options?: {
      prompt?: string;      // Optional prompt to guide transcription
      language?: string;    // Optional language hint (e.g., 'en', 'es')
    }
  ): Promise<AudioTranscriptionResponse> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Validate file size (25MB limit)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (audioFile.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is 25MB, got ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('audio', audioFile);
    if (options?.prompt) formData.append('prompt', options.prompt);
    if (options?.language) formData.append('language', options.language);

    // Call edge function
    const { data, error } = await this.supabase.functions.invoke<AudioTranscriptionResponse>('audio-transcribe', {
      body: formData
    });

    if (error) {
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }

    if (!data) {
      throw new Error('No transcription data received');
    }

    return data;
  }

  /**
   * Get user's audio usage statistics for the current month
   */
  async getUsageStats(month?: Date): Promise<AudioUsageStats> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Call the database function to get usage stats
    const { data, error } = await this.supabase.rpc('get_user_audio_usage', {
      p_user_id: user.id,
      p_month: month || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    });

    if (error) {
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // Return zero stats if no usage
      return {
        totalRequests: 0,
        successfulRequests: 0,
        totalMbProcessed: 0,
        totalMinutesAudio: 0,
        totalCharacters: 0,
        avgProcessingTimeMs: 0
      };
    }

    const stats = data[0];
    return {
      totalRequests: stats.total_requests || 0,
      successfulRequests: stats.successful_requests || 0,
      totalMbProcessed: parseFloat(stats.total_mb_processed) || 0,
      totalMinutesAudio: parseFloat(stats.total_minutes_audio) || 0,
      totalCharacters: stats.total_characters || 0,
      avgProcessingTimeMs: stats.avg_processing_time_ms || 0
    };
  }

  /**
   * Get detailed usage logs
   */
  async getUsageLogs(limit: number = 20): Promise<any[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: logs, error } = await this.supabase
      .from('audio_usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get usage logs: ${error.message}`);
    }

    return logs || [];
  }

  /**
   * Create a compressed audio file for optimal API performance
   * Recommended: MP3 format, 32kbps, 16kHz mono
   */
  async createOptimizedAudioBlob(
    audioData: ArrayBuffer | Blob,
    mimeType: string = 'audio/mp3'
  ): Promise<Blob> {
    // In a real implementation, this would use Web Audio API or a library
    // to compress and optimize the audio. For testing, we'll just return
    // the input as a Blob
    if (audioData instanceof Blob) {
      return audioData;
    }
    return new Blob([audioData], { type: mimeType });
  }

  /**
   * Simulate audio recording for testing
   */
  async createMockAudioFile(
    durationSeconds: number = 5,
    format: 'mp3' | 'wav' | 'm4a' | 'ogg' | 'webm' = 'mp3'
  ): Promise<File> {
    // Create a valid WAV file with proper header
    const sampleRate = 16000; // 16kHz as recommended
    const numSamples = sampleRate * durationSeconds;
    const bytesPerSample = 2; // 16-bit
    const dataSize = numSamples * bytesPerSample;
    const fileSize = 44 + dataSize; // WAV header is 44 bytes
    
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    
    // WAV header
    // ChunkID
    view.setUint32(0, 0x52494646, false); // "RIFF"
    // ChunkSize
    view.setUint32(4, fileSize - 8, true);
    // Format
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // Subchunk1ID
    view.setUint32(12, 0x666d7420, false); // "fmt "
    // Subchunk1Size
    view.setUint32(16, 16, true);
    // AudioFormat (PCM)
    view.setUint16(20, 1, true);
    // NumChannels
    view.setUint16(22, 1, true);
    // SampleRate
    view.setUint32(24, sampleRate, true);
    // ByteRate
    view.setUint32(28, sampleRate * bytesPerSample, true);
    // BlockAlign
    view.setUint16(32, bytesPerSample, true);
    // BitsPerSample
    view.setUint16(34, 16, true);
    // Subchunk2ID
    view.setUint32(36, 0x64617461, false); // "data"
    // Subchunk2Size
    view.setUint32(40, dataSize, true);
    
    // Generate audio data (440Hz tone)
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.floor(32767 * Math.sin(2 * Math.PI * 440 * i / sampleRate));
      view.setInt16(44 + i * 2, sample, true);
    }

    // Always create WAV format since it's the most reliable for testing
    const mimeType = 'audio/wav';
    const fileName = format === 'wav' ? `test_audio.wav` : `test_audio.${format}`;
    const blob = new Blob([buffer], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
  }

  /**
   * Test rate limiting by making multiple rapid requests
   */
  async testRateLimit(numRequests: number = 15): Promise<{ 
    successful: number; 
    rateLimited: number; 
    errors: string[] 
  }> {
    const results = {
      successful: 0,
      rateLimited: 0,
      errors: [] as string[]
    };

    // Create a small audio file for testing
    const audioFile = await this.createMockAudioFile(1, 'mp3');

    // Make rapid requests
    const promises = Array(numRequests).fill(0).map(async (_, i) => {
      try {
        await this.uploadAndTranscribe(audioFile);
        results.successful++;
      } catch (error: any) {
        if (error.message.includes('Rate limit exceeded')) {
          results.rateLimited++;
        } else {
          results.errors.push(error.message);
        }
      }
    });

    await Promise.all(promises);
    return results;
  }
}