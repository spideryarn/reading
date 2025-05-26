# CLAUDE.md - Spideryarn Reading Codebase Guide

This document provides essential context for Claude instances working on the Spideryarn Reading project.

see:
- `README.md` for goals/intents/features
- `docs/CODING_PRINCIPLES.md`
- `docs/ARCHITECTURE.md`


## Project Overview

Spideryarn Reading is an AI-assisted document reading and analysis application, currently in early prototype phase. The main goal is to help humans digest written non-fiction material better through AI-powered features like hierarchical summaries, glossaries, and intelligent navigation.

FYI: the `backup` folder contains the previous, deprecated SvelteKit implementation. You can mostly ignore this.


## Key Architectural Decisions

Based on README.md, the following architecture decisions have been made:

- **Frontend Framework**: Next.js with TypeScript and Tailwind CSS (transitioning from SvelteKit)
- **AI Integration**: Anthropic Claude Sonnet 4 for all AI-related features
- **Storage**: Supabase (Postgres with realtime capabilities) from the start
- **Data Structure**: Decompose HTML documents into individual elements stored as separate database rows with parent/child relationships
- **Frontend State**: Virtual DOM approach - maintain document structure as React state/context
- **Background Processing**: Frontend-driven queue initially, with API calls to backend
- **MVP Focus**: Basic document display with hierarchical summaries as the core feature

## Build and Test Commands

`npm run dev`

The user is already running this in a separate terminal. If you need them to restart it, ask them.

You can see the logs for it in `dev.log`.

Visible at: http://localhost:3001/ (port configurable via PORT environment variable in `.env.local`, loaded by dotenv-cli before running npm)

If you ever need access to the browser (e.g. console logs, network requests, screenshots, etc), use curl or Playwright MCP (this works well, but try to be sparing about letting it fill up the context window).


## Project Structure

The codebase currently has two main parts:

1. **Active Development** (root directory):
   - README.md contains architectural decisions and planning
   - Most code has been moved to backup/

2. **IGNORE - Backup Folder** (previous prototype SvelteKit implementation)


## Environment Variables

see `.env`

Required environment variables:
- `ANTHROPIC_API_KEY` - API key for Claude access


## Style

Use British spelling.
