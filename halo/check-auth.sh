#!/bin/bash
echo "🔍 Checking Halo Authentication Setup..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local file not found!"
  exit 1
fi

# Check Google OAuth credentials
GOOGLE_CLIENT_ID=$(grep GOOGLE_CLIENT_ID .env.local | cut -d '=' -f2)
GOOGLE_CLIENT_SECRET=$(grep GOOGLE_CLIENT_SECRET .env.local | cut -d '=' -f2)

if [ "$GOOGLE_CLIENT_ID" = "your-google-client-id-here" ] || [ -z "$GOOGLE_CLIENT_ID" ]; then
  echo "❌ Google OAuth Client ID not configured!"
  echo "   Current value: $GOOGLE_CLIENT_ID"
  echo ""
  echo "📖 See GOOGLE_OAUTH_SETUP.md for instructions"
  exit 1
fi

if [ "$GOOGLE_CLIENT_SECRET" = "your-google-client-secret-here" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ Google OAuth Client Secret not configured!"
  echo "   Current value: $GOOGLE_CLIENT_SECRET"
  echo ""
  echo "📖 See GOOGLE_OAUTH_SETUP.md for instructions"
  exit 1
fi

echo "✅ Google OAuth credentials are configured"
echo "   Client ID: ${GOOGLE_CLIENT_ID:0:30}..."
echo ""
echo "🚀 You're ready to sign in!"
echo "   Visit: http://localhost:3000"
