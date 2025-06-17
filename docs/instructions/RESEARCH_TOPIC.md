# RESEARCH_TOPIC.md - Comprehensive Research Instruction

Conduct thorough research on any topic using parallel subagent methodology, systematic query optimization, and rigorous source evaluation.

## Pre-Research Planning

Before starting any research:

1. **Check current date** - Run `date` to avoid outdated time references in queries
2. **Clarify requirements** - Ask specific questions about:
   - Research scope and depth needed
   - Decision criteria or success metrics
   - Time sensitivity and recency requirements
   - Expected output format (insights, recommendations, analysis)
3. **Investigate existing context** - Check relevant code, docs, or previous research to inform search strategy
4. **Define research questions** - Break down the topic into 3-5 specific research angles

## Parallel Research Strategy

Deploy 3-5 subagents simultaneously with distinct roles and research angles:

### Subagent Roles (Choose appropriate combination):
- **Current State Agent**: Latest developments, recent trends, 2025 updates
- **Best Practices Agent**: Established methodologies, proven approaches, industry standards  
- **Comparative Agent**: Tool/library/solution comparisons, pros/cons analysis
- **Community Agent**: Where experts hang out, discussion forums, social proof
- **Technical Agent**: Implementation details, debugging approaches, technical specs
- **Market Agent**: Commercial solutions, pricing, vendor analysis

### Subagent Instructions Template

For each subagent, provide:
```
Background: [Full context of what we're researching and why]
Your specific role: [One of the roles above]
Research focus: [Specific angle or questions to investigate]
Current date: [Output from `date` command]
Query optimization: 
- Use "recent", "latest", "current" instead of "2024"
- Use "as of 2025" when year-specific data needed
- Focus on developments from past 6-12 months for trending topics

Expected output:
- Key findings with source URLs
- Quality assessment of sources (authority, recency, relevance)
- Specific actionable insights
- Gaps or areas needing follow-up research

Research methodology:
- Start with 2-3 broad queries to map the landscape
- Follow with specific queries based on initial findings
- Cross-reference claims across multiple sources
- Prioritize authoritative sources (academic, industry leaders, official docs)
- Flag any contradictory information for verification
```

## Query Optimization Best Practices

### Effective Query Structure:
- **Specific intent**: "Compare React dropdown libraries for accessibility" vs "React dropdowns"
- **Boolean operators**: (library OR component) AND (dropdown OR select) AND accessibility
- **Contextual clarity**: Include background when needed for complex topics
- **Time relevance**: "recent React dropdown libraries" vs "React dropdown libraries 2024"

### Avoid These Query Patterns:
- ❌ "best practices 2024" → ✅ "current best practices" or "latest best practices"
- ❌ "trends 2024" → ✅ "emerging trends" or "recent developments"  
- ❌ Generic terms → ✅ Specific, contextual queries
- ❌ Single broad query → ✅ Multiple focused queries

## Source Evaluation Framework

Each subagent should evaluate sources using:

### Authority Indicators:
- Author credentials and expertise
- Publisher reputation 
- Institutional backing
- Citation frequency by other experts

### Recency Assessment:
- Publication/update dates
- Relevance to current technology/practices
- Whether information might be outdated

### Quality Markers:
- Detailed, well-reasoned content
- References to other authoritative sources
- Clear methodology or evidence
- Balanced perspective on trade-offs

## Research Synthesis Process

### During Research:
- Each subagent maintains its own context and focus
- Minimal communication between subagents during research phase
- Each reports findings independently to avoid bias

### After Parallel Research:
1. **Collect all findings** from subagents
2. **Identify patterns** - What themes emerge across different angles?
3. **Flag contradictions** - Where do sources disagree? Need verification?
4. **Assess completeness** - What gaps remain? What follow-up research needed?
5. **Synthesize insights** - Combine findings into coherent understanding
6. **Document sources** - Maintain attribution for all key claims

## Context Management

### To Prevent Context Loss:
- Keep subagent tasks focused and independent
- Use structured reporting formats
- Summarize key findings before losing context
- Create follow-up research tasks for any gaps discovered

### When to Use Sequential vs Parallel:
- **Parallel**: Independent research angles, broad topic exploration, time-sensitive
- **Sequential**: Building hypotheses, dependent research steps, deep technical debugging

## Research Quality Assurance

### Verification Steps:
- Cross-reference critical claims across multiple sources
- Check source dates and relevance
- Identify potential biases or conflicts of interest
- Flag areas where expert verification might be needed

### Red Flags:
- Sources older than 2 years for rapidly evolving topics
- Claims without supporting evidence or references
- Contradictory information without clear resolution
- Limited diversity in source types or perspectives

## Output Structure

Synthesize research into:

### Executive Summary
- 2-3 sentence overview of key findings
- Main recommendation or conclusion

### Key Findings by Research Angle
- Organize by subagent roles/focus areas
- Include specific insights and source attribution
- Highlight any surprising or contradictory findings

### Source Quality Assessment
- List of primary sources with credibility evaluation
- Note any limitations or biases identified
- Suggest additional research if gaps remain

### Actionable Insights
- Specific recommendations or next steps
- Trade-offs and considerations
- Implementation guidance where relevant

### Research Methodology Note
- Brief description of search strategy used
- Any limitations or scope constraints
- Suggestions for follow-up research

## Follow-up Research Triggers

Continue research if:
- Contradictory information needs resolution
- Key questions remain unanswered
- Sources are limited or potentially biased
- Topic is rapidly evolving and recency is critical
- Stakeholder questions arise that weren't initially addressed

## Examples of Research Angles

### "Best practices for browser automation testing":
- Current State Agent: Latest Playwright/Selenium updates, 2025 trends
- Best Practices Agent: Established testing methodologies, reliability patterns
- Comparative Agent: Playwright vs Selenium vs Cypress comparison
- Community Agent: Where testing experts discuss best practices
- Technical Agent: Implementation patterns, debugging common issues

### "Best React dropdown libraries":
- Current State Agent: Recently updated libraries, new releases
- Comparative Agent: Feature comparison, performance benchmarks  
- Community Agent: Developer preferences, GitHub stars/activity
- Technical Agent: Accessibility compliance, TypeScript support
- Market Agent: Enterprise adoption, maintenance track record

This methodology ensures comprehensive, current, and well-sourced research while avoiding common pitfalls like outdated references and context loss.