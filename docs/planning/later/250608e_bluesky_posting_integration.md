# Bluesky Posting Integration

## Goal, context

Implement the ability for users to post AI-generated tweet threads to Bluesky directly from our application. This extends our existing tweet thread generation feature (documented in `docs/reference/TOOL_TWEET_THREAD_VIEW.md`) with actual social media posting capabilities.

Bluesky offers a developer-friendly, free API with native threading support, making it an ideal starting platform for social media integration. The existing tweet thread view already generates properly formatted thread content - we need to add authentication and posting functionality.

## References

- `docs/reference/TOOL_TWEET_THREAD_VIEW.md` - Documents existing tweet thread generation and UI components
- `components/tweet-thread-view.tsx` - Current tweet thread display component with copy-to-clipboard
- `app/api/tweet-thread/route.ts` - API endpoint for generating thread content
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Current Supabase authentication system architecture
- `lib/auth/` - Existing authentication utilities and patterns

## Principles, key decisions

- **Start with Bluesky first**: Free API, generous rate limits, excellent developer experience, and growing user base (28M+)
- **Separate authentication flow**: Bluesky account linking separate from main site authentication (email/Google via Supabase)
- **Optional feature**: Users can use the app without connecting social accounts - this is purely additive
- **Follow existing patterns**: Use the established auto-generation pattern from glossary feature for thread posting
- **Security first**: Secure token storage, proper error handling, and user consent at every step

## Stages & actions

### Stage: Research and Technical Foundation
- [ ] Run `./scripts/sync-worktrees.ts` to sync with latest changes
- [ ] Research Bluesky API implementation details (use subagent)
  - [ ] Study official `@atproto/api` SDK documentation
  - [ ] Understand threading with root/parent references
  - [ ] Investigate authentication flow and token management
  - [ ] Review rate limits and posting restrictions
- [ ] Install and configure Bluesky SDK
  - [ ] `npm install @atproto/api`
  - [ ] Test basic connection and authentication in development
- [ ] Design database schema for Bluesky account linking
  - [ ] Add Bluesky credentials table or extend user profiles
  - [ ] Plan secure token storage approach
- [ ] Update planning doc with technical findings
- [ ] Commit foundation work (use subagent, follow `docs/instructions/GIT_COMMIT_CHANGES.md`)

### Stage: Authentication and Account Linking
- [ ] Create Bluesky OAuth flow components
  - [ ] "Link Bluesky Account" button in user settings/profile
  - [ ] OAuth callback handling and token storage
  - [ ] Success/error states for account linking
- [ ] Implement secure token management
  - [ ] Encrypted storage in database
  - [ ] Token refresh logic
  - [ ] Account disconnection functionality
- [ ] Add Bluesky account status to user interface
  - [ ] Show linked account status in settings
  - [ ] Display username when connected
  - [ ] Provide disconnect option
- [ ] Write tests for authentication flow
  - [ ] Test OAuth flow components
  - [ ] Test token storage and retrieval
  - [ ] Test error handling
- [ ] Manual testing of account linking process
- [ ] Update planning doc with authentication progress
- [ ] Commit authentication implementation (use subagent)

### Stage: Thread Posting Functionality
- [ ] Extend tweet thread API to support Bluesky posting
  - [ ] Add optional posting parameter to existing endpoint
  - [ ] Implement thread posting logic with root/parent references
  - [ ] Handle rate limits and API errors gracefully
- [ ] Update tweet thread UI components
  - [ ] Add "Post to Bluesky" button alongside copy functionality
  - [ ] Show posting progress and success states
  - [ ] Handle authentication required states
- [ ] Implement thread posting logic
  - [ ] Convert existing thread format to Bluesky posts
  - [ ] Handle 300-character limit per post
  - [ ] Create proper thread structure with references
  - [ ] Add error handling for failed posts
- [ ] Write tests for posting functionality
  - [ ] Test thread conversion and posting
  - [ ] Test error scenarios and rate limiting
  - [ ] Test UI state management
- [ ] Manual testing with real Bluesky account
- [ ] Update planning doc with posting implementation progress
- [ ] Commit posting functionality (use subagent)

### Stage: Polish and Documentation
- [ ] Enhance user experience
  - [ ] Add confirmation dialogs before posting
  - [ ] Improve loading states and progress indicators
  - [ ] Add success notifications with links to posted threads
- [ ] Error handling and edge cases
  - [ ] Handle expired tokens gracefully
  - [ ] Manage network failures and retries
  - [ ] Deal with content that exceeds platform limits
- [ ] Update documentation
  - [ ] Add Bluesky integration to `docs/reference/TOOL_TWEET_THREAD_VIEW.md`
  - [ ] Document authentication patterns in `docs/reference/AUTHENTICATION_OVERVIEW.md`
  - [ ] Create usage guide for users
- [ ] Comprehensive testing
  - [ ] End-to-end tests for full posting flow
  - [ ] Edge case testing with various content types
  - [ ] Cross-browser testing for OAuth flow
- [ ] Code review and cleanup
  - [ ] Remove debug code and console logs
  - [ ] Ensure TypeScript compliance
  - [ ] Verify no security vulnerabilities
- [ ] Update planning doc with final status
- [ ] Final commit and code review (use subagent)

### Stage: User Feedback and Iteration
- [ ] Deploy to production environment
- [ ] Monitor usage and error rates
- [ ] Gather user feedback on posting experience
- [ ] Identify areas for improvement
- [ ] Plan next iteration based on feedback
- [ ] Move planning doc to `docs/planning/finished/` and commit

# Appendix

## Bluesky API Research Summary

From web research conducted:

**API Capabilities:**
- Free API with generous rate limits (5,000 points/hour, 35,000 points/day)
- Native threading support with root/parent references
- 300-character posts (similar to original Twitter)
- Official `@atproto/api` TypeScript SDK
- Well-documented with active developer community

**Authentication:**
- App Password system (not main account password)
- Standard OAuth-like flow with session management
- Access tokens expire after hours, refresh tokens for renewal
- Simple login with handle and app password

**Threading Implementation:**
```javascript
await agent.post({
  text: 'Thread continuation...',
  reply: {
    root: { uri: threadRootPost.uri, cid: threadRootPost.cid },
    parent: { uri: postReplyingTo.uri, cid: postReplyingTo.cid }
  },
  createdAt: new Date().toISOString()
})
```

**Platform Status:**
- 28M users and growing rapidly
- Developer-friendly approach vs Twitter's restrictive model
- Built on decentralized AT Protocol
- Active development with regular SDK updates

## Existing Tweet Thread Infrastructure

Current implementation generates tweet-like content through:
- AI-powered thread generation via `app/api/tweet-thread/route.ts`
- UI display in `components/tweet-thread-view.tsx` 
- Copy-to-clipboard functionality already implemented
- Thread format includes numbering and proper structure
- Integration with document content and AI summarization

This provides the perfect foundation for actual social media posting - the content generation and display are already complete.