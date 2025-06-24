# Nunjucks Usage Guide

Comprehensive guide to Nunjucks templating syntax and patterns for LLM prompt templates in Spideryarn Reading.

## See also

- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Overall LLM integration patterns and the Nunjucks + Zod template system
- `lib/prompts/templates/glossary.njk` - Production example of conditional logic usage
- `lib/prompts/templates/` - All template files showing various Nunjucks patterns
- [Nunjucks Official Documentation](https://mozilla.github.io/nunjucks/templating.html) - Complete reference for advanced features
- `docs/reference/TOOL_GLOSSARY.md` - Contextual example of conditional template patterns for entity capping

## Overview

Nunjucks is a templating engine inspired by Jinja2, providing powerful templating capabilities for our LLM prompt system. We use Nunjucks for all single-use LLM operations including document analysis, summarisation, glossary extraction, and heading generation.

**Key architectural principle**: All single-use AI features in Spideryarn Reading MUST use the Nunjucks + Zod template system for consistency, validation, and maintainability.

## Core Syntax

### Variable Output

Variables are rendered using double curly braces:

```nunjucks
{{ variableName }}
{{ user.name }}
{{ document.title }}
{{ config["setting"] }}
```

**Safety note**: Variables are automatically HTML-escaped unless marked as safe (see Safety Considerations section).

### Control Structures

Control flow uses curly brace-percent syntax:

```nunjucks
{% if condition %}
  Content when true
{% endif %}

{% for item in items %}
  {{ item }}
{% endfor %}
```

## Conditional Logic

### Basic Conditionals

```nunjucks
{% if user %}
  Welcome, {{ user.name }}!
{% endif %}

{% if documentCount > 0 %}
  Found {{ documentCount }} documents
{% else %}
  No documents found
{% endif %}
```

### Complex Conditionals

```nunjucks
{% if (x < 5 or y < 5) and authenticated %}
  Access granted for limited user
{% elif isAdmin %}
  Full admin access
{% else %}
  Access denied
{% endif %}
```

### Inline Conditional Expressions

For concise, single-line conditionals:

```nunjucks
{{ "Premium User" if isPremium else "Regular User" }}
{{ greeting(userName if userName else "Guest") }}
{{ maxEntities if maxEntities else 50 }}
```

### Conditional Logic Operators

**Comparison operators**:
- `==` (equal)
- `===` (strict equal)
- `!=` (not equal)
- `!==` (strict not equal)
- `>`, `>=`, `<`, `<=` (numeric comparison)

**Logical operators**:
- `and` (logical AND)
- `or` (logical OR)
- `not` (logical NOT)

Example combining operators:
```nunjucks
{% if not (isGuest or isBlocked) and hasPermission %}
  Show content
{% endif %}
```

## Template Variables and Data Handling

### Accessing Nested Data

```nunjucks
{{ document.metadata.title }}
{{ user["profile"]["settings"] }}
{{ data.items[0].name }}
```

### Handling Undefined Values

Nunjucks handles undefined/null values gracefully - they render as empty strings without throwing errors:

```nunjucks
{{ possiblyUndefinedValue }}  {# Renders nothing if undefined #}
{{ document.title or "Untitled" }}  {# Fallback pattern #}
```

### Setting Default Values

```nunjucks
{{ maxResults or 10 }}
{{ title if title else "Default Title" }}
```

## Loop Constructs

### Basic Loops

```nunjucks
{% for entity in entities %}
  - {{ entity.name }}: {{ entity.description }}
{% endfor %}
```

### Loop with Empty Fallback

```nunjucks
{% for item in items %}
  {{ item.title }}
{% else %}
  No items found
{% endfor %}
```

### Loop Metadata

Access loop information:

```nunjucks
{% for entity in entities %}
  {% if loop.first %}First entity: {% endif %}
  {{ loop.index }}. {{ entity.name }}
  {% if not loop.last %}, {% endif %}
{% endfor %}
```

Available loop variables:
- `loop.index` - Current iteration (1-indexed)
- `loop.index0` - Current iteration (0-indexed)
- `loop.first` - True on first iteration
- `loop.last` - True on last iteration
- `loop.length` - Total number of items

### Filtering in Loops

```nunjucks
{% for entity in entities %}
  {% if entity.importance > 0.8 %}
    High priority: {{ entity.name }}
  {% endif %}
{% endfor %}
```

## Template Inheritance and Includes

### Template Inheritance

Base template (`base.njk`):
```nunjucks
You are an AI assistant. {{ instructions }}

{% block analysis_section %}
  Default analysis instructions
{% endblock %}

{% block output_format %}
  Provide results in plain text format.
{% endblock %}
```

Child template:
```nunjucks
{% extends "base.njk" %}

{% block analysis_section %}
  Please extract key entities from the following document:
  <document>{{ content }}</document>
{% endblock %}

{% block output_format %}
  Return JSON with entities array.
{% endblock %}
```

### Including Templates

```nunjucks
{% include "common-instructions.njk" %}

<document>
{{ content }}
</document>

{% include "output-format-json.njk" %}
```

## Filters

### String Manipulation

```nunjucks
{{ title | capitalize }}
{{ content | lower }}
{{ text | trim }}
{{ longText | truncate(100) }}
{{ searchTerm | replace("old", "new") }}
```

### Useful Filters for LLM Templates

```nunjucks
{{ entities | length }}  {# Get count #}
{{ items | first }}      {# Get first item #}
{{ items | last }}       {# Get last item #}
{{ list | join(", ") }}  {# Join with separator #}
{{ number | round(2) }}  {# Round to 2 decimal places #}
```

### Chaining Filters

```nunjucks
{{ title | trim | lower | capitalize }}
{{ content | truncate(500) | trim }}
```

## Safety Considerations

### Automatic Escaping

By default, Nunjucks HTML-escapes all variables to prevent XSS attacks:

```nunjucks
{{ userInput }}  {# Automatically escaped #}
```

### Marking Content as Safe

When you need to output HTML or other markup without escaping:

```nunjucks
{{ htmlContent | safe }}
```

**⚠️ Warning**: Only use `| safe` with trusted content. Never use it with user-provided data.

### Manual Escaping

Force escaping even when auto-escaping is disabled:

```nunjucks
{{ potentiallyDangerousContent | escape }}
```

### Best Practices for LLM Templates

Since LLM templates often contain structured markup (XML, JSON), consider these patterns:

```nunjucks
{# Safe for LLM prompts - these aren't HTML contexts #}
<document>
{{ documentContent }}
</document>

{# JSON structure - no escaping needed #}
{
  "content": "{{ jsonContent }}",
  "metadata": {{ metadataObject | dump }}
}
```

## Conditional Template Patterns for Spideryarn Reading

### Entity Capping Pattern

Used in glossary generation for timeout mitigation:

```nunjucks
{% if maxEntities %}
Please extract up to {{ maxEntities }} of the most important entities.
Focus on the entities that appear first in the text and are most crucial for understanding.
{% else %}
Please extract all important entities from the text.
{% endif %}
```

### Existing Entity Exclusion

Pattern from `glossary.njk`:

```nunjucks
{% if already_entities %}
<already_extracted_entities>
This text already has the following entities, so don't include any of these in your response:
{% for entity in already_entities %}
- {{ entity.name }}, aliases={{ entity.aliases }}
{% endfor %}
</already_extracted_entities>
{% endif %}
```

### Progressive Enhancement Pattern

Build up complexity based on available data:

```nunjucks
Analyse the following document:

<document>
{{ content }}
</document>

{% if context %}
<additional_context>
{{ context }}
</additional_context>
{% endif %}

{% if examples %}
<examples>
{% for example in examples %}
{{ example }}
{% endfor %}
</examples>
{% endif %}

{% if constraints %}
<constraints>
{% for constraint in constraints %}
- {{ constraint }}
{% endfor %}
</constraints>
{% endif %}
```

### Multi-Level Conditional Logic

Complex decision trees for adaptive prompts:

```nunjucks
{% if documentType == "academic" %}
  {% if level == "undergraduate" %}
    Use accessible language appropriate for undergraduates.
  {% elif level == "graduate" %}
    Use technical terminology with detailed explanations.
  {% else %}
    Use expert-level analysis with minimal explanation.
  {% endif %}
{% elif documentType == "technical" %}
  {% if includeCodeExamples %}
    Provide code examples and implementation details.
  {% else %}
    Focus on concepts and architecture.
  {% endif %}
{% else %}
  Use general audience language.
{% endif %}
```

## Advanced Patterns

### XML-Style Delimiters (Recommended)

**Best Practice**: Use XML-style delimiters to improve LLM comprehension:

```nunjucks
Analyse the document below and extract key themes:

<document>
{{ documentContent }}
</document>

{% if additionalContext %}
<context>
{{ additionalContext }}
</context>
{% endif %}

Please provide your analysis in the following format:
<output_format>
- Theme 1: Description
- Theme 2: Description
</output_format>
```

### JSON Output Structure

For structured data responses:

```nunjucks
Return JSON in the following form, without any context or explanation:

```json
{
  "entities": [
    {
      "name": "string",
      "type": "{{ entityType }}",
      "description": "string"
      {% if includeConfidence %}
      ,"confidence": 0.95
      {% endif %}
    }
  ]
  {% if includeMetadata %}
  ,"metadata": {
    "processingTime": "{{ processingTime }}",
    "model": "{{ modelName }}"
  }
  {% endif %}
}
```

{% if strictJsonOutput %}
ONLY JSON IS ALLOWED IN YOUR RESPONSE.
{% endif %}
```

### Template Composition

Building complex prompts from smaller parts:

```nunjucks
{# Base instructions #}
You are helping the reader understand this text.

{# Document section #}
{% if documentContent %}
<document>
{{ documentContent }}
</document>
{% endif %}

{# Dynamic requirements based on analysis type #}
{% if analysisType == "summary" %}
  {% include "summary-instructions.njk" %}
{% elif analysisType == "glossary" %}
  {% include "glossary-instructions.njk" %}
{% elif analysisType == "headings" %}
  {% include "heading-instructions.njk" %}
{% endif %}

{# Common output format #}
{% include "common-output-format.njk" %}
```

## Testing Template Logic

### Validation Patterns

```typescript
// Test conditional logic with different inputs
const testCases = [
  { maxEntities: 10, expected: "extract up to 10" },
  { maxEntities: null, expected: "extract all important" },
  { already_entities: [], expected: "no exclusion section" },
  { already_entities: [{ name: "Test" }], expected: "exclusion section present" }
]

testCases.forEach(testCase => {
  const rendered = nunjucks.render('template.njk', testCase)
  expect(rendered).toContain(testCase.expected)
})
```

### Common Testing Scenarios

1. **Undefined variable handling**
2. **Empty array/object behaviour**
3. **Complex conditional chains**
4. **Loop edge cases (empty arrays)**
5. **Filter application**

## Performance Considerations

### Template Compilation

Nunjucks compiles templates for better performance:

```typescript
// Pre-compile templates for production
const env = nunjucks.configure('templates', { 
  precompiled: true,
  autoescape: false  // Safe for LLM contexts
})
```

### Variable Resolution

- Dot notation (`object.property`) is faster than bracket notation (`object["property"]`)
- Avoid deeply nested property access where possible
- Cache complex calculations outside the template

### Loop Optimisation

```nunjucks
{# Efficient: Filter before looping #}
{% set importantEntities = entities | selectattr("importance", ">", 0.7) %}
{% for entity in importantEntities %}
  {{ entity.name }}
{% endfor %}

{# Less efficient: Filter inside loop #}
{% for entity in entities %}
  {% if entity.importance > 0.7 %}
    {{ entity.name }}
  {% endif %}
{% endfor %}
```

## Integration with Spideryarn Reading

### Template Location

All templates live in `/lib/prompts/templates/`:

```
/lib/prompts/templates/
├── glossary.njk              # Entity extraction
├── glossary.ts               # Schema and config
├── two-sentence-summary.njk  # Document summarisation
├── two-sentence-summary.ts   # Schema and config
└── [feature].njk             # Your new template
```

### Schema Integration

Every template must have a corresponding TypeScript schema:

```typescript
// my-feature.ts
import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '@/lib/prompts/types'

const myFeatureSchema = z.object({
  content: z.string().min(1),
  maxEntities: z.number().optional(),
  already_entities: z.array(z.object({
    name: z.string(),
    aliases: z.array(z.string())
  })).optional()
})

export const myFeaturePrompt = loadPromptTemplateFromCaller(
  'my-feature.njk',
  myFeatureSchema
)
```

### Execution Pattern

```typescript
// API route usage
import { executePrompt } from '@/lib/prompts/types'
import { myFeaturePrompt } from '@/lib/prompts/templates/my-feature'

const result = await executePrompt(myFeaturePrompt, {
  content: documentContent,
  maxEntities: 20,
  already_entities: existingEntities
})
```

## Common Gotchas

### Variable Scoping

```nunjucks
{% set outerVar = "outer" %}
{% for item in items %}
  {% set innerVar = "inner" %}
  {{ outerVar }}  {# Available #}
{% endfor %}
{{ innerVar }}  {# Not available - undefined #}
```

### Truthiness Testing

```nunjucks
{% if items %}          {# True if array exists and has length > 0 #}
{% if items.length %}   {# True if length > 0 (but fails if items is null) #}
{% if items | length %} {# Safe: returns 0 if items is null #}
```

### String vs Number Comparison

```nunjucks
{% if count > "5" %}    {# String comparison - may not work as expected #}
{% if count > 5 %}      {# Numeric comparison - correct #}
```

### Whitespace Control

Control whitespace around tags:

```nunjucks
{%- if condition -%}     {# Removes whitespace before and after #}
  Content
{%- endif -%}

{{- variable -}}         {# Removes whitespace around output #}
```

## Migration from Other Template Systems

### From Jinja2

Most Jinja2 syntax works directly in Nunjucks:

```nunjucks
{# These patterns are identical #}
{{ variable }}
{% if condition %}...{% endif %}
{% for item in items %}...{% endfor %}
{{ list | join(", ") }}
```

### From Handlebars

Main differences:

```nunjucks
{# Handlebars: {{#if condition}} #}
{% if condition %}

{# Handlebars: {{#each items}} #}
{% for item in items %}

{# Handlebars: {{> partial}} #}
{% include "partial.njk" %}
```

## Appendix

### Production Examples

The `glossary.njk` template demonstrates real-world conditional patterns:

1. **Optional entity exclusion** using `{% if already_entities %}`
2. **Loop-based content generation** with `{% for entity in already_entities %}`
3. **Clear template structure** with XML-style delimiters
4. **Robust variable interpolation** with fallback handling

### Future Enhancements

Planned improvements to Nunjucks usage in Spideryarn Reading:

- **Template inheritance** for common prompt patterns ✓
- **Custom filters** for domain-specific transformations 📋
- **Macro definitions** for reusable prompt components 📋
- **Template debugging** tools for development 📋

### Complete Reference

For advanced features not covered here:
- [Nunjucks Built-in Filters](https://mozilla.github.io/nunjucks/templating.html#builtin-filters)
- [Nunjucks Global Functions](https://mozilla.github.io/nunjucks/templating.html#builtin-globals)
- [Nunjucks API Documentation](https://mozilla.github.io/nunjucks/api.html)