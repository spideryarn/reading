# CLAUDE.md - Spideryarn Reading Codebase Guide

This document provides essential context for Claude instances working on the Spideryarn Reading project.

see:
- `README.md` for goals/intents/features
- `docs/CODING_PRINCIPLES.md`
- `docs/ARCHITECTURE.md`
- `docs/GIT_COMMITS.md` for using Git

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

## Build, testing, and debugging

Next.js local dev server:
- `npm run dev`
- The user is already running this in a separate terminal. If you need them to restart it, ask them.
- You can see the logs for it in `dev.log`.
- Probably visible at: http://localhost:3001/ (though the port configurable via PORT environment variable in `.env.local`, loaded by dotenv-cli before running npm)

Debugging:
- Gather clues first: have a look at `dev.log` with `tail`, and use `curl` or `Playwright` MCP (for console logs, network requests, screenshots, etc) in a subagent (to avoid filling up the context window).
- And have a look at the list of evergreen docs in `docs/`, and recent planning/decision docs in `planning/`, to see if there's anything relevant that might help you.


## Project Structure

The codebase currently has two main parts:

1. **Active Development** (root directory):
   - README.md contains architectural decisions and planning
   - Most code has been moved to backup/

2. **IGNORE - `obsolete_alternative_version/`** (previous prototype Python implementation, with some nice prompts, e.g. glossary, generate headings)
3. **IGNORE - `backup/`** (previous prototype SvelteKit implementation, almost nothing of value)


## Environment Variables

see `.env.local` (and `.env.example`, though it may not be up-to-date).


## Style

Use British spelling.


## Git

Always follow the instructions in `docs/GIT_COMMITS.md`.
