# jl-recon Title Format Configuration

This guide explains how to customize issue titles in jl-recon using the `title_format` configuration.

## Overview

When jl-recon creates a map or tickets (quiz, research, prototype, task), it automatically formats issue titles using
templates from your configuration. This allows you to establish consistent naming conventions across your mapping and
exploration work, while still supporting user overrides when needed.

## Default Behavior

Without custom configuration, jl-recon uses sensible defaults:

| Ticket Type | Default Template |
|:------------|:-----------------|
| Map | `Map: {destination}` |
| Quiz | `Quiz: {question}` |
| Research | `Research: {topic}` |
| Prototype | `Prototype: {concept}` |
| Task | `Task: {work}` |

Examples:

- Map: "Map: Implement dark mode support"
- Quiz: "Quiz: What API versioning strategy should we use?"
- Research: "Research: Current state of async/await in Node.js 22"
- Prototype: "Prototype: Side-by-side comparison UI"
- Task: "Task: Request API access credentials"

## Configuration

Add `title_format` settings to your `AGENTS.md` or `CONTRIBUTING.md` file. Each ticket type can have its own template.

### Basic Example

```yaml
jl_recon:
  title_format:
    map: "Map: {destination}"
    quiz: "Quiz: {question}"
    research: "Research: {topic}"
    prototype: "Prototype: {concept}"
    task: "Task: {work}"
```

### Custom Examples

**Minimalist style** — Use just brackets and subject:

```yaml
jl_recon:
  title_format:
    map: "[Map] {destination}"
    quiz: "[Quiz] {question}"
    research: "[Rsch] {topic}"
    prototype: "[POC] {concept}"
    task: "[Task] {work}"
```

**Verbose style** — Add more context:

```yaml
jl_recon:
  title_format:
    map: "Exploration: {destination}"
    quiz: "Decision: {question}"
    research: "Investigation: {topic}"
    prototype: "Proof of Concept: {concept}"
    task: "Preparatory Work: {work}"
```

**Mixed customization** — Override only what you need:

```yaml
jl_recon:
  title_format:
    map: "[Planning] {destination}"
    research: "Investigation: {topic}"
    # quiz, prototype, task use defaults
```

## Variable Substitution

Each template type supports one variable for automatic substitution:

| Ticket Type | Variable | Filled from |
|:------------|:---------|:------------|
| Map | `{destination}` | The map's resolved destination (what reaching the end looks like) |
| Quiz | `{question}` | The quiz question or decision being made |
| Research | `{topic}` | The research topic or investigation focus |
| Prototype | `{concept}` | The prototype concept or idea being explored |
| Task | `{work}` | The task work description |

**Example substitution:**

User provides: "How should we handle multi-region deployments?"
Template: `Quiz: {question}`
Result: `Quiz: How should we handle multi-region deployments?`

### Missing Variables

If a substitution variable isn't available in the current context (e.g., no question was specified for a quiz yet),
jl-recon uses a sensible fallback:

- Omit the variable placeholder and use the base template
- Example: If template is `Quiz: {question}` but no question is available, title becomes `Quiz:` (which you can then edit)

## User Overrides

Configuration always defers to user intent. If you explicitly provide a title when creating a map or ticket, that title
is used exactly as written—the template is not applied.

Example:

```text
Destination: "Support dark mode"
Map template: "Map: {destination}"
Result if auto-applied: "Map: Support dark mode"
Result if you provide "Dark Mode: Planning & Design": "Dark Mode: Planning & Design"
```

## Setting Precedence

jl-recon resolves configuration using the `jl-config` mechanism:

1. **Session override** — If you explicitly specify a custom title during the session, it wins
2. **`AGENTS.md`** — Repository-specific overrides (applies to all sessions in this repo)
3. **`CONTRIBUTING.md`** — Repository defaults
4. **jl-recon built-in defaults** — Fallback if nothing above is configured

**Example precedence:**

```yaml
# CONTRIBUTING.md (lowest priority)
jl_recon:
  title_format:
    map: "Map: {destination}"

# AGENTS.md (higher priority, overrides CONTRIBUTING.md)
jl_recon:
  title_format:
    map: "[Exploration] {destination}"

# Session override (highest priority)
# User says: "Use this title for the map: Dark Mode Investigation"
# Result: "Dark Mode Investigation" (template not applied)
```

For full config resolution rules, see [`jl-config/SKILL.md`](../.apm/skills/jl-config/SKILL.md).

## Validation

Configuration is validated at startup. Invalid settings produce clear warnings:

```text
[WARN] jl-recon: 'title_format' must be an object with string-valued keys,
  not a list
  File: AGENTS.md [line 10]
  Fix: Change to YAML object syntax: title_format: { map: "Map: {destination}" }
```

Common issues:

| Problem | Fix |
|:--------|:----|
| `title_format` is a list, not an object | Use YAML object syntax with key-value pairs |
| A template value is not a string (e.g., a number) | Wrap the value in quotes: `map: "Map: {destination}"` |
| An invalid ticket type like `quiz_question` | Use one of: `map`, `quiz`, `research`, `prototype`, `task` |
| A template is an empty string | Provide a non-empty template or remove the key to use the default |

## Examples

### Example 1: Simple Branded Prefix

Add a team or project prefix to all issues:

```yaml
jl_recon:
  title_format:
    map: "[Planning] {destination}"
    quiz: "[Decision] {question}"
    research: "[Rsch] {topic}"
    prototype: "[POC] {concept}"
    task: "[Prep] {work}"
```

Result:

- `[Planning] Implement dark mode`
- `[Decision] Which CSS framework should we use?`
- `[Rsch] Performance characteristics of Lit vs FAST`

### Example 2: Detailed Contextual Titles

More verbose titles that make issue lists clearer:

```yaml
jl_recon:
  title_format:
    map: "Feature Planning: {destination}"
    quiz: "Design Decision: {question}"
    research: "Technical Investigation: {topic}"
    prototype: "Exploratory Prototype: {concept}"
    task: "Setup / Prerequisites: {work}"
```

Result:

- `Feature Planning: Support WebSocket connections`
- `Design Decision: Monorepo vs. separate packages?`
- `Technical Investigation: WebSocket library ecosystem in 2026`
- `Exploratory Prototype: Real-time message sync using WebSocket`
- `Setup / Prerequisites: Request OAuth token for API testing`

### Example 3: Minimal Brackets Only

Short, scan-friendly titles:

```yaml
jl_recon:
  title_format:
    map: "{destination} [map]"
    quiz: "{question} [?]"
    research: "{topic} [rsch]"
    prototype: "{concept} [poc]"
    task: "{work} [task]"
```

Result:

- `Implement dark mode [map]`
- `Should we use a monorepo? [?]`
- `State of async/await [rsch]`
- `Side-by-side UI comparison [poc]`
- `Request API credentials [task]`

## Related Documentation

- **Skill documentation**: [jl-recon/SKILL.md](../.apm/skills/jl-recon/SKILL.md) — Full skill reference
- **Provider mechanics**: [jl-recon/references/PROVIDERS.md](../.apm/skills/jl-recon/references/PROVIDERS.md) — How
  titles are applied on GitHub, Azure DevOps, and Markdown
- **Configuration guide**: [CONFIGURATION.md](./CONFIGURATION.md) — How jl-recon and other agents are configured
