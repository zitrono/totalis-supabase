import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// If .env.test doesn't exist, fall back to .env
if (!process.env.SUPABASE_URL) {
  dotenv.config();
}

// Set test timeout
jest.setTimeout(30000);

// Setup global fetch for tests
require('whatwg-fetch');