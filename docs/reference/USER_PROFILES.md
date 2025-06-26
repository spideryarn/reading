# User Profiles Reference

> ✅ **CURRENT** - This documentation reflects the user profile system as of June 2025.

User profiles store account information and personalisation data, including background information about users' interests and expertise. This enables AI-powered personalisation of summaries, glossaries, and content recommendations throughout the application.

## See also

- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Complete database schema including profiles table structure
- [AUTHENTICATION_OVERVIEW.md](AUTHENTICATION_OVERVIEW.md) - Authentication system that creates and manages user profiles
- [LLM_PROMPT_TEMPLATES.md](LLM_PROMPT_TEMPLATES.md) - How user background informs AI prompt personalisation
- Profile page implementation: `app/auth/profile/page.tsx`
- Profile service layer: `lib/services/database/profiles.ts`

## Overview

The user profile system provides:

1. **Account Information**: Basic user details and membership data
2. **User Background**: Interests, expertise areas, and reading preferences for AI personalisation
3. **Document Management**: Overview of user's uploaded documents and reading history
4. **Preferences**: UI settings and personalisation options

User profiles are automatically created when users register and can be updated through the profile management interface.

## Database Schema

### `public.profiles` Table

**Core Fields**:
- `id`: Primary key (UUID)
- `user_id`: Links to `auth.users` (1:1 relationship)
- `preferences`: JSONB for flexible user settings
- `created_at`, `updated_at`: Standard timestamps

**Administrative Fields**:
- `is_admin`: Admin privileges flag
- `stripe_customer_id`: Payment integration
- `subscription_plan`, `subscription_status`, `subscription_ends_at`: Subscription management

**Profile Background Field**:
- `background`: TEXT field storing free-text user background information about interests and expertise

**Example Profile Background**:
```text
I'm a software engineering manager with 8 years experience in fintech and machine learning. My main interests include distributed systems, product strategy, and team leadership. I have expertise in Python, JavaScript, and system architecture. I'm particularly interested in AI/ML applications in financial services and enjoy reading academic papers on distributed computing and organizational psychology.
```

## UI Integration

### Profile Page (`/auth/profile`)

**Current Features**:
- Account information display (email, display name, member since)
- Profile background form with textarea input and save functionality
- Document overview with statistics
- Recent documents list with metadata

**Key Components**:
- Profile information card with account details
- Background form section (`BackgroundForm` component)
- Document library with quick access links

## AI Personalisation Use Cases

### 1. Personalised Summaries
- **Beginner level**: More detailed explanations of complex concepts
- **Expert level**: Focus on key insights and skip basic explanations
- **Domain expertise**: Highlight relevant technical details for user's professional areas

### 2. Intelligent Glossary
- Prioritise terms outside user's expertise areas
- Exclude basic terms for advanced users in their domains
- Include domain-specific terminology relevant to user's interests

### 3. Content Recommendations
- Suggest related documents based on interest alignment
- Highlight sections most relevant to user's expertise
- Customise reading difficulty based on user's level

### 4. Chatbot Personalisation
- Tailor conversation style to user's preferences
- Reference user's background knowledge appropriately
- Provide explanations at appropriate depth level

## Implementation Notes

### Profile Creation
- Automatic profile creation via database trigger on user registration
- Default preferences include theme and basic settings
- Background information collected through onboarding flow (future)

### Data Privacy
- User background stored as free-text in dedicated TEXT column
- No sensitive personal information stored beyond interests/expertise
- Full user control over profile data sharing and AI personalisation

### Service Layer Methods
```typescript
// Current ProfileService methods
await profileService.getByUserId(userId)
await profileService.updatePreferences(userId, preferences)
await profileService.getPreferences(userId) // Returns with defaults
await profileService.updateBackground(userId, background)
await profileService.getBackground(userId)
```

### LLM Integration
User background context automatically included in AI prompts:
- Summarisation: Adjusted complexity and focus areas
- Glossary generation: Filtered based on user expertise
- Chat responses: Tailored explanations and examples

### Performance Considerations
- JSONB indexing on frequently queried preference paths
- Caching of user personalisation context
- Lightweight profile data structure optimised for AI prompt inclusion

## Future Enhancements

- **Profile Completion Wizard**: Guided setup for new users
- **Smart Defaults**: AI-suggested interests based on document uploads
- **Team Profiles**: Shared reading lists and collaborative features
- **Reading Analytics**: Personal insights on reading patterns and preferences
- **Export/Import**: Profile data portability and backup options