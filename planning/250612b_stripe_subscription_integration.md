# Stripe Subscription Integration

## Goal, context

Implement a simple subscription payment system for Spideryarn Reading to enable monetisation of AI-processing features. The goal is to start with the simplest possible approach: users must have an active subscription to access any AI-enhanced functionality (summaries, glossaries, AI-generated headings, chat).

**Current State**: ✅ **Infrastructure Complete** - All core Stripe integration infrastructure has been implemented including database schema, service utilities, API routes, and user signup integration. The system is ready for subscription enforcement and UI development.

**Previous State**: The application had excellent cost tracking infrastructure and Supabase authentication, but no payment system. All AI features are currently free and unrestricted.

**Business Model**: Professional subscription targeting $20/month, with a vision to serve universities, journals, and research companies paying for their employees (see `docs/reference/VISION.md`).

**Start Simple Philosophy**: Begin with payment-required-for-AI-features, then evolve to freemium (first 10 documents free), then usage-based limits (N documents per month).

## References

- `docs/reference/VISION.md` - Business model and target market ($20/month professional subscriptions)
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Existing Supabase Auth system architecture
- `docs/reference/DATABASE_SCHEMA.md` - Current database structure, including `public.profiles` table
- `lib/services/database/ai-calls.ts` - Existing AI cost tracking infrastructure
- `supabase/migrations/20250608000001_add_model_pricing_data.sql` - Model pricing data for future usage-based billing
- `docs/reference/CODING_PRINCIPLES.md` - "Start simple" and "fix root cause" principles
- Next.js 14 Stripe integration best practices from web research
- Supabase + Stripe integration patterns from developer community

## Principles, key decisions

**Payment Architecture**:
- **Stripe Checkout**: Use hosted payment pages for maximum simplicity and fastest implementation
- **Stripe Customer Portal**: Outsource subscription management to Stripe's hosted portal
- **Test Mode First**: Implement and validate with Stripe test mode before production

**Authentication Integration**:
- **Leverage Supabase Auth**: Continue using existing authentication system
- **Store Stripe customer ID in `public.profiles`**: Avoid modifying Supabase's `auth.users` table
- **Webhook-driven updates**: Use Stripe webhooks to update subscription status in Supabase

**Business Model Progression**:
1. **Phase 1 (MVP)**: Payment required for any AI functionality
2. **Phase 2**: First 10 documents free, then payment required
3. **Phase 3**: N free documents per month, subscription for unlimited

**Technical Approach**:
- **Next.js 14 App Router**: Use modern route handlers for webhook endpoints
- **Row Level Security**: Extend existing RLS policies to check subscription status
- **Minimal UI**: Start with basic subscription status indication, evolve to usage tracking

## Stages & actions

### Stage: Environment and dependency setup ✅ COMPLETED
- [x] Install Stripe dependencies
  - [x] `npm install stripe @stripe/stripe-js`
  - [x] Verify compatibility with Next.js 14 and current dependency versions
- [x] Set up environment variables
  - [x] Add Stripe test keys to `.env.local` and `.env.example`
  - [x] Document required environment variables in setup guide
- [ ] Create Stripe test account and configure basic settings
  - [ ] Set up test product/price for $20/month subscription
  - [ ] Configure customer portal settings
  - [ ] Generate test API keys

### Stage: Database schema updates ✅ COMPLETED
- [x] Write and test database migration for subscription tracking
  - [x] Add subscription fields to `public.profiles` table:
    - `stripe_customer_id` (text, nullable)
    - `subscription_status` (text, nullable) - 'active', 'inactive', 'trialing', 'past_due', 'canceled'
    - `subscription_plan` (text, nullable) - for future plan differentiation
    - `subscription_ends_at` (timestamp, nullable) - for trial/billing period tracking
  - [x] Create indexes for efficient querying
  - [x] Update TypeScript types with `npm run db:types`
  - [x] Added helper function `has_active_subscription(UUID)` for subscription checks
- [ ] Write comprehensive tests for subscription data handling
  - [ ] Test subscription status checking logic
  - [ ] Test customer ID linkage
  - [ ] Test RLS policies with subscription context

### Stage: Core Stripe integration infrastructure ✅ COMPLETED
- [x] Create Stripe service utilities
  - [x] `lib/services/stripe/client.ts` - Stripe client configuration with validation
  - [x] `lib/services/stripe/customers.ts` - Customer creation and management
  - [x] `lib/services/stripe/subscriptions.ts` - Subscription management and webhook processing
  - [x] `lib/services/stripe/index.ts` - Centralized exports for all Stripe utilities
- [x] Implement user onboarding integration
  - [x] Update user signup flow to create Stripe customer (both email/password and OAuth)
  - [x] Store Stripe customer ID in `public.profiles` during profile creation
  - [x] Added API route `/api/stripe/create-customer` for client-side customer creation
  - [ ] Handle existing users without Stripe customers (migration utility)
- [x] Create webhook handler foundation
  - [x] `app/api/stripe/webhook/route.ts` - Webhook endpoint with signature verification
  - [x] Handle key subscription events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - [x] Update `public.profiles` subscription status based on webhook events
  - [x] Add comprehensive error handling and logging
- [x] Create additional API routes
  - [x] `app/api/stripe/create-checkout-session/route.ts` - Stripe Checkout session creation
  - [x] `app/api/stripe/create-portal-session/route.ts` - Customer portal session creation
  - [x] Added placeholder key detection and graceful error handling for development

### Stage: Subscription enforcement (MVP - Phase 1)
- [ ] Update AI feature access control
  - [ ] Modify existing AI endpoints to check subscription status before processing
  - [ ] Update `lib/services/database/ai-calls.ts` to verify subscription before AI calls
  - [ ] Add subscription check to summary generation (`/api/summarise`)
  - [ ] Add subscription check to glossary generation (`/api/glossary`)
  - [ ] Add subscription check to AI heading generation
  - [ ] Add subscription check to chat functionality
- [ ] Update database RLS policies
  - [ ] Extend existing RLS policies to include subscription status validation
  - [ ] Ensure AI-generated content is only accessible to subscribers
  - [ ] Test policy enforcement with non-subscriber test accounts
- [ ] Create subscription gate UI components
  - [ ] `components/subscription/SubscriptionGate.tsx` - Block AI features for non-subscribers
  - [ ] `components/subscription/SubscriptionStatus.tsx` - Display current subscription state
  - [ ] Show clear upgrade prompts when AI features are accessed without subscription

### Stage: Payment flow implementation
- [ ] Create checkout flow
  - [ ] `app/api/stripe/create-checkout-session/route.ts` - Create Stripe Checkout sessions
  - [ ] `app/subscribe/page.tsx` - Subscription landing page with pricing
  - [ ] Implement success/cancel return pages
  - [ ] Add subscription CTA throughout application
- [ ] Integrate Stripe Customer Portal
  - [ ] `app/api/stripe/create-portal-session/route.ts` - Generate portal sessions
  - [ ] Add "Manage Subscription" link to user profile dropdown
  - [ ] Handle portal return URLs and session management
- [ ] Test complete payment flow
  - [ ] Test subscription creation with test card (4242 4242 4242 4242)
  - [ ] Test webhook delivery and database updates
  - [ ] Test AI feature access after successful subscription
  - [ ] Test subscription cancellation and access revocation

### Stage: Testing and error handling
- [ ] Write comprehensive integration tests
  - [ ] Test Stripe webhook processing with various event types
  - [ ] Test subscription status enforcement across all AI features
  - [ ] Test user flows: signup → subscribe → access AI features
  - [ ] Test edge cases: failed payments, subscription cancellations, webhooks failures
- [ ] Implement robust error handling
  - [ ] Handle Stripe API errors gracefully
  - [ ] Add retry logic for webhook processing failures
  - [ ] Implement fallback UI states for payment system unavailability
  - [ ] Add comprehensive logging for payment events and errors
- [ ] User testing and validation
  - [ ] Test with multiple users in various subscription states
  - [ ] Validate webhook reliability with Stripe CLI testing
  - [ ] Test customer portal functionality end-to-end

### Stage: Production preparation and monitoring
- [ ] Production configuration
  - [ ] Switch to Stripe live mode configuration
  - [ ] Update environment variables for production
  - [ ] Configure production webhook endpoints
  - [ ] Set up monitoring and alerting for payment failures
- [ ] Documentation updates
  - [ ] Update `docs/reference/AUTHENTICATION_OVERVIEW.md` to include subscription integration
  - [ ] Create `docs/reference/STRIPE_INTEGRATION.md` with operational procedures
  - [ ] Update `CLAUDE.md` with subscription system context
  - [ ] Document troubleshooting procedures for common payment issues
- [ ] Launch preparation
  - [ ] Create communication plan for existing users about subscription requirement
  - [ ] Implement graceful transition period if needed
  - [ ] Set up customer support processes for billing inquiries

### Stage: Phase 2 preparation (Future - Freemium model)
- [ ] Design freemium implementation approach
  - [ ] Define "document" counting logic (what constitutes one document?)
  - [ ] Design usage tracking system leveraging existing AI cost infrastructure
  - [ ] Plan UI for usage limits and upgrade prompts
- [ ] Implementation planning for usage limits
  - [ ] Extend `public.profiles` with usage tracking fields
  - [ ] Create usage enforcement middleware
  - [ ] Design reset mechanisms for monthly limits
- [ ] Stop and review with user before implementing Phase 2

## Appendix

### Research Summary

**Stripe Checkout vs Elements Decision**:
- **Chosen**: Stripe Checkout for maximum simplicity
- **Rationale**: Hosted pages eliminate PCI compliance concerns, provide instant multi-payment method support, and enable fastest implementation
- **Trade-off**: Users briefly leave domain during payment, but conversion difference negligible for MVP

**Supabase + Stripe Integration Pattern**:
- Proven architecture: Supabase handles auth, Stripe handles payments, webhook sync keeps them aligned
- Store Stripe customer ID in application database (not auth.users)
- Use Stripe Customer Portal for self-service subscription management
- Webhook-driven subscription status updates ensure data consistency

**Freemium vs Payment-Required Decision**:
- **Phase 1**: Payment required for any AI features (simplest implementation)
- **Future**: Evolution to freemium with generous limits (10 documents initially)
- **Rationale**: Avoids complex usage tracking and enforcement logic in MVP

### Current Cost Tracking Infrastructure

The application already has sophisticated AI cost tracking:
- Per-model token pricing in database (`supabase/migrations/20250608000001_add_model_pricing_data.sql`)
- Usage calculation in `lib/services/database/ai-calls.ts`
- Full AI call traceability with `ai_calls` table

This infrastructure can be leveraged for future usage-based billing models.

### Environment Variables Required

```
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Product Configuration
STRIPE_PRICE_ID=price_... # Monthly subscription price ID
```

### Test Cards for Development

- Success: 4242 4242 4242 4242
- Declined: 4000 0000 0000 0002
- Requires authentication: 4000 0025 0000 3155

### Key Webhook Events to Handle

1. `customer.subscription.created` - New subscription started
2. `customer.subscription.updated` - Subscription changed (plan, status)
3. `customer.subscription.deleted` - Subscription cancelled
4. `invoice.payment_succeeded` - Successful payment
5. `invoice.payment_failed` - Failed payment

### Alternative Approaches Considered

**Database Storage**:
- **Considered**: Storing subscription data in separate table
- **Chosen**: Adding fields to existing `public.profiles` table
- **Rationale**: Simpler queries, leverages existing RLS policies, reduces join complexity

**Payment Enforcement**:
- **Considered**: Frontend-only enforcement
- **Chosen**: Database-level RLS policy enforcement
- **Rationale**: Security-first approach, prevents API bypass, follows existing patterns

**Trial Period**:
- **Considered**: 14-day free trial with full access
- **Chosen**: Immediate payment requirement for MVP
- **Rationale**: Simpler implementation, clearer user expectations, easier to add trials later