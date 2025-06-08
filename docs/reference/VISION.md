# Vision

Spideryarn Reading is envisioned as a professional AI-assisted document reading and analysis tool, designed to help experts make better decisions and develop deeper understanding through enhanced document comprehension.

## See also

- `README.md` - Current implementation goals and features
- `docs/reference/ARCHITECTURE.md` - Technical architecture decisions and rationale
- `docs/reference/PROJECT_STATUS.md` - Current development state and immediate roadmap
- `docs/reference/CODING_PRINCIPLES.md` - Development philosophy emphasising rapid prototyping
- `planning/*.md` - Historical decision context and feature planning documents

## Core Vision

### Primary Mission

To help humans digest written non-fiction material better - enabling them to:
- **Get the gist or extract quotes and relevant information faster**
- **See structure and take different trajectories through documents**
- **Clear up confusions and make sense of complex parts**
- **Get up to speed on terminology or requisite background**
- **Understand core ideas more deeply**
- **Compare with existing knowledge or other sources**
- **Evaluate what's trustworthy and see potential flaws**
- **Chat with an AI interlocutor and think things through**
- **Generate, evaluate, and manage new/varied/complex ideas**

The ultimate goal is to **enable humans to make better decisions through better reading and analysis**, while ensuring the human remains the central decision-maker and critical thinker.

### Human-AI Philosophy

The AI should do absolutely everything possible to empower and augment the human, enabling better understanding and potentially faster/more efficient processing. **However, the AI must never replace human judgment or critical thinking.**

**Key principle**: Think of having "a bunch of smart postdocs who you could give any instructions to" - what would you ask them to do to enable you to be the most effective version of yourself?

**Critical risk to avoid**: The AI doing too much work, causing humans to become lazy or atrophy by not doing the intellectual work themselves, thus failing to internalise knowledge effectively.

## Target Users & Market

### Primary User Persona ✓
**Scientific journal editors and reviewers** - professionals who need to:
- Quickly assess manuscript quality and significance
- Identify methodological issues or logical gaps
- Compare submissions against existing literature
- Make publication decisions based on thorough understanding

### Broader Professional Market 📋
- **Academics, researchers, editors & reviewers, journalists, strategists, politicians, investors, commentators, leaders** - anyone who needs to read a lot of non-fiction

### Target Organizations 📋
- **Universities, journals, or research companies** - paying for their employees

## Product Positioning

### Unique Value Proposition

**Reading-focused, not writing-focused**: Unlike Notion AI, Obsidian, or other productivity tools that emphasise content creation and collaboration, Spideryarn Reading is explicitly designed for **document comprehension and analysis**.

**Single-document deep dive**: Currently focused on single documents at a time, though eventually may add multi-document features like comparison, synthesis, etc.

### Competitive Differentiation

Notion and Obsidian are more like writing tools or at least collaboration tools because you're explicitly adding a lot of text, and this is explicitly a reading tool currently focused on single documents at a time.

## Business Model

### Revenue Strategy ✓
**Professional subscription model** targeting institutional and individual professional users:

- **Estimated pricing**: $20/month (or perhaps $10 or $50 or tiers) for uploading as many papers as you like and having the AI process them
- **AI output sharing**: Maybe there'll be some kind of sense of the AI's AI-generated output being pooled or available, but for people that want to generate new AI output, they definitely have to pay for that

## Product Development Philosophy

### Development Approach ✓
**Rapid prototyping for early-stage discovery**: This is a prototype with no users yet. We want to develop fast and experiment to figure out which features provide the most value.

**Root cause solutions**: Fix underlying issues rather than applying band-aids. Prefer clear failures over silent defaults when assumptions aren't met.

**Human-in-the-loop validation**: If unexpected issues arise, stop and discuss rather than pushing through. Be a collaborative development partner.

### Quality vs Speed Trade-offs
Those are two different modes, and I don't know which we're going to want to support most. Maybe both.

## Feature Roadmap

### Current Capabilities ✓
- **Single-document focus** - HTML format (PDF conversion available)
- **AI-powered features** - Hierarchical summaries, glossaries, semantic headings
- **Interactive navigation** - Multi-pane layout with intelligent scrolling
- **Professional chat interface** - Document-contextual AI conversations
- **Multi-LLM support** - Anthropic Claude and Google Gemini integration

### Long-term Vision 📋
- **Multi-document features** - Eventually may add multi-document comparison, synthesis, folders for storing multiple documents

## Success Metrics

The goal is for this to be about better decisions, that certainly fits with the journal reviewers and editors. Or it could be just deeper understanding and better ideas.

## Risk Mitigation

### Human Atrophy Prevention
**Primary concern**: A really big risk is that the AI does too much and the human gets lazy or atrophies by not doing the work and doesn't internalise things as well. We're trying to figure out how to avoid that failure mode.

## Long-term Strategic Vision

### 5-Year Outlook
Probably a professional tool for academics and people like that. It'll be paid. Maybe eventually this will be something that universities, journals, or research companies pay for, for their employees.