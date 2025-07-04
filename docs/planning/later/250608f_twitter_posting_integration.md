# Twitter Posting Integration

## Goal, context

Implement the ability for users to post AI-generated tweet threads to Twitter/X directly from our application. This will be implemented in two phases: Phase 1 using direct Twitter API integration for learning and validation, followed by Phase 2 migration to a third-party service like Ayrshare for cost efficiency and enhanced features.

The existing tweet thread generation feature provides the content foundation - we need to add authentication and posting capabilities while navigating Twitter's expensive API pricing model.

## References

- `docs/reference/TOOL_TWEET_THREAD_VIEW.md` - Documents existing tweet thread generation and UI components
- `components/tweet-thread-view.tsx` - Current tweet thread display component
- `app/api/tweet-thread/route.ts` - API endpoint for generating thread content
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Current Supabase authentication system
- `docs/planning/250608e_bluesky_posting_integration.md` - Parallel Bluesky implementation for comparison

## Principles, key decisions

- **Two-phase approach**: Start with direct API to understand requirements, then migrate to cost-effective third-party service
- **Separate authentication**: Twitter OAuth separate from main site authentication (Supabase)
- **Cost-conscious development**: Monitor API usage carefully due to expensive pricing ($200/month minimum)
- **User transparency**: Clear indication of posting costs and limitations
- **Graceful degradation**: Feature remains optional, app works without Twitter integration

## Stages & actions

### Stage: Phase 1 - Direct Twitter API Research and Foundation
- [ ] Run `./scripts/sync-worktrees.ts` to sync with latest changes
- [ ] Deep research on Twitter API v2 implementation (use subagent)
  - [ ] Confirm current pricing tiers and quota structure
  - [ ] Study OAuth 2.0 User Context authentication
  - [ ] Understand thread posting via reply chaining
  - [ ] Research rate limits and posting restrictions
  - [ ] Investigate quota tracking and monitoring
- [ ] Set up Twitter Developer Account
  - [ ] Apply for developer access
  - [ ] Create application and obtain API keys
  - [ ] Configure OAuth 2.0 app permissions
- [ ] Install Twitter API dependencies
  - [ ] Research and select appropriate Node.js Twitter library
  - [ ] Install and configure for development
- [ ] Design database schema for Twitter account linking
  - [ ] Plan token storage and refresh mechanisms
  - [ ] Design quota tracking and usage monitoring
- [ ] Update planning doc with Phase 1 research findings
- [ ] Commit Phase 1 foundation work (use subagent)

### Stage: Phase 1 - Twitter Authentication Implementation
- [ ] Implement Twitter OAuth 2.0 flow
  - [ ] Create "Link Twitter Account" UI in user settings
  - [ ] Build OAuth callback handling
  - [ ] Implement secure token storage and refresh
- [ ] Add Twitter account management
  - [ ] Display linked account status
  - [ ] Show usage statistics and quotas
  - [ ] Provide account disconnection option
- [ ] Implement quota monitoring system
  - [ ] Track app-level usage against monthly limits
  - [ ] Monitor per-user posting limits
  - [ ] Alert systems for approaching quotas
- [ ] Write tests for Twitter authentication
  - [ ] Test OAuth flow and token management
  - [ ] Test quota tracking accuracy
  - [ ] Test error handling scenarios
- [ ] Manual testing with Twitter Developer Account
- [ ] Update planning doc with authentication progress
- [ ] Commit Twitter authentication (use subagent)

### Stage: Phase 1 - Twitter Thread Posting
- [ ] Implement thread posting logic
  - [ ] Convert existing thread format to Twitter posts
  - [ ] Handle 280-character limit and text optimization
  - [ ] Implement reply-chain threading (no native thread API)
  - [ ] Add proper error handling and retry logic
- [ ] Extend tweet thread UI for Twitter posting
  - [ ] Add "Post to Twitter" button
  - [ ] Show posting progress and quota usage
  - [ ] Display posting costs and limitations to user
- [ ] Implement posting API endpoint
  - [ ] Add Twitter posting to existing thread generation API
  - [ ] Handle authentication checks and quota validation
  - [ ] Return posting results and any errors
- [ ] Write comprehensive tests
  - [ ] Test thread posting logic and error scenarios
  - [ ] Test quota enforcement and user limits
  - [ ] Test UI state management during posting
- [ ] Manual testing with real Twitter account
  - [ ] Post test threads and verify formatting
  - [ ] Test edge cases and error conditions
- [ ] Update planning doc with Phase 1 completion status
- [ ] Commit Phase 1 implementation (use subagent)

### Stage: Phase 2 - Third-Party Service Research
- [ ] Comprehensive third-party service evaluation (use subagent)
  - [ ] Deep dive into Ayrshare capabilities and pricing
  - [ ] Research Hootsuite, Buffer, and other alternatives
  - [ ] Compare feature sets, API quality, and costs
  - [ ] Evaluate threading support and automation features
- [ ] Cost-benefit analysis
  - [ ] Calculate break-even points vs direct API
  - [ ] Project usage patterns and scaling scenarios
  - [ ] Assess total cost of ownership including development time
- [ ] Technical integration research for selected service
  - [ ] Study API documentation and SDKs
  - [ ] Understand authentication patterns and token management
  - [ ] Review rate limits and posting capabilities
- [ ] Architecture planning for migration
  - [ ] Design abstraction layer for posting services
  - [ ] Plan gradual migration strategy
  - [ ] Identify code reuse opportunities from Phase 1
- [ ] Update planning doc with Phase 2 service selection and rationale
- [ ] Commit Phase 2 research (use subagent)

### Stage: Phase 2 - Third-Party Service Integration
- [ ] Implement abstraction layer
  - [ ] Create posting service interface
  - [ ] Abstract authentication patterns
  - [ ] Design provider-agnostic error handling
- [ ] Integrate selected third-party service
  - [ ] Install SDKs and configure credentials
  - [ ] Implement authentication flow for service
  - [ ] Build posting logic using service APIs
- [ ] Migrate existing Twitter functionality
  - [ ] Update UI to support multiple posting providers
  - [ ] Migrate user preferences and settings
  - [ ] Preserve existing linked Twitter accounts where possible
- [ ] Enhanced features via third-party service
  - [ ] Implement automatic thread numbering
  - [ ] Add multi-platform posting capabilities
  - [ ] Integrate analytics and posting insights
- [ ] Testing and validation
  - [ ] Test posting quality and thread formatting
  - [ ] Verify cost savings and improved reliability
  - [ ] Compare user experience vs Phase 1 implementation
- [ ] Update documentation and user guidance
  - [ ] Document new posting capabilities
  - [ ] Update cost structure and user benefits
- [ ] Update planning doc with Phase 2 completion
- [ ] Commit Phase 2 implementation (use subagent)

### Stage: Production Deployment and Monitoring
- [ ] Deploy Twitter posting to production
- [ ] Monitor usage patterns and costs
  - [ ] Track API quota usage vs third-party service costs
  - [ ] Monitor posting success rates and error patterns
  - [ ] Gather user feedback on posting experience
- [ ] Optimize based on real usage data
  - [ ] Adjust rate limiting and quota management
  - [ ] Improve error handling based on common failures
  - [ ] Enhance UI based on user feedback
- [ ] Document lessons learned
  - [ ] Compare Phase 1 vs Phase 2 approaches
  - [ ] Update architectural decisions documentation
  - [ ] Record recommendations for future social platform integrations
- [ ] Plan future enhancements
  - [ ] Consider adding more social platforms
  - [ ] Evaluate advanced features like scheduling
  - [ ] Assess integration with analytics platforms
- [ ] Move planning doc to `docs/planning/finished/` and commit

# Appendix

## Twitter API Research Transcript

### Current API Pricing and Quotas (2025)

**Pricing Tiers (Updated Late 2024):**
- **Free Tier**: $0/month - 500 posts/month (app-level), 50 posts/24hrs per user
- **Basic Tier**: $200/month (up from $100) - 10,000 posts/month (app-level), 3,000 posts/month per user
- **Pro Tier**: $5,000/month - 300,000 posts/month
- **Enterprise**: $42,000+/month - 50M+ posts/month

**Quota Structure:**
- **App-level limits**: Your application's total monthly posting allowance
- **Per-user limits**: Individual user limits that apply across ALL apps they've authorized
- **Both limits enforced**: Every post must satisfy both app quota AND user quota
- **Rate limits**: Short-term limits (per 15 minutes) in addition to monthly quotas

### Threading Implementation Requirements

**No Native Thread API:**
- Must create threads by posting sequential replies
- Process: Post first tweet → get tweet ID → post replies using `in_reply_to_status_id`
- Each reply must reference the previous tweet to maintain thread structure
- Error handling critical - failed mid-thread posts break the sequence

### Authentication and OAuth

**OAuth 2.0 User Context Required:**
- App-only Bearer Token authentication forbidden for posting
- Must use OAuth 2.0 User Context or OAuth 1.0a
- Users must explicitly authorize posting permissions
- Separate from any site authentication (Supabase)

### Cost Analysis Example

**Scenario: 100 users posting 10 tweets each monthly = 1,000 total tweets**

**Direct Twitter API:**
- Requires Basic Tier: $200/month minimum
- App quota: 10,000 posts/month ✓ (sufficient)
- Per-user quota: 3,000 posts/month ✓ (sufficient)
- Total cost: $200/month

**Free tier insufficient:**
- App quota: 500 posts/month ✗ (1,000 > 500)

## Third-Party Service Research Summary

### Ayrshare Advantages
- **Cost**: $149/month for 1,000 posts vs $200/month direct API
- **Threading**: Native automatic thread creation with numbering
- **Multi-platform**: Single API for Twitter, Bluesky, LinkedIn, etc.
- **Enterprise relationships**: Absorbs Twitter API costs through enterprise partnerships

### Service Comparison
- **Ayrshare**: $149/month, 1,000 posts, automatic threading
- **Hootsuite**: $99-249/month per user, enterprise features
- **Buffer**: $6-12/month per channel, simpler interface

### Cost Efficiency
Third-party services achieve 95%+ cost savings by:
- Spreading $42,000/month enterprise API costs across thousands of users
- Leveraging established Twitter partnerships
- Providing value-added features like analytics and scheduling

### Technical Benefits
- **Automatic thread numbering**: (1/n format)
- **Intelligent text breaking**: Preserves sentence structure
- **Media support**: Images/videos in thread segments
- **Error handling**: Professional-grade reliability
- **Multiple platforms**: Single integration for Twitter, Bluesky, LinkedIn

## Implementation Strategy Rationale

**Why Two-Phase Approach:**

**Phase 1 Benefits:**
- Learn Twitter API intricacies and user requirements
- Validate user demand for Twitter posting
- Understand posting patterns and usage costs
- Build reusable authentication and UI patterns

**Phase 2 Benefits:**
- Achieve significant cost savings (25%+ reduction)
- Access professional threading features
- Reduce maintenance burden of direct API integration
- Enable multi-platform posting strategy

**Risk Mitigation:**
- Phase 1 provides fallback if third-party services fail
- Gradual migration reduces implementation risk
- User experience improvements justify migration effort
- Cost savings become more significant as user base grows