# Authentication Setup Guide

Complete configuration guide for setting up authentication in Spideryarn Reading, including local development, production deployment, and third-party service integrations.

## See also

- `docs/reference/AUTHENTICATION_OVERVIEW.md` - High-level authentication system architecture and decisions
- `docs/reference/AUTHENTICATION_UI.md` - User interface components and authentication pages
- `docs/reference/AUTHENTICATION_DATABASE.md` - Database integration and user profile management
- `docs/reference/AUTHENTICATION_SECURITY.md` - Security best practices and troubleshooting
- `supabase/config.toml` - Local Supabase configuration file
- `.env.local` - Local environment variables (not committed to git)

## Prerequisites

- Node.js 18+ installed
- Supabase CLI installed: `npm install -g @supabase/cli`
- Google account for Gmail SMTP and OAuth setup
- Supabase account for production deployment

## Local Development Setup

### 1. Start Local Supabase

```bash
# Start all Supabase services
npx supabase start

# Verify services are running
npx supabase status
```

**Available Services**:
- **API**: http://127.0.0.1:54341
- **Studio**: http://127.0.0.1:54343 (database management)
- **Inbucket**: http://127.0.0.1:54344 (email testing)

### 2. Environment Variables

Create `.env.local` file with local Supabase credentials:

```bash
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54341
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Development server port
PORT=3002
```

### 3. Test Local Authentication

```bash
# Start Next.js development server
npm run dev

# Test authentication at:
# - Login: http://localhost:3002/auth/login
# - Signup: http://localhost:3002/auth/signup
# - Profile: http://localhost:3002/auth/profile
```

## Google OAuth Setup

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **OAuth Client ID**
4. Select **Web application** as application type

**Authorized JavaScript Origins**:
```
http://localhost:3002
https://www.spideryarn.com
https://spideryarn.com
https://[your-project-id].supabase.co
```

**Authorized Redirect URIs**:
```
http://127.0.0.1:54341/auth/v1/callback  # Local development
https://[your-project-id].supabase.co/auth/v1/callback  # Production
```

### 2. OAuth Consent Screen

**Configure Consent Screen**:
1. Go to **OAuth consent screen** in Google Cloud Console
2. Add **Authorized domains**:
   - `[your-project-id].supabase.co`
   - `spideryarn.com` (for production)

**Required Scopes**:
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`
- `openid`

### 3. Add OAuth Credentials to Environment

Add your Google OAuth credentials to `.env.local`:

```bash
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret-here
```

## Gmail SMTP Configuration (Password Reset)

### 1. Enable Gmail App Passwords

**Prerequisites**: Gmail account with 2-Factor Authentication enabled

**Steps**:
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select **Mail** and **Other (custom name)**
5. Enter "Spideryarn" as the app name
6. Copy the generated 16-character password

### 2. Add Gmail Credentials to Environment

Add your Gmail credentials to `.env.local`:

```bash
# Gmail SMTP for password reset emails
GMAIL_SMTP_USER=your-email@gmail.com
GMAIL_SMTP_PASSWORD=your-16-char-app-password
```

### 3. Test Password Reset Flow

```bash
# Restart Supabase to apply SMTP configuration
npx supabase stop && npx supabase start

# Test password reset at:
# http://localhost:3002/auth/reset-password
```

**Email Testing**: View sent emails at http://127.0.0.1:54344 (Inbucket)

## Production Deployment

### 1. Supabase Production Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project or use existing
3. Note your project ID and credentials

### 2. Production Environment Variables

Configure production environment with Supabase production credentials:

```bash
# Production Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-production-anon-key]

# Same OAuth and SMTP credentials work for production
GOOGLE_OAUTH_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret-here
GMAIL_SMTP_USER=your-email@gmail.com
GMAIL_SMTP_PASSWORD=your-16-char-app-password

# Other production variables
ANTHROPIC_API_KEY=[your-production-anthropic-key]
GOOGLE_GENERATIVE_AI_API_KEY=[your-production-google-key]
```

### 3. Supabase Dashboard Configuration

**URL Configuration** (Authentication → URL Configuration):
- **Site URL**: `https://www.spideryarn.com`
- **Additional Redirect URLs**:
  ```
  http://localhost:3002/**
  https://www.spideryarn.com/**
  https://spideryarn.com/**
  https://*.vercel.app/**
  ```

**Google OAuth Provider** (Authentication → Providers → Google):
- **Enable**: Toggle ON
- **Client ID**: Your Google OAuth client ID
- **Client Secret**: Your Google OAuth client secret

### 4. Database Migration

Link local project to production and apply migrations:

```bash
# Link to production project
npx supabase link --project-ref [your-project-id]

# Push local migrations to production
npx supabase db push

# Verify migration status
npx supabase migration list
```

### 5. Domain Configuration

**Production Domain Strategy**:
- **Canonical Domain**: `www.spideryarn.com`
- **Apex Redirect**: `spideryarn.com` → `www.spideryarn.com`
- **OAuth Site URL**: `https://www.spideryarn.com`

## Development Workflow

### Daily Development

```bash
# Start all services
npx supabase start
npm run dev

# Useful development URLs
open http://localhost:3002              # Application
open http://127.0.0.1:54343            # Supabase Studio
open http://127.0.0.1:54344            # Email testing
```

### Debugging Tools

**Supabase Studio**: http://127.0.0.1:54343
- User management and authentication logs
- Database table inspection
- Real-time subscription monitoring

**Inbucket Email Testing**: http://127.0.0.1:54344
- View all outgoing emails locally
- Test password reset and notification emails
- Debug email template rendering

**Supabase Logs**:
```bash
# View all logs
npx supabase logs

# View auth-specific logs
npx supabase logs --type auth

# Follow logs in real-time
npx supabase logs --follow
```

## Troubleshooting Setup Issues

### Common Local Development Issues

**Supabase won't start**:
```bash
# Reset Docker containers
npx supabase stop
docker system prune -f
npx supabase start
```

**Port conflicts**:
- Check `supabase/config.toml` port settings
- Ensure no other services using ports 54341-54344
- Modify ports if needed and restart

**Authentication not working**:
- Verify `.env.local` has correct Supabase URL and anon key
- Check middleware.ts is properly configured
- Ensure cookies are enabled in browser

### OAuth Configuration Issues

**Google OAuth redirect errors**:
- Verify redirect URIs match exactly in Google Cloud Console
- Check Supabase site URL configuration
- Ensure both local and production URIs are configured

**SMTP email issues**:
- Confirm Gmail app password is correctly generated
- Verify 2FA is enabled on Gmail account
- Check SMTP credentials in environment variables
- Test with Inbucket (local) before production

### Production Deployment Issues

**Environment variables not working**:
- Verify all production environment variables are set
- Check hosting platform environment variable configuration
- Ensure sensitive values are properly escaped

**Domain redirect issues**:
- Confirm DNS settings for apex domain redirect
- Verify SSL certificates for both domains
- Test OAuth flows from both apex and www domains

---

*Last updated: 6 June 2025*  
*Configuration Status: Local ✅, Production Documentation Complete ✅*  
*Next review: After first production deployment*