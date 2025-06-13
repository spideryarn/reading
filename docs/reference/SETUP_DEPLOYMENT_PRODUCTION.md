# Production Deployment Guide

This document covers deploying Spideryarn Reading to production using Vercel with custom domain configuration, environment management, and Supabase integration. It focuses on the complete production setup from initial deployment to custom domain configuration.

## See also

- `docs/reference/SETUP.md` - Development environment setup and local configuration
- `docs/reference/SETUP_SECRETS_AND_ENVIRONMENT_VARIABLES.md` - Environment variable security and configuration
- `docs/reference/AUTHENTICATION_SETUP.md` - OAuth configuration for production domains
- `planning/250613e_Vercel_deployment_initial_setup.md` - Deployment planning and decision context
- [Vercel Domains Documentation](https://vercel.com/docs/projects/domains) - Official Vercel domain configuration
- [Namecheap DNS Management](https://www.namecheap.com/support/knowledgebase/article.aspx/9776/2237/how-to-create-a-subdomain-for-my-domain/) - DNS record configuration

## Principles & Key Decisions

- **Start simple, layer complexity**: Begin with basic Vercel deployment, add custom domain and advanced features incrementally
- **Use platform integrations**: Leverage Vercel-GitHub and Vercel-Supabase integrations for automatic management
- **www as primary domain**: Use `www.spideryarn.com` as primary with apex redirect for better CDN performance
- **Staging uses production database initially**: Simplify initial setup by using one Supabase project for both environments
- **Automatic deployments preferred**: Use Vercel's built-in GitHub integration over manual processes

## Deployment Architecture

### Platform Stack
- **Hosting**: Vercel (Pro plan required for Supabase integration)
- **Domain**: Custom domain (www.spideryarn.com) with apex redirect
- **Database**: Supabase hosted (production project)
- **CI/CD**: Automatic deployment via GitHub integration
- **SSL**: Automatic via Vercel/Let's Encrypt

### Environment Strategy
- **Production**: Custom domain with production Supabase project
- **Preview**: Automatic preview deployments for pull requests
- **Local**: Development environment with local Supabase

## Initial Vercel Setup ✓

### 1. Vercel Account Configuration
- Upgrade to Vercel Pro plan (required for Supabase integration)
- Connect GitHub repository: https://github.com/spideryarn/reading
- Framework preset: Next.js (auto-detected)

### 2. Build Configuration
```bash
# Build settings (configured in Vercel dashboard)
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Node.js Version: 20.x (default)
```

### 3. Essential Environment Variables
Configure these in Vercel dashboard → Settings → Environment Variables:

```bash
# AI/LLM
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
LLM_MODEL=anthropic-balanced  # Production model

# Authentication
NEXTAUTH_URL=https://www.spideryarn.com
NEXTAUTH_SECRET=your-nextauth-secret

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=815353440959-...
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...

# Email/SMTP (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your-email@gmail.com
```

## Supabase Integration ✓

### Vercel-Supabase Integration
1. Install Vercel-Supabase integration from Vercel Marketplace
2. Connect existing Supabase project (blsgjlrezruxcfdyrqpk)
3. Automatic environment variable synchronization:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Supabase Production Configuration
- Site URL: `https://www.spideryarn.com`
- Auth redirect allowlist includes both www and apex domains
- RLS policies configured for production security

## Custom Domain Configuration ✓

### DNS Configuration (Namecheap)

**Required DNS Records:**
```
Type: A
Host: @
Value: 76.76.21.21
TTL: 300 (5 minutes during setup, increase to 3600 after stable)

Type: CNAME  
Host: www
Value: cname.vercel-dns.com
TTL: 300 (5 minutes during setup, increase to 3600 after stable)

Type: CAA (optional, only if existing CAA records exist)
Host: @
Value: 0 issue "letsencrypt.org"
TTL: 300
```

### Vercel Domain Settings
1. Add `www.spideryarn.com` as primary domain
2. Add `spideryarn.com` with redirect to www
3. SSL certificates auto-provision (5-15 minutes after DNS propagation)

### DNS Propagation
- **Typical time**: 1-2 hours globally
- **Check tools**: DNSChecker.org, `dig spideryarn.com`
- **TTL strategy**: Start with 300s, increase to 3600s once stable

## Authentication Configuration ✓

### Google OAuth Setup
**Required redirect URIs** (configured in Google Cloud Console):
- `https://www.spideryarn.com/auth/callback`
- `https://spideryarn.com/auth/callback` (for redirect coverage)
- Keep existing local URI for development

### Supabase Auth Configuration
- Site URL: `https://www.spideryarn.com`
- Additional redirect URLs configured for both www and apex
- Email confirmations and password resets use production domain

## Build & Deployment Process

### Automatic Deployments
- **Production**: Deploys on push to `main` branch
- **Preview**: Creates preview deployments for pull requests
- **Build time**: Typically 2-4 minutes for full build

### Build Requirements 🚧
**Current temporary fixes for deployment:**
- ESLint rules downgraded to warnings (non-blocking)
- TypeScript build errors bypassed with `typescript.ignoreBuildErrors: true`
- Auth pages configured with `export const dynamic = 'force-dynamic'`

**Planned improvements:**
- Restore strict ESLint rules after cleanup
- Fix TypeScript schema mismatches
- Implement proper static/dynamic page optimization

### Deployment Commands
```bash
# Local verification before deployment
npm run build  # Test production build
npm run lint   # Check code quality  
npm test       # Run test suite

# Vercel CLI (optional)
vercel          # Deploy preview
vercel --prod   # Deploy production
vercel env pull # Sync environment variables
```

## Monitoring & Verification

### Post-Deployment Checklist
- [ ] Domain resolves correctly (both www and apex)
- [ ] SSL certificates are valid and auto-renewing
- [ ] Authentication flows work (Google OAuth + email/password)
- [ ] Document upload functionality (PDF and URL)
- [ ] AI features respond correctly (summaries, glossary, chat)
- [ ] Database operations function properly
- [ ] Performance metrics acceptable in Vercel dashboard

### Health Check Endpoints
```bash
# Basic connectivity
curl https://www.spideryarn.com/api/health

# Database connectivity
curl https://www.spideryarn.com/api/auth/me

# AI integration
curl -X POST https://www.spideryarn.com/api/extract-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "provider": "claude"}'
```

## Troubleshooting

### Common DNS Issues
- **Symptom**: Domain not resolving after 24+ hours
- **Solution**: Verify A record points to `76.76.21.21`, CNAME points to `cname.vercel-dns.com`
- **Tools**: Use `dig` or DNSChecker.org for verification

### SSL Certificate Problems
- **Symptom**: "Invalid Configuration" or certificate errors
- **Solution**: Ensure DNS fully propagated before certificate provisioning
- **Workaround**: Remove and re-add domain in Vercel after DNS propagation

### Authentication Failures
- **Symptom**: OAuth redirect errors or login failures
- **Solution**: Verify Google OAuth redirect URIs include production domains
- **Check**: Ensure `NEXTAUTH_URL` environment variable matches primary domain

### Build Failures
- **Symptom**: Deployment fails during build process
- **Common causes**: ESLint violations, TypeScript errors, missing environment variables
- **Solution**: Check Vercel build logs, verify environment variables, test build locally

## Security Considerations

### Environment Variables
- Store all secrets in Vercel environment variables (never in code)
- Use production-appropriate values (not development keys)
- Regularly rotate API keys and authentication secrets

### Domain Security
- SSL certificates auto-renew via Let's Encrypt
- HTTPS redirect enforced by Vercel
- Consider adding HSTS headers in future

### Database Security
- Supabase RLS policies enforce user-level access control
- Service role key restricted to server-side operations only
- Regular security updates via Supabase managed service

## Future Enhancements 📋

### Planned Improvements
- **Staging Environment**: Separate Supabase project for staging deployments
- **Build Optimization**: Restore strict TypeScript and ESLint checking
- **Performance Monitoring**: Implement application performance monitoring
- **Database Migrations**: Automated migration strategy for schema changes
- **Deployment Notifications**: Slack/email notifications for deployment status

### Monitoring Setup
- **Error Tracking**: Consider Sentry integration for error monitoring
- **Performance**: Use Vercel Analytics for performance insights
- **Uptime**: External uptime monitoring service
- **Database**: Supabase built-in monitoring and alerting

## Appendix

### Vercel Project Configuration
- **Project Name**: spideryarn-reading
- **Framework**: Next.js 15
- **Node.js Version**: 20.x LTS
- **Build Output**: Static site with API routes

### Domain Configuration Summary
- **Primary**: www.spideryarn.com
- **Redirect**: spideryarn.com → www.spideryarn.com
- **SSL**: Automatic via Let's Encrypt
- **CDN**: Global edge network via Vercel

### Supabase Production Project
- **Project ID**: blsgjlrezruxcfdyrqpk
- **Region**: US East (default)
- **Database**: PostgreSQL with extensions
- **Storage**: Configured for PDF and HTML uploads