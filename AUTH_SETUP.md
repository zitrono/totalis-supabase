# Totalis Authentication Configuration

## 1. Anonymous Authentication
- Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/auth/providers
- Find "Email" provider
- Enable "Allow anonymous sign-ins"

## 2. Google OAuth Setup
- In the same page, find "Google" provider
- Toggle it ON
- Enter these values:

Client ID:
[YOUR_GOOGLE_CLIENT_ID]

Client Secret:
[YOUR_GOOGLE_CLIENT_SECRET]

## 3. Configure Redirect URL
- Copy this redirect URL:
https://qdqbrqnqttyjegiupvri.supabase.co/auth/v1/callback

- Go to: https://console.cloud.google.com/apis/credentials
- Find your OAuth 2.0 Client
- Add the redirect URL to "Authorized redirect URIs"
- Save

## 4. Additional Settings
Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/auth/configuration

- Site URL: http://localhost:3000 (or your app URL)
- Redirect URLs: Add any additional URLs for your app

## 5. Test Authentication
After configuration, test with:
npm run test:auth