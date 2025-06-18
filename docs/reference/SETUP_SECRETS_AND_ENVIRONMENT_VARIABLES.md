# Secrets and Environment Variables

Environment variable configuration for Spideryarn Reading, covering client-side exposure, security practices, and production deployment.

## See also

- `docs/reference/SETUP.md` - Complete development environment setup
- `docs/reference/AUTHENTICATION_SETUP.md` - OAuth and authentication-specific environment variables
- `.env.local` - Local development environment variables (not committed to git)
- `.env.example` - Template for environment variables

## Client-Side Exposure Security

**Critical Security Rule**: Variables prefixed with `NEXT_PUBLIC_` are embedded in the browser JavaScript bundle and visible to users.

**✅ Safe for client (NEXT_PUBLIC_ prefix)**:
- `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key for database access

**❌ Must stay server-only (no NEXT_PUBLIC_ prefix)**:
- `ANTHROPIC_API_KEY` - AI service credentials
- `GOOGLE_GENERATIVE_AI_API_KEY` - AI service credentials
- `GOOGLE_OAUTH_CLIENT_SECRET` - OAuth authentication secret
- `SUPABASE_SERVICE_ROLE_KEY` - Administrative database access
- `GMAIL_SMTP_PASSWORD` - Email service credentials

## Environment Files

**NEVER modify, overwrite, or delete** `.env.*` files without explicit user permission

### Local Development
- **File**: `.env.local` (not committed to git)
- **Purpose**: Local development with Supabase local instance
- **LLM Model**: Uses `google-cheap` for development speed and cost

### Production Template
- **File**: `.env.prod` (template, values filled manually)
- **Purpose**: Production deployment environment variables
- **LLM Model**: Uses production-grade models

## Production Environment Variables

For Vercel deployment, manually configure these in the Vercel dashboard:

**Core Application**:
- `LLM_MODEL=anthropic-balanced` (production model)
- `ANTHROPIC_API_KEY=<your-production-key>`
- `GOOGLE_GENERATIVE_AI_API_KEY=<your-production-key>`

**Supabase (auto-managed by Vercel-Supabase integration)**:
- `NEXT_PUBLIC_SUPABASE_URL=<production-supabase-url>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY=<production-service-key>`

**Authentication**:
- `GOOGLE_OAUTH_CLIENT_ID=<same-as-development>`
- `GOOGLE_OAUTH_CLIENT_SECRET=<same-as-development>`

## Security Best Practices

1. **Never commit sensitive values** to git
2. **Use environment-specific values** (development vs production keys)
3. **Rotate secrets regularly** especially for production
4. **Verify client exposure** - check browser dev tools for accidental exposure
5. **Use Vercel-Supabase integration** for automatic environment variable management

## LLM Model Configuration

**Development**: `LLM_MODEL=google-cheap` (Gemini Flash - fast and cost-effective)  
**Production**: `LLM_MODEL=anthropic-balanced` (Claude Sonnet 4 - quality and performance)

See `docs/reference/LLM_MODEL_CONFIGURATION.md` for complete model comparison and configuration options.

---

*Last updated: June 2025*  
*Configuration Status: Development ✅, Production Template Ready 📋*