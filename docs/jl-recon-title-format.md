# jl-recon Title Format Configuration

This guide describes title patterns for new Recon ticket types.

The shipped title contract is in
[`SHARED_BASE_SCHEMA.md`](../.apm/skills/jl-ticket-templates/references/SHARED_BASE_SCHEMA.md#title-format).
It is checked by `validateTitleFormat` in `jl-ticket-templates/validator.js`.
This page is a human guide that points to it.

## Supported Keys and Defaults

Configure `jl_recon.title_format` in `AGENTS.md` or `CONTRIBUTING.md`. Each key uses the underscore spelling shown below, including quiz keys.

| Key | Default pattern | Variable |
| --- | --- | --- |
| `map` | `Map: {destination}` | `destination` |
| `research` | `Research: {topic}` | `topic` |
| `prototype` | `Prototype: {concept}` | `concept` |
| `quiz_requirements` | `Quiz (Requirements): {question}` | `question` |
| `quiz_understanding` | `Quiz (Understanding): {question}` | `question` |
| `learn` | `Learn: {topic}` | `topic` |
| `prerequisite` | `Prerequisite: {work}` | `work` |

The old `quiz` and `task` keys are retired for new tickets. They are not aliases for the new keys.

## Example

```yaml
jl_recon:
  title_format:
    map: "[Map] {destination}"
    research: "Research: {topic}"
    prototype: "Prototype: {concept}"
    quiz_requirements: "Quiz (Requirements): {question}"
    quiz_understanding: "Quiz (Understanding): {question}"
    learn: "Learn: {topic}"
    prerequisite: "Prerequisite: {work}"
```

Configured keys override built-in patterns. A user-provided title takes
precedence. If a value is missing, keep the prefix and omit that value.

## Validation and Resolution

`title_format` must be an object with supported keys only.
Each value must be a non-empty string.
Invalid values produce a warning and use the built-in pattern.

Configuration follows `jl-config` precedence: session-specific user direction, then `AGENTS.md`, then `CONTRIBUTING.md`, then built-in defaults.

For full configuration resolution rules, see [`jl-config/SKILL.md`](../.apm/skills/jl-config/SKILL.md).
