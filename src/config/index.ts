import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL || '',
  },
  business: {
    defaultCoach: 'Daniel',
    anonymousUserExpiration: null, // No expiration
    voiceRecordingMaxSeconds: 60,
    checkInRules: {
      aiDriven: true,
      noFixedLimits: true,
    },
  },
  storage: {
    buckets: {
      coachImages: 'coach-images',
      categoryIcons: 'category-icons',
      voiceRecordings: 'voice-recordings',
    },
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'OPENAI_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}