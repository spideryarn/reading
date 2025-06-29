# Generate Mermaid Diagram Images

Quick instructions for creating and updating Mermaid diagrams in the project.

## Setup

See `docs/reference/ARCHITECTURE_MERMAID.md` for complete installation and configuration details.

## File Organization

- **Source files**: Store `.mermaid` files in `docs/diagrams/`
- **Generated files**: Save SVG/PNG outputs in same directory
- **Naming**: Use descriptive prefixes like `DIAGRAM_TOOLS_`, `FLOW_`, `ARCHITECTURE_`

## Generation Commands

**Prefer SVG format** (scalable, web-friendly):
```bash
npx mmdc -i docs/diagrams/FILENAME.mermaid -o docs/diagrams/FILENAME.svg -w 1400 -H 1600 -s 2 -b transparent -t default
```

**PNG only when specifically requested**:
```bash
npx mmdc -i docs/diagrams/FILENAME.mermaid -o docs/diagrams/FILENAME.png -w 1400 -H 1600 -s 2 -b transparent -t default
```

## Best Practices

### Always Regenerate
**Automatically regenerate SVG whenever you update a `.mermaid` file** - keep diagrams in sync with source.

### Simplify Linear Flows
If you have a stack of sequential boxes with no branches, **collapse into a single box** with steps as bullet points:

❌ **Avoid this**:
```mermaid
A[Step 1] --> B[Step 2] --> C[Step 3] --> D[Step 4]
```

✅ **Prefer this**:
```mermaid
Process[Process Flow:<br/>• Step 1<br/>• Step 2<br/>• Step 3<br/>• Step 4]
```

### Syntax Tips
- **Avoid special characters** in node labels (quotes, parentheses)
- **Use emojis** for visual clarity
- **Keep labels concise** - detailed descriptions go in documentation
- **Test syntax** before generating images

## Quick Workflow

1. Create/edit `.mermaid` file in `docs/diagrams/`
2. Generate SVG: `npx mmdc -i SOURCE.mermaid -o OUTPUT.svg -w 1400 -H 1600 -s 2 -b transparent`
3. Commit both source and generated files