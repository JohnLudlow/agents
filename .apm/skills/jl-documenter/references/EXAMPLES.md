---
description: "Illustrative jl-documenter scenarios"
---

# Examples

Illustrative scenarios for jl-documenter delegation, read for planning work or
unclear artifact relationships.

## Example 1: Large product documentation split by specialty

A product documentation refresh includes API reference, user onboarding, and architecture guidance.

```text
outline full docs set
  -> classify sections as api, user-guide, architecture
  -> delegate API documentation to api-documentation-specialist
  -> delegate user guide to user-documentation-specialist
  -> delegate architecture guide to architecture-documenter
  -> collect section drafts and metadata
  -> normalize headings, links, and terminology
  -> review consolidated docs
  -> publish when all sections are approved
```

### Example 2: Feature documentation delegated to `jl-feature-documenter`

A new feature ships with developer-facing usage notes and examples tightly coupled to implementation details.

```text
identify implementation-adjacent feature section
  -> resolve documentation approval gate
  -> ask "Delegate feature documentation to jl-feature-documenter? [Approve] [Decline]"
  -> on approval, create docs/{doc-id}/feature-jl-feature-documenter branch
  -> collect draft, examples, and review status
  -> merge into parent docs set after review
```

### Example 3: Harness unavailable fallback

A browser or restricted harness cannot spawn the needed specialist documenter.

```text
attempt section delegation
  -> detect harness limitation
  -> warn that delegated documentation is unavailable
  -> if fallback is inline, write the bounded section inline
  -> if fallback is manual, hold the section for human follow-up
  -> if fallback is delay-publication, block publication until the specialist pass can occur
```

## See Also

- [SKILL.md](../SKILL.md) — Orchestration model
- [SPECIALIST_SELECTION.md](SPECIALIST_SELECTION.md) — Full specialist table
- [DELEGATION_WORKFLOWS.md](DELEGATION_WORKFLOWS.md) — Full workflows
