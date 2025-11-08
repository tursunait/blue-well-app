# Google OAuth Setup Guide

## Why You Need This

The Halo app uses Google OAuth for authentication. Without valid Google OAuth credentials, you cannot sign in or use the app.

## Step-by-Step Setup

### 1. Go to Google Cloud Console

Visit: https://console.cloud.google.com/

### 2. Create or Select a Project

- Click the project dropdown at the top
- Click "New Project"
- Name it "Halo" (or any name you prefer)
- Click "Create"
- Wait for the project to be created, then select it

### 3. Enable Required APIs

1. In the left sidebar, go to **"APIs & Services"** > **"Library"**
2. Search for and enable these APIs:
   - **Google+ API** (or Google Identity API)
   - **Google Calendar API**

### 4. Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, configure the OAuth consent screen first:
   - Choose **"External"** (unless you have a Google Workspace)
   - Fill in:
     - App name: `Halo`
     - User support email: (your email)
     - Developer contact: (your email)
   - Click "Save and Continue" through the steps
   - Add your email as a test user if needed
5. Back to creating OAuth client ID:
   - Application type: **"Web application"**
   - Name: `Halo Local Development`
   - Authorized redirect URIs: Click "ADD URI" and add:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - Click **"Create"**

### 5. Copy Your Credentials

You'll see a popup with:
- **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-xxxxxxxxxxxxx`)

**Copy both of these!**

### 6. Update Your .env.local File

Open `/Users/tusunaiturumbekova/halo/.env.local` and replace:

```bash
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

With your actual credentials:

```bash
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

### 7. Restart Your Development Server

After updating `.env.local`, restart the Next.js server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd /Users/tusunaiturumbekova/halo
pnpm dev:web
```

## Testing

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. You should be redirected to Google's sign-in page
4. Sign in with your Google account
5. You'll be redirected back to the app and can proceed with onboarding

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud Console exactly matches:
  `http://localhost:3000/api/auth/callback/google`
- No trailing slashes!

### "Invalid client"
- Double-check that you copied the Client ID and Secret correctly
- Make sure there are no extra spaces in `.env.local`

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in the OAuth consent screen
- The app is in "Testing" mode, so only test users can sign in

### Changes not taking effect
- Make sure you restarted the Next.js server after updating `.env.local`
- Environment variables are only loaded when the server starts

## Quick Reference

- **Google Cloud Console**: https://console.cloud.google.com/
- **OAuth Credentials**: APIs & Services > Credentials
- **Redirect URI**: `http://localhost:3000/api/auth/callback/google`
- **Required APIs**: Google+ API, Google Calendar API

