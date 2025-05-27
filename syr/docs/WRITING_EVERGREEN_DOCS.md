# Writing evergreen documentation

see also: `docs/WRITING_PLANNING_DOCS.md`


# What are evergreen docs?

This is for writing evergreen, general documentation on how the system works.

These should be a concise, clear, well-structured, complete-enough, up-to-date description of things. By "complete-enough", they should cover most of the important topics, if only to signpost to where more information can be found, or to the code itself.

They should refer to one another, and avoid too much overlap in content, so that if information changes, we ideally only need to change the documentation in one place.


# Format

They should be written in Markdown, stored as `docs/TOPIC_NAME.md`.


## Document structure

They might be organised into something like the following sections. Use your judgment. Probably only a few of these will be relevant for each doc, feel free to rename them, etc.


### Introduction

2-sentence summary of the topic, and what the document covers.

### See also

Bullet-point list of other relevant docs, code, webpages, or other resources that provide related information, or more detail. Perhaps provide a 1-sentence summary or explanation of how each one is relevant. For example:

- `docs/WRITING_PLANNING_DOCS.md` - for information about writing *ephemeral* decision/planning/project management docs

Add references to and from this new doc (e.g. in relevant code, planning docs in `planning/*.md`, etc) - use a subagent for tbis


### Principles, key decisions

- Include any specific principles/approaches or decisions that have been explicitly agreed with the user (over and above existing Cursor rules, project examples, best practices, etc).
- As you get new information from the user, update this doc so it's always up-to-date.

### [Provide a few detailed sections here, depending on the topic]

Include as appropriate:
- high-level overview, architecture
- common patterns, howtos
- examples
- gotchas
- limitations
- troubleshooting
- planned future work


### Appendix

Add any other important context here, e.g.
- example data
- other information that should be capture but doesn't fit neatly in the above sections
