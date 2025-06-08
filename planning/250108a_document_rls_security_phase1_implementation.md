# Document RLS Security Phase 1 Implementation

**Planning Document**  
**Created**: 8 January 2025  
**Status**: Implementation Stage - Phase 1 Focus  
**Related**: `docs/reference/DATABASE_SECURITY.md`, `docs/reference/AUTHENTICATION_SECURITY.md`

## Executive Summary

Implement Row Level Security (RLS) for the documents table to enforce Phase 1 security model: **strict document ownership where users can only access documents they created**. This establishes the foundation for later phases supporting public documents and sharing.

**Immediate Goal**: Replace current permissive development policies with user-scoped RLS policies for document access control.

**Key Decision**: Focus on Phase 1 implementation while documenting Phase 2 and 3 considerations for future development.

## Problem Statement

Currently, the database uses permissive RLS policies that allow anonymous access to all documents during development. With authentication now implemented, we need proper security controls that enforce document ownership and prepare for multi-user scenarios.

**Current State**: 
- Documents table has `created_by` field linking to `auth.users`
- Permissive development policies allow unrestricted access
- No protection against unauthorized document access

**Target State**: 
- Users can only access documents they own (Phase 1)
- Foundation prepared for public documents (Phase 2) and sharing (Phase 3)
- AI processing commissioning tracked with billing implications

## Technical Approach

### Phase 1: Strict Ownership Model

**Core RLS Policy**:
```sql
-- Replace all existing document policies with user-scoped access
DROP POLICY IF EXISTS "Allow all read documents" ON documents;
DROP POLICY IF EXISTS "Allow all insert documents" ON documents;
DROP POLICY IF EXISTS "Allow all update documents" ON documents;
DROP POLICY IF EXISTS "Allow all delete documents" ON documents;

-- Users can only manage their own documents
CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL TO authenticated
  USING (auth.uid() = created_by::uuid);
```

**Supporting Table Policies**:

**Document Enhancements** (AI-generated content follows document access):
```sql
CREATE POLICY "Users can access enhancements for owned documents" ON document_enhancements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id 
      AND documents.created_by = auth.uid()::text
    )
  );
```

**AI Calls** (users can see AI calls for their documents):
```sql
CREATE POLICY "Users can access AI calls for owned documents" ON ai_calls
  FOR ALL TO authenticated
  USING (
    document_id IS NULL OR -- Allow document-independent calls
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = ai_calls.document_id 
      AND documents.created_by = auth.uid()::text
    )
  );
```

**Chat Threads & Messages** (follow document ownership):
```sql
CREATE POLICY "Users can access chat for owned documents" ON chat_threads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = chat_threads.document_id 
      AND documents.created_by = auth.uid()::text
    )
  );

CREATE POLICY "Users can access messages for accessible threads" ON chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads 
      JOIN documents ON documents.id = chat_threads.document_id
      WHERE chat_threads.id = chat_messages.thread_id 
      AND documents.created_by = auth.uid()::text
    )
  );
```

### Implementation Steps

**COMPLETED:**
1. **✅ Audit Current Usage**: Verified all document operations use authenticated sessions
   - **Critical Finding**: All API routes currently use hardcoded mock users instead of real authentication
   - **Security Risk Level**: HIGH - All document operations bypass authentication
   - **RLS Readiness**: HIGH - Infrastructure exists, needs API route updates

**COMPLETED:**
2. **✅ Fix API Route Authentication**: Replace mock users with real authentication
   - ✅ Updated `/api/upload-pdf` to use `validateAuth()` and `user.id`
   - ✅ Updated `/api/extract-url` to use `validateAuth()` and `user.id`
   - ✅ Updated `/api/delete-document` to validate ownership with `isOwnedByUser()`
   - ✅ Updated `/api/documents/[slug]/download` to check ownership
   - ✅ Updated `/api/documents/[slug]/original` to check ownership
   - ✅ Updated `/app/documents/page.tsx` to show user documents instead of public
   - ✅ Added proper authentication error handling (401 responses)

**COMPLETED:**
3. **✅ Update RLS Policies**: Replace development policies with user-scoped ones
   - ✅ Created migration `20250108000001_implement_phase1_document_rls_policies.sql`
   - ✅ Drops all permissive development policies
   - ✅ Implements user-scoped policies for all document-related tables
   - ✅ Maintains centaur-sourcing support with proper foreign key relationships
   - ✅ Added performance-optimized indexes for RLS policy evaluation
4. **✅ Update Application Code**: Ensure proper error handling for access denied scenarios
   - ✅ All API routes now return 401 for authentication failures
   - ✅ Download/delete operations return 404 for ownership violations (prevents info leakage)
   - ✅ Documents list page shows user-specific documents with empty state

**COMPLETED:**
5. **✅ Apply Migration**: Run the RLS policies migration
   - ✅ Fixed type casting issues in RLS policies (UUID comparisons)
   - ✅ Applied migration `20250610000001_implement_phase1_document_rls_policies.sql` successfully
   - ✅ All permissive development policies replaced with user-scoped policies
   - ✅ RLS policies active on all document-related tables

**READY FOR USER TESTING:**
6. **🔄 Test Access Control**: Verify users can only access owned documents  
7. **🔄 Test Multi-User Scenarios**: Verify isolation between different users

**✨ IMPLEMENTATION COMPLETE - READY FOR UI TESTING ✨**

The **Phase 1 Document RLS Security** is now fully implemented and active. The application is ready for testing with:
- ✅ **All API routes secured** with real authentication
- ✅ **User-scoped database policies** enforcing document ownership
- ✅ **Proper error handling** for unauthorized access
- ✅ **UI updated** to show user-specific documents

### Critical Pre-RLS Security Issues Discovered

**🚨 API Routes Using Mock Authentication:**
- `app/api/upload-pdf/route.ts` - Creates documents for hardcoded mock user
- `app/api/extract-url/route.ts` - Creates documents for hardcoded mock user
- `app/api/delete-document/route.ts` - No ownership validation
- `app/api/documents/[slug]/download/route.ts` - TODO comment for access control
- `app/api/documents/[slug]/original/route.ts` - No access control

**✅ Service Layer Already RLS-Ready:**
- `DocumentService` has proper user-scoped methods: `createForUser()`, `getByUserId()`, `isOwnedByUser()`
- Authentication utilities exist: `validateAuth()`, `getUserId()`, `requireAuth()`
- Page-level protection already implemented for document routes

### Authentication Requirements

- **Server-side**: Always use `getUser()` not `getSession()` for authentication validation
- **Client-side**: Use authenticated Supabase client for database operations
- **API Routes**: Validate authentication before any document operations
- **Error Handling**: Return 404 for unauthorized access (not 403) to prevent information leakage

## Future Phases Design

### Phase 2: Public Documents Support

**Requirements Captured**:
- Anonymous users can view public documents (read-only)
- Anonymous users cannot trigger AI processing
- Only document owners can modify public/private status
- Public documents share AI enhancements across all viewers

**RLS Policy Additions**:
```sql
-- Allow anonymous viewing of public documents
CREATE POLICY "Anonymous users can view public documents" ON documents
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

-- Owners can still manage their documents
CREATE POLICY "Owners can manage documents" ON documents
  FOR INSERT, UPDATE, DELETE TO authenticated
  USING (auth.uid() = created_by::uuid);
```

**Open Questions for Phase 2**:
- Should anonymous users require some form of rate limiting?
- How to prevent abuse of public document viewing?
- Should we track anonymous access for analytics?

### Phase 3: Document Sharing

**Sharing Model Concepts**:
```sql
-- Future sharing table design
CREATE TABLE document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level text NOT NULL CHECK (permission_level IN ('read', 'process', 'admin')),
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, user_id)
);
```

**Permission Levels**:
- `read`: View document and existing enhancements
- `process`: Commission AI processing (and pay for it)
- `admin`: Grant/revoke sharing permissions

## Centaur-Sourcing Considerations

### AI Enhancement Sharing Model

**Current Decision**: AI enhancements are shared across all users who can access the document, but billing tracks who commissioned each enhancement.

**Traceability Chain**: 
- `document_enhancements.ai_call_id` → `ai_calls.created_by`
- Full audit trail of who paid for each enhancement

**Future Considerations**:
- **Quality Control**: How to handle poor-quality AI processing?
- **Abuse Prevention**: Rate limiting for AI processing on public documents?
- **Incentive Alignment**: Should there be benefits for users who contribute valuable enhancements?

**Business Model Implications**:
- Users pay for AI processing they commission
- Benefits accrue to entire community accessing the document
- Popular documents develop rich AI annotations through distributed contributions

### Security & Billing Questions for Later Phases

**Phase 2 Critical Questions**:
1. **AI Processing Authorization**: Should public document AI processing require special permissions?
2. **Rate Limiting**: How to prevent abuse of expensive AI operations?
3. **Quality Assurance**: Mechanism to handle malicious or poor-quality AI processing?

**Phase 3 Sharing Questions**:
1. **Permission Granularity**: How detailed should sharing permissions be?
2. **Billing Responsibility**: Who pays for AI processing on shared documents?
3. **Revocation Handling**: What happens to AI enhancements when sharing is revoked?

## Success Criteria

### Phase 1 Success Metrics
- [ ] Users can only access documents they created
- [ ] Anonymous access completely blocked for document operations
- [ ] Multi-user isolation verified through testing
- [ ] No performance degradation from RLS policy overhead
- [ ] All existing features continue working for document owners

### Testing Strategy
- **Unit Tests**: RLS policy behavior verification
- **Integration Tests**: Multi-user scenarios with different access patterns
- **Performance Tests**: Query performance with RLS enabled
- **Security Tests**: Attempted unauthorized access scenarios

## Implementation Timeline

**Immediate** (This Sprint):
- Replace development RLS policies with Phase 1 user-scoped policies
- Test document isolation between users
- Update error handling for unauthorized access

**Next Sprint** (If needed):
- Performance optimization of RLS policies
- Additional edge case testing
- Documentation updates

**Future Sprints** (Phase 2/3):
- Public document support implementation
- Sharing mechanism design and implementation

## Risks & Mitigation

**Risk**: RLS policy performance impact on complex queries
**Mitigation**: Performance testing and query optimization, potentially adding indexes

**Risk**: Breaking existing functionality during policy transition
**Mitigation**: Gradual rollout and comprehensive testing

**Risk**: Complex RLS policies becoming hard to maintain
**Mitigation**: Keep Phase 1 simple, document all policy decisions

## Related Work

- See `docs/reference/DATABASE_SUPABASE_INTEGRATION_REFERENCE.md` for Supabase.js best practices
- See `docs/reference/AUTHENTICATION_SECURITY.md` for authentication patterns
- Reference implementation: `lib/auth/route-protection.ts` for server-side auth validation

---

## Appendix: Detailed Design Discussion

### Context: Full Conversation Analysis

This planning document emerged from a comprehensive design discussion covering security models, business implications, and technical implementation strategies. Key insights from the discussion:

**User Requirements Clarification**:
- Phase 1: Strict ownership (users can only see their own documents)
- Phase 2: Public documents (anonymous viewing, authenticated AI processing)
- Phase 3: Document sharing (read/process/admin permissions)

**Technical Research Findings**:
- Supabase.js fully supports server-side usage (historical concerns resolved)
- RLS is the recommended approach for client-side data access
- Critical: Always use `getUser()` not `getSession()` for server authentication
- Performance: RLS policies should use subquery wrapping for optimization

**Business Model Insights**:
- "Centaur-sourcing" model: AI enhancements shared but billing tracked individually
- Users pay for AI processing they commission
- Community benefits from distributed AI enhancement contributions
- Quality control and abuse prevention deferred to later phases

**Database Schema Validation**:
- ✅ AI calls have `created_by` foreign key for billing tracking
- ✅ Document enhancements link to AI calls for traceability
- ✅ Full audit trail available for who commissioned each enhancement
- Schema supports both shared enhancement model and individual billing

**Supabase.js Best Practices Discovered**:
- Server-side authentication using `getUser()` for JWT validation
- Client-side RLS enforcement using anonymous key
- API routes for complex business logic, direct client access for CRUD
- Storage RLS integration patterns for file access control

**Security Architecture Decisions**:
- RLS at database level provides defense-in-depth
- Application-layer validation as secondary security layer
- 404 responses for unauthorized access (prevent information leakage)
- Signed URLs for temporary file access

**Performance Considerations**:
- RLS policies with proper indexing for foreign key lookups
- Subquery wrapping for complex multi-table RLS conditions
- Connection pooling and query optimization patterns
- Real-time subscription scoping for performance

**Future Phase Complexity Analysis**:
- Phase 2: Adds anonymous access complexity, AI processing authorization
- Phase 3: Introduces sharing table, permission granularity questions
- Both phases have abuse prevention and billing responsibility challenges

**Implementation Risk Assessment**:
- Phase 1: Low risk, straightforward user-scoped policies
- Policy performance impact requires monitoring and optimization
- Breaking changes during policy transition need careful testing
- Multi-user edge cases need comprehensive test coverage

**Questions Deferred to Later Phases**:
1. AI processing abuse prevention on public documents
2. Quality control mechanisms for AI enhancements
3. Sharing permission granularity and revocation handling
4. Rate limiting and cost control for expensive AI operations
5. Incentive mechanisms for valuable AI enhancement contributions

**Critical Decision Points Documented**:
- Shared AI enhancements vs. user-scoped enhancements (chose shared)
- Anonymous access to public documents (yes, but read-only)
- AI processing authorization (authenticated users only)
- Billing responsibility (commissioner pays, community benefits)

This appendix preserves the full design context for future reference when implementing later phases or revisiting design decisions.

### Reference: RLS Policy Examples

**Performance-Optimized Patterns**:
```sql
-- Wrap subqueries for better performance
CREATE POLICY "Performance optimized document access" ON documents
  FOR ALL TO authenticated
  USING ((auth.uid() = created_by::uuid));

-- Index-friendly foreign key lookups
CREATE POLICY "Index-optimized enhancement access" ON document_enhancements
  FOR ALL TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE created_by = auth.uid()::text
    )
  );
```

**Future Public Document Patterns**:
```sql
-- Phase 2: Public document support
CREATE POLICY "Public document read access" ON documents
  FOR SELECT TO anon, authenticated
  USING (
    is_public = true OR 
    (auth.uid() IS NOT NULL AND auth.uid() = created_by::uuid)
  );
```

**Sharing Table Integration**:
```sql
-- Phase 3: Document sharing support
CREATE POLICY "Shared document access" ON documents
  FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by::uuid OR
    is_public = true OR
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_shares.document_id = documents.id
      AND document_shares.user_id = auth.uid()
    )
  );
```

### Technical Implementation Notes

**Migration Strategy**:
1. Create new policies with descriptive names
2. Test policies in development environment
3. Drop old development policies
4. Monitor performance and query patterns
5. Optimize indexes and policies as needed

**Testing Checklist**:
- [ ] User A cannot access User B's documents
- [ ] Document creation assigns correct ownership
- [ ] AI enhancements follow document access rules
- [ ] Chat threads respect document ownership
- [ ] Anonymous access properly blocked
- [ ] Performance within acceptable bounds
- [ ] Error messages don't leak information

**Monitoring & Observability**:
- Track RLS policy evaluation performance
- Monitor authentication failure patterns
- Log unauthorized access attempts
- Track query performance changes
- Monitor real-time subscription overhead

This comprehensive appendix ensures all design context and implementation details are preserved for future development phases and team knowledge transfer.