# Goal

Deploy Spideryarn Reading to Vercel for the first time with proper integrations for GitHub and Supabase, starting simple and gradually adding complexity.

# Context

Spideryarn Reading is a Next.js 15 application with TypeScript, Tailwind CSS v4 Beta, React 19 RC, and Supabase backend. We need to deploy to production using Vercel's platform with automatic CI/CD from GitHub and Supabase integration for environment variable management.

We have:
- Production Supabase project: https://supabase.com/dashboard/project/blsgjlrezruxcfdyrqpk
- GitHub repository: https://github.com/spideryarn/reading
- Custom domain: spideryarn.com (to be configured in later phase)
- Google OAuth already documented for spideryarn.com redirect URLs

# References

- `docs/reference/ARCHITECTURE_OVERVIEW.md` - Current system architecture with technology stack details
- `docs/reference/SETUP.md` - Development environment setup including environment variables
- `docs/reference/AUTHENTICATION_SETUP.md` - OAuth configuration including spideryarn.com redirect URLs
- `https://github.com/spideryarn/hellozenno` - Previous project with deployment scripts for reference patterns

# Principles & Key Decisions

1. **Start simple, layer complexity** - Begin with basic Vercel deployment, add custom domain and advanced features later
2. **Use platform integrations** - Leverage Vercel-GitHub and Vercel-Supabase integrations for automatic management
3. **Staging uses production database initially** - Simplify by using one Supabase project for both environments
4. **Automatic deployments preferred** - Use Vercel's built-in GitHub integration over manual GitHub Actions
5. **Accept integration limitations** - Vercel-Supabase integration is in Public Alpha, but benefits outweigh risks
6. **TypeScript for future scripts** - When deployment scripts are needed, use TypeScript with Clipanion over Bash

# Stages & Actions

### ✅ Stage: Pre-deployment verification checks
- ✅ Verify React 19 RC and Tailwind v4 Beta compatibility with Vercel's Node.js version
  - 📔 Research completed: React 19 RC + Next.js 15 fully supported on Vercel with Node.js 20/22. Tailwind v4 stable but requires PostCSS migration
- ✅ Audit environment variables to ensure all are properly configured
  - 📔 Created `docs/reference/SETUP_SECRETS_AND_ENVIRONMENT_VARIABLES.md` documenting client vs server variable security
  - 📔 Environment variable exposure verified: NEXT_PUBLIC_ prefix correctly used for client-safe variables
- ❌ Test production build locally
  - 📔 Build FAILS due to schema mismatch in headings API and 200+ ESLint violations
  - 📔 Critical issue: Response schema `{id_of_after, html}` vs storage schema `{id, text, level, parentId?, elementId?}`
  - 📔 Next.js 15 breaking changes mostly resolved (searchParams async, Zod validation, etc)

### ✅ Stage: Vercel account setup
- ✅ Check Vercel pricing plans and determine if Pro upgrade is needed
  - 📔 User upgraded to Vercel Pro plan for Supabase integration support
- ✅ Set up Vercel account using GitHub authentication
  - 📔 Used existing account from Hello Zenno project
- ✅ Create new Vercel team/organization for Spideryarn
  - 📔 New project created with Next.js framework preset

### ✅ Stage: Initial Vercel deployment
- ✅ Connect GitHub repository to Vercel
  - 📔 Repository https://github.com/spideryarn/reading imported successfully
  - 📔 Framework preset: Next.js auto-detected and configured
- ✅ Configure build settings
  - 📔 Build command: `npm run build` (default)
  - 📔 Output directory: `.next` (default)
  - 📔 Install command: `npm install` (default)
  - 📔 Node.js version: Using Vercel default (Node.js 20 LTS)
- ✅ Set essential environment variables manually for first deployment
  - 📔 Added ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, Google OAuth credentials
  - 📔 Skipped LLM_MODEL to use application default (anthropic-balanced in production)
  - 📔 Created .env.prod template and docs/reference/SETUP_SECRETS_AND_ENVIRONMENT_VARIABLES.md
- ✅ Deploy to `[project].vercel.app` domain
  - 📔 Build initially failed due to ESLint violations and auth page dynamic rendering issues
  - 📔 Fixed auth pages (/auth/signup, /auth/profile) by adding `export const dynamic = 'force-dynamic'`
  - 📔 Deployment URL: https://spideryarn-reading-ijkw89kji-greg-detre.vercel.app/
- ❓ Verify basic functionality works
  - 📔 **ISSUE**: Deployment URL showing Vercel login page instead of application
  - 📔 **TODO**: Investigate deployment status and access configuration

### Stage: Supabase integration setup
- [ ] Install Vercel-Supabase integration from Vercel Marketplace
- [ ] Connect existing Supabase project (blsgjlrezruxcfdyrqpk) to Vercel
- [ ] Verify environment variables are synced automatically
  - Check NEXT_PUBLIC_SUPABASE_URL
  - Check NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Check SUPABASE_SERVICE_ROLE_KEY
- [ ] Configure connection pooling if needed (IPv4 support via Supavisor)
- [ ] Redeploy to test integration

### Stage: GitHub integration configuration
- [ ] Verify automatic deployments are working
  - Production deployments on push to main branch
  - Preview deployments for pull requests
- [ ] Test preview deployment with a small PR
- [ ] Verify PR comments show deployment URLs

### Stage: Authentication configuration
- [ ] Verify Google OAuth redirect URLs in Google Cloud Console
  - Add Vercel production URL when known
  - Add wildcard for preview deployments (*.vercel.app)
- [ ] Update Supabase Auth settings for Vercel URLs
  - Site URL should point to production domain
  - Add Vercel URLs to redirect allowlist
- [ ] Test authentication flow on deployed site

### Stage: Post-deployment verification
- [ ] Create comprehensive deployment checklist (new evergreen doc)
- [ ] Run through all major features on production
  - Document upload (PDF and URL)
  - AI features (summaries, glossary, chat)
  - Authentication flows
  - Navigation and UI interactions
- [ ] Check performance metrics in Vercel dashboard
- [ ] Set up basic monitoring/alerts

### Stage: Documentation updates
- [ ] Create new evergreen docs:
  - `docs/reference/DEPLOYMENT_OVERVIEW.md` - Deployment architecture and setup
  - `docs/reference/DEPLOYMENT_CHECKLIST.md` - Pre and post deployment verification steps
  - `docs/reference/DEPLOYMENT_TROUBLESHOOTING.md` - Common issues and solutions
- [ ] Update existing docs:
  - `docs/reference/SETUP.md` - Add production deployment section
  - `docs/reference/AUTHENTICATION_SETUP.md` - Add Vercel-specific OAuth configuration
  - `CLAUDE.md` - Add deployment commands and production considerations
- [ ] Create deployment section in README.md

### Stage: Basic deployment workflow setup
- [ ] Document manual deployment process for emergencies
- [ ] Create simple TypeScript health check script
  - Check main application endpoints
  - Verify Supabase connection
  - Test AI integration
- [ ] Plan future enhancements (but don't implement yet):
  - Staging environment with separate Supabase project
  - Deployment notifications
  - Automated testing in CI/CD
  - Database migration strategy

### 🚧 Stage: Custom domain setup (spideryarn.com)
- [ ] Research Vercel domain configuration best practices
  - Determine optimal subdomain strategy (www vs apex)
  - Plan redirect strategy (apex → www, http → https)
  - Review SSL certificate management
- [ ] Configure DNS settings
  - Add A/AAAA records pointing to Vercel
  - Configure CNAME for www subdomain
  - Verify domain ownership
- [ ] Update Vercel project settings
  - Add custom domain: spideryarn.com
  - Configure redirects (determine www preference)
  - Verify SSL certificate provisioning
- [ ] Update application configuration
  - Update NEXTAUTH_URL environment variable
  - Update Google OAuth redirect URLs
  - Update Supabase Auth settings
- [ ] Test domain functionality
  - Verify domain resolves correctly
  - Test authentication flows
  - Verify all redirects work properly
- [ ] Document domain configuration
  - DNS records and settings
  - Rollback procedures if needed

### Stage: Wrap up initial deployment
- [ ] Review and document lessons learned
- [ ] Update this planning doc with actual outcomes
- [ ] Git commit all documentation changes
- [ ] Move to planning/finished/ when complete

# Appendix

## Vercel-Supabase Integration Details

The integration provides:
- Automatic environment variable synchronization
- Auth redirect URI management for preview deployments
- Unified billing through Vercel
- Multiple Vercel projects can connect to one Supabase project

Current limitations (Public Alpha):
- Database branching doesn't fully work (preview uses production DB)
- Some manual organization management restrictions
- IPv6/connection pooling may need manual configuration

## Build Compatibility Concerns

Our cutting-edge dependencies:
- React 19 RC (Release Candidate)
- Tailwind CSS v4 Beta
- Next.js 15 with App Router

Need to verify Vercel's Node.js version supports these experimental features.

## Environment Variable Migration

Critical variables to migrate from .env.local:
```
# Core
ANTHROPIC_API_KEY
LLM_MODEL (set to production model)

# Supabase (auto-managed by integration)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Auth
NEXTAUTH_URL (will change to production URL)
NEXTAUTH_SECRET

# Google OAuth
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Email/SMTP
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
```

## Deployment Commands Reference

Local testing:
```bash
npm run build        # Test production build
npm run lint         # Check code quality
npm test            # Run test suite
```

Future Vercel CLI usage (if needed):
```bash
vercel              # Deploy preview
vercel --prod       # Deploy production
vercel env pull     # Sync environment variables
```