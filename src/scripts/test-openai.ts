import { config } from '../config';

async function testOpenAIConnection() {
  console.log('🔍 Testing OpenAI API Connection...\n');

  const apiKey = config.openai.apiKey;
  
  if (!apiKey) {
    console.error('❌ OpenAI API key not found in configuration');
    return;
  }

  console.log('1️⃣ API Key Status:');
  console.log(`   Key loaded: ✅`);
  console.log(`   Key preview: ${apiKey.substring(0, 15)}...`);

  console.log('\n2️⃣ Testing API Connection:');
  
  try {
    // Test with a simple completion request
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json() as any;
      console.log('   ✅ Successfully connected to OpenAI API');
      console.log(`   Available models: ${data.data.length}`);
      
      // Show some available models
      const gptModels = data.data
        .filter((model: any) => model.id.includes('gpt'))
        .slice(0, 5)
        .map((model: any) => model.id);
      
      console.log(`   GPT Models: ${gptModels.join(', ')}`);
    } else {
      const error = await response.text();
      console.log(`   ❌ API request failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`   ❌ Connection error: ${error}`);
  }

  console.log('\n3️⃣ Testing Whisper & TTS Availability:');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json() as any;
      const whisperModel = data.data.find((model: any) => model.id.includes('whisper'));
      const ttsModel = data.data.find((model: any) => model.id.includes('tts'));
      
      console.log(`   Whisper (Speech-to-Text): ${whisperModel ? '✅ Available' : '❌ Not found'}`);
      console.log(`   TTS (Text-to-Speech): ${ttsModel ? '✅ Available' : '❌ Not found'}`);
    }
  } catch (error) {
    console.log(`   ❌ Could not check model availability`);
  }

  console.log('\n✨ OpenAI API test complete!');
}

testOpenAIConnection().catch(console.error);