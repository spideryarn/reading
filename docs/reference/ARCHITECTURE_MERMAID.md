# Mermaid Diagram Setup and Best Practices

This document provides comprehensive guidance for working with Mermaid diagrams in the Spideryarn Reading project, including setup instructions, conversion to PNG, and best practices.

## Table of Contents

- [Overview](#overview)  
- [Installation](#installation)
- [CLI Setup and Usage](#cli-setup-and-usage)
- [PNG Conversion Best Practices](#png-conversion-best-practices)
- [Command Reference](#command-reference)
- [Quality and Resolution](#quality-and-resolution)
- [Troubleshooting](#troubleshooting)
- [Development Workflow](#development-workflow)
- [Examples](#examples)

## Overview

Mermaid is a JavaScript-based diagramming and charting tool that enables creation of diagrams using text-based syntax. This project uses Mermaid for architectural diagrams, with conversion to PNG format for documentation purposes.

**Current Version**: 11.6.0 (as of 2025-06-29)
**Package**: `@mermaid-js/mermaid-cli`
**Command**: `mmdc` (MermaidCLI)

## Installation

### Local Installation (Recommended)

For project-specific usage, install the Mermaid CLI locally:

```bash
npm install @mermaid-js/mermaid-cli
```

### Global Installation (Alternative)

For system-wide usage:

```bash
npm install -g @mermaid-js/mermaid-cli
```

### Using npx (No Installation Required)

For one-off usage without installation:

```bash
npx -p @mermaid-js/mermaid-cli mmdc --help
```

## CLI Setup and Usage

### Basic Command Structure

```bash
npx mmdc [options]
```

### Essential Options

- `-i, --input <input>`: Input mermaid file (required)
- `-o, --output [output]`: Output file (optional, defaults to input + ".svg")
- `-w, --width [width]`: Page width in pixels (default: 800)
- `-H, --height [height]`: Page height in pixels (default: 600)
- `-s, --scale [scale]`: Puppeteer scale factor for high-DPI (default: 1)
- `-b, --backgroundColor [color]`: Background color (default: "white")
- `-t, --theme [theme]`: Chart theme (choices: "default", "forest", "dark", "neutral")

## PNG Conversion Best Practices

### High-Quality PNG Generation

For documentation purposes, use these recommended settings:

```bash
npx mmdc -i diagram.mermaid -o diagram.png -w 1200 -H 1400 -s 2 -b transparent -t default
```

**Key Recommendations:**

1. **Scale Factor**: Use `-s 2` for high-DPI displays and crisp text rendering
2. **Dimensions**: Set appropriate width/height based on diagram complexity
3. **Background**: Use `-b transparent` for flexible integration
4. **Theme**: Choose theme based on target documentation style

### Resolution Considerations

- **Standard Resolution**: Default scale (1) produces 72 DPI equivalent
- **High Resolution**: Scale factor of 2 produces ~144 DPI equivalent
- **Ultra High Resolution**: Scale factor of 3+ for very high-quality outputs (large file sizes)

### Background Options

- `transparent`: Best for flexible integration
- `white`: Standard for light backgrounds
- `#F0F0F0`: Light grey for subtle contrast
- `red`, `blue`, etc.: Named colours for specific needs

## Command Reference

### Complete Option Set

```bash
Usage: mmdc [options]

Options:
  -V, --version                                   output the version number
  -t, --theme [theme]                             Theme of the chart (choices: "default", "forest", "dark", "neutral", default: "default")
  -w, --width [width]                             Width of the page (default: 800)
  -H, --height [height]                           Height of the page (default: 600)
  -i, --input <input>                             Input mermaid file. Files ending in .md will be treated as Markdown and all charts will be extracted and generated. Use `-` to read from stdin.
  -o, --output [output]                           Output file. It should be either md, svg, png, pdf or use `-` to output to stdout. Optional. Default: input + ".svg"
  -a, --artefacts [artefacts]                     Output artefacts path. Only used with Markdown input file. Optional. Default: output directory
  -e, --outputFormat [format]                     Output format for the generated image. (choices: "svg", "png", "pdf", default: Loaded from the output file extension)
  -b, --backgroundColor [backgroundColor]         Background color for pngs/svgs (not pdfs). Example: transparent, red, '#F0F0F0'. (default: "white")
  -c, --configFile [configFile]                   JSON configuration file for mermaid.
  -C, --cssFile [cssFile]                         CSS file for the page.
  -I, --svgId [svgId]                             The id attribute for the SVG element to be rendered.
  -s, --scale [scale]                             Puppeteer scale factor (default: 1)
  -f, --pdfFit                                    Scale PDF to fit chart
  -q, --quiet                                     Suppress log output
  -p --puppeteerConfigFile [puppeteerConfigFile]  JSON configuration file for puppeteer.
  --iconPacks <icons...>                          Icon packs to use, e.g. @iconify-json/logos. These should be Iconify NPM packages that expose a icons.json file.
  -h, --help                                      display help for command
```

### Advanced Configuration

#### Puppeteer Configuration

Create a `puppeteer-config.json` file for advanced browser settings:

```json
{
  "args": ["--no-sandbox", "--disable-setuid-sandbox"],
  "viewport": {
    "width": 1200,
    "height": 800,
    "deviceScaleFactor": 2
  }
}
```

Usage:
```bash
npx mmdc -i diagram.mermaid -o diagram.png -p puppeteer-config.json
```

#### Mermaid Configuration

Create a `mermaid-config.json` file for diagram-specific settings:

```json
{
  "theme": "default",
  "themeVariables": {
    "primaryColor": "#ff6b35",
    "primaryTextColor": "#000000",
    "primaryBorderColor": "#ff6b35"
  }
}
```

Usage:
```bash
npx mmdc -i diagram.mermaid -o diagram.png -c mermaid-config.json
```

## Quality and Resolution

### Known Limitations

1. **DPI Control**: PNG output defaults to 72 DPI equivalent
2. **Text Rendering**: Low-resolution text can appear blurry at default settings
3. **File Size**: Higher scale factors produce larger files

### Solutions

1. **Scale Factor**: Primary method for improving PNG quality
   - `-s 2`: Doubles resolution (recommended for documentation)
   - `-s 3`: Triples resolution (for very high-quality needs)

2. **Custom Dimensions**: Adjust width/height based on diagram complexity
   - Simple diagrams: 800x600 (default)
   - Complex diagrams: 1200x1400 or higher

3. **Device Scale Factor**: Use Puppeteer config for fine-tuned control

## Troubleshooting

### Common Issues

#### 1. Low Resolution Output
**Problem**: PNG text appears blurry or pixelated
**Solution**: Use scale factor `-s 2` or higher

#### 2. Installation Issues
**Problem**: Global installation fails or `mmdc` not found
**Solution**: Use local installation with `npx mmdc` or install locally

#### 3. Chromium Dependencies
**Problem**: Error about missing Chromium
**Solution**: Ensure all dependencies are installed, consider using Docker

#### 4. Large File Sizes
**Problem**: PNG files are too large
**Solution**: Reduce scale factor or use SVG format for vector graphics

### Error Messages

- **"Could not find Chromium"**: Install/update Node.js and dependencies
- **"Input file not found"**: Check file path and permissions
- **"Failed to launch browser"**: Check Puppeteer dependencies

## Development Workflow

### Project Integration

1. **Create Mermaid Files**: Use `.mermaid` extension for source files
2. **Generate PNGs**: Use npm scripts for consistent generation
3. **Version Control**: Track both `.mermaid` source and `.png` output
4. **Documentation**: Reference PNGs in Markdown documentation

### Recommended File Structure

```
docs/reference/
├── ARCHITECTURE_TOOLS.mermaid    # Source diagram
├── ARCHITECTURE_TOOLS.png        # Generated PNG
└── ARCHITECTURE_MERMAID.md      # This documentation
```

### NPM Scripts

Consider adding these scripts to `package.json`:

```json
{
  "scripts": {
    "diagram:convert": "npx mmdc -i docs/reference/ARCHITECTURE_TOOLS.mermaid -o docs/reference/ARCHITECTURE_TOOLS.png -w 1200 -H 1400 -s 2 -b transparent",
    "diagram:preview": "npx mmdc -i docs/reference/ARCHITECTURE_TOOLS.mermaid -o preview.png -s 1 -b white"
  }
}
```

## Examples

### Basic Conversion

```bash
# Simple PNG conversion
npx mmdc -i diagram.mermaid -o diagram.png

# High-quality PNG with transparent background
npx mmdc -i diagram.mermaid -o diagram.png -s 2 -b transparent
```

### Advanced Conversion

```bash
# Full-featured high-quality conversion
npx mmdc -i ARCHITECTURE_TOOLS.mermaid -o ARCHITECTURE_TOOLS.png \
  -w 1200 -H 1400 -s 2 -b transparent -t default

# Dark theme with custom dimensions
npx mmdc -i diagram.mermaid -o diagram-dark.png \
  -w 1600 -H 1200 -s 2 -b transparent -t dark
```

### Batch Processing

```bash
# Convert all .mermaid files in directory
for file in *.mermaid; do
  npx mmdc -i "$file" -o "${file%.mermaid}.png" -s 2 -b transparent
done
```

### Markdown Integration

```bash
# Process Markdown file with embedded diagrams
npx mmdc -i README.md -o images/
```

## Project Usage

### Current Implementation

The Spideryarn Reading project uses Mermaid for architectural diagrams:

- **Source**: `docs/reference/ARCHITECTURE_TOOLS.mermaid`
- **Generated**: `docs/reference/ARCHITECTURE_TOOLS.png`
- **Settings**: 1200x1400 pixels, 2x scale, transparent background

### Generation Command

```bash
cd docs/reference
npx mmdc -i ARCHITECTURE_TOOLS.mermaid -o ARCHITECTURE_TOOLS.png \
  -w 1200 -H 1400 -s 2 -b transparent -t default
```

This configuration produces high-quality PNGs suitable for documentation while maintaining reasonable file sizes.

---

**Last Updated**: 2025-06-29  
**Mermaid CLI Version**: 11.6.0  
**Next Review**: When Mermaid CLI is updated or new features are needed