import { config } from 'dotenv'
config()

export const CONFIG = {
  production: {
    host: process.env.PROD_DB_HOST!,
    port: parseInt(process.env.PROD_DB_PORT || '5432'),
    database: process.env.PROD_DB_NAME!,
    user: process.env.PROD_DB_USER!,
    password: process.env.PROD_DB_PASSWORD!,
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
  }
}

export const MIGRATION_CONFIG = {
  batchSize: 100,
  imageUploadTimeout: 30000,
  maxRetries: 3,
  defaultCoachName: 'Daniel',
  storageBuckets: {
    coachImages: 'coach-images',
    categoryIcons: 'category-icons'
  }
}