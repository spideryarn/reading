# Understanding MCP: Beyond Function Calling - July 4, 2025

---
Date: July 4, 2025
Duration: ~2 hours
Type: Research Review, Technical Deep Dive
Status: Active
Related Docs: `/mcp-servers/file-lister/index.ts`
---

## Context & Goals

After building a simple file-lister MCP server, the conversation shifted to understanding the deeper implications: "Let's say I'm calling an LLM (e.g. Claude) using the standard API. When would i use MCP rather than just the existing/built-in function/tool-calling?"

This led to an exploration of MCP's unique capabilities, current limitations, and the gap between specification and implementation.

## Key Questions Explored

### MCP vs Standard Function/Tool Calling

**User's Core Question**: "When would i use MCP rather than just the existing/built-in function/tool-calling?"

**Key Distinctions Identified**:

**Standard Function/Tool Calling is Better When**:
- You control both sides (writing your own app that calls Claude API directly)
- Simple, stateless operations
- Tight integration - tools are core to your specific application
- Low latency critical
- Custom auth/security needed

**MCP Shines When**:
- Multiple AI clients (same tools work with Claude Desktop, Cursor, Continue, etc.)
- Desktop/local resources - access files, databases, system resources that web APIs can't reach
- Persistent connections - keep database connections, file handles open between calls
- Tool ecosystem - share tools with others or use community MCP servers
- Separation of concerns - tools maintained separately from AI client code
- Complex tool suites - bundle related tools together

**Real Example**: 
- Function calling: "Calculate shipping cost" in your e-commerce app
- MCP: "Access my local SQLite database" that multiple AI tools can use

### Understanding Statefulness

**User's Insight**: "I guess I thought that maybe a big part of the MCP benefit or difference is that it could be two-way, i.e. multiple steps of a conversation? I suppose the statefulness aspect is also important, if I've understood that right?"

**Critical Clarification**: MCP is NOT multi-turn conversational. It's fundamentally request-response, just like standard function calling. Each tool call is independent.

**What Makes MCP "Stateful"**:
```typescript
// This database connection persists across multiple tool calls
const db = new Database('local.db');

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Can reuse the same db connection
  return db.query(request.params.arguments.sql);
});
```

The server stays alive between calls, maintaining:
- Persistent connections (database, WebSocket, file handles)
- In-memory caches
- Session tracking
- File watchers

### Exploring the Full MCP Specification

**User's Question**: "Am I right in thinking that the MCP could store which directory it just listed, such that if you were to then call it again with no arguments it would know to list the same folder again?"

**Answer**: Yes! This is exactly the kind of statefulness MCP enables.

**User's Follow-up**: "And then the sampling and notifications - are they not two-way? I thought with the notifications that it could shout out in half an hour's time, 'oh, by the way, a new file's just been added'. Is that right or no?"

**Answer**: Yes, in theory! MCP specification includes:
- **Notifications**: Server → Client push updates ("a new file was just added!")
- **Sampling**: Server can request AI assistance (reversing the flow)

### Current Implementation Reality

**User's Discovery**: "So there's no available/reference app that supports the full spec?"

**Research Findings**:

**MCP Inspector** - The reference implementation with full spec support:
- ✅ Tools, Resources, Prompts
- ✅ Sampling - server can request LLM completions
- ✅ Notifications - real-time updates

**VS Code (as of June 2025)** - First production client with complete support:
- Authorization, prompts, resources, and sampling
- "The complete MCP experience is available now in VS Code"

**Claude Code** - Partial implementation:
- ✅ Tools - Fully supported
- ✅ Resources - Can reference with @ mentions
- ✅ Prompts - Exposed as slash commands
- ✅ OAuth 2.0 - Built-in authentication
- ❌ Sampling - MCP servers can't call back to Claude
- ❌ Notifications - No push updates from servers

**Project Goose** - Different approach:
- Pure MCP client (not server)
- Bring your own LLM
- Depends on server capabilities

### Automatic Prompt Integration

**User's Question**: "If you set up MCP 'Prompts', do they automatically translate into Claude Code commands?"

**Answer**: Yes! MCP prompts automatically become slash commands:
- Format: `/mcp__servername__promptname`
- Arguments parsed based on prompt definition
- Results injected directly into conversation
- No manual setup required

## Key Insights

### MCP's Vision vs Reality
The protocol is designed for stateful, bidirectional, real-time interactions, but current implementations haven't caught up to the full spec yet. This gap between specification and implementation is important to understand.

### The "Smart Endpoints" Mental Model
Think of MCP servers as "smart endpoints" rather than "conversational agents." The conversation happens at the AI level, not within MCP.

### Ecosystem Play
MCP's real power comes from being a standard that works across multiple AI assistants - "installable tool packages" vs "built-in app features."

## Open Questions

1. When will major clients (Claude Code, Cursor) implement sampling and notifications?
2. How will security be handled when MCP servers can request AI assistance?
3. What patterns will emerge for complex multi-agent coordination?
4. Will the ecosystem converge on common tool packages?

## Sources & References

**MCP Documentation**:
- **[Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction)** - Official documentation
- **[MCP Inspector](https://github.com/modelcontextprotocol/inspector)** - Visual testing tool with full spec support

**Implementation Examples**:
- **[Claude Code MCP Documentation](https://docs.anthropic.com/en/docs/claude-code/mcp)** - Integration patterns
- **[VS Code MCP Support](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)** - Full spec implementation

**Community Resources**:
- Various MCP servers on GitHub for reference
- Spring AI MCP for Java implementations

## Related Work

- `/mcp-servers/file-lister/index.ts` - The working implementation
- `/.cursor/mcp.json` - Cursor configuration for MCP servers

This exploration provided hands-on understanding of MCP architecture, implementation patterns, and the ecosystem's current state. The simple file-lister serves as a foundation for exploring more advanced MCP features.