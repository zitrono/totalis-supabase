import { TotalisTestClient } from '../index';

export async function runAudioUploadScenario(client: TotalisTestClient) {
  console.log('\n🎤 Running Audio Upload Scenario...\n');

  try {
    // Step 1: Sign in
    console.log('1. Signing in anonymously...');
    const authResult = await client.signInAnonymously();
    console.log(`   ✓ User created: ${authResult.user.id}`);

    // Step 2: Create user profile
    console.log('\n2. Creating user profile...');
    const profile = await client.createUserProfile({
      name: 'Audio Test User',
      dateOfBirth: new Date('1990-01-15'),
      sex: 'male'
    });
    console.log(`   ✓ Profile created: ${profile.name}`);

    // Step 3: Test various audio formats
    console.log('\n3. Testing audio upload with different formats...');
    const formats: Array<'mp3' | 'wav' | 'm4a' | 'ogg' | 'webm'> = ['mp3', 'wav', 'm4a', 'ogg', 'webm'];
    
    for (const format of formats) {
      console.log(`\n   Testing ${format.toUpperCase()} format:`);
      
      // Create mock audio file
      const audioFile = await client.createMockAudioFile(3, format);
      console.log(`   ✓ Created mock ${format} file (${(audioFile.size / 1024).toFixed(2)}KB)`);
      
      // Upload and transcribe
      const transcription = await client.uploadAndTranscribeAudio(audioFile);
      
      console.log(`   ✓ Uploaded and transcribed successfully`);
      console.log(`   ✓ Request ID: ${transcription.requestId}`);
      console.log(`   ✓ Processing time: ${transcription.processingTimeMs}ms`);
      console.log(`   ✓ Transcription: "${transcription.text.substring(0, 50)}..."`);
    }

    // Step 4: Test with language and prompt options
    console.log('\n4. Testing audio upload with language and prompt...');
    const chatAudio = await client.createMockAudioFile(10, 'mp3');
    const chatTranscription = await client.uploadAndTranscribeAudio(
      chatAudio,
      {
        prompt: 'This is a conversation about health and wellness',
        language: 'en'
      }
    );
    console.log(`   ✓ Audio transcribed with options`);
    console.log(`   ✓ Processing time: ${chatTranscription.processingTimeMs}ms`);
    console.log(`   ✓ Transcription: "${chatTranscription.text.substring(0, 50)}..."`);

    // Step 5: Test usage statistics
    console.log('\n5. Retrieving usage statistics...');
    const stats = await client.getAudioUsageStats();
    console.log(`   ✓ Total requests: ${stats.totalRequests}`);
    console.log(`   ✓ Successful: ${stats.successfulRequests}`);
    console.log(`   ✓ Total MB processed: ${stats.totalMbProcessed.toFixed(2)}`);
    console.log(`   ✓ Avg processing time: ${stats.avgProcessingTimeMs}ms`);

    // Step 6: Test file size limit
    console.log('\n6. Testing file size limit (should fail)...');
    try {
      // Create a large file (26MB)
      const largeData = new Uint8Array(26 * 1024 * 1024);
      const largeFile = new File([largeData], 'large.mp3', { type: 'audio/mp3' });
      
      await client.uploadAndTranscribeAudio(largeFile);
      console.log('   ✗ ERROR: Large file was accepted (should have failed)');
    } catch (error: any) {
      console.log(`   ✓ Large file correctly rejected: ${error.message}`);
    }

    // Step 7: Test rate limiting
    console.log('\n7. Testing rate limiting...');
    console.log('   Making 15 rapid requests to test rate limiting...');
    const rateLimitTest = await client.testAudioRateLimit(15);
    console.log(`   ✓ Successful requests: ${rateLimitTest.successful}`);
    console.log(`   ✓ Rate limited requests: ${rateLimitTest.rateLimited}`);
    if (rateLimitTest.errors.length > 0) {
      console.log(`   ⚠ Other errors: ${rateLimitTest.errors.join(', ')}`);
    }

    // Step 8: Test usage logs
    console.log('\n8. Retrieving usage logs...');
    const logs = await client.getAudioUsageLogs(5);
    console.log(`   ✓ Found ${logs.length} usage logs`);
    logs.forEach((log, i) => {
      console.log(`   ${i + 1}. ${new Date(log.created_at).toLocaleString()} - ${(log.file_size / 1024).toFixed(1)}KB - ${log.processing_time_ms}ms`);
    });

    // Step 9: Test optimized audio (simulated compression)
    console.log('\n9. Testing optimized audio format...');
    const audioService = client.getAudioService();
    const rawAudio = await audioService.createMockAudioFile(5, 'wav');
    console.log(`   ✓ Original WAV: ${(rawAudio.size / 1024).toFixed(2)}KB`);
    
    // Simulate compression to MP3
    const optimizedAudio = await audioService.createOptimizedAudioBlob(
      await rawAudio.arrayBuffer(),
      'audio/mp3'
    );
    console.log(`   ✓ Optimized MP3: ${(optimizedAudio.size / 1024).toFixed(2)}KB`);
    console.log(`   ✓ Compression ratio: ${((1 - optimizedAudio.size / rawAudio.size) * 100).toFixed(1)}%`);

    console.log('\n✅ Audio Upload Scenario completed successfully!\n');

    return {
      user: authResult.user,
      profile,
      transcriptions: logs,
      formats: formats
    };

  } catch (error) {
    console.error('\n❌ Audio Upload Scenario failed:', error);
    throw error;
  }
}