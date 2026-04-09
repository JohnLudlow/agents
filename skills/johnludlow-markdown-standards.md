# Markdown and Documentation Standards

## Overview

This skill defines standards for all markdown documents produced by johnludlow agents.

## Markdown Validation

All documents MUST:

- Pass `rumdl check .`
- Use proper heading hierarchy (h1 > h2 > h3, etc.)
- Have valid internal and external links
- Use consistent code block formatting with language specification

Platform definition files have additional requirements:

- Canonical source files in `agents/` and `skills/` are plain markdown (no frontmatter)
- OpenCode definitions (`opencode/agents/*.md`) MUST include YAML frontmatter with metadata:
  - description
  - mode
  - temperature
  - permissions
- Copilot agent definitions (`.github/agents/*.md`) MUST include simplified Copilot-compatible YAML frontmatter:
  - description
  - temperature
- Copilot skill definitions (`.github/skills/*.md`) MUST include simplified Copilot-compatible YAML frontmatter:
  - description

## Document Structure

- Start with an h1 title
- Include a brief description section
- Use descriptive section headings
- Maintain consistent indentation
- Include table of contents for documents > 500 lines

## Plain Language Standards

- Define all jargon terms on first use
- Use active voice
- Keep sentences concise (< 20 words average)
- Use lists instead of dense paragraphs
- Include examples for complex concepts

## Link Validation

All links MUST:

- Be properly formatted with markdown syntax
- Point to valid resources
- Use relative paths for internal links
- Include descriptive link text (not "click here")

## Code Examples

- Include language specification in fenced code blocks
- Provide complete, runnable examples
- Include comments explaining complex logic
- Match current project conventions

## YAML Frontmatter Examples

YAML frontmatter is required for **platform definition files** (generated artifacts).
It is **not** required for general documentation or templates unless a specific consumer requires it.

### OpenCode (generated `opencode/agents/*.md`)

```yaml
---
description: Plans features and creates detailed implementation plans
mode: subagent
temperature: 0.3
permission:
  read:
    "*": allow
  # ...
---
```

### GitHub Copilot agent (generated `.github/agents/*.md`)

```yaml
---
description: Plans features and creates detailed implementation plans
temperature: 0.3
---
```

### GitHub Copilot skill (generated `.github/skills/*.md`)

```yaml
---
description: Markdown and documentation standards (rumdl, structure, links, code blocks)
---
```
