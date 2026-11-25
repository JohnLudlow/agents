---
description: "Audience alignment and locale/language-specific documentation"
---

# Audience & Localization

Detailed audience and localization guidance for jl-documenter. The entry point
keeps audience alignment briefly inline; read this for localization and
synchronization strategy.

## Audience alignment

Before delegating, state the intended audience for every section, such as:

- end users

- developers

- operators

- maintainers

- security reviewers

Do not let one section drift into developer depth while its sibling is written for casual end
users unless the outline explicitly separates those audiences.

### Localization and language-specific documentation

If delegating to multiple language-specific documenters:

- keep one source outline and one section inventory

- synchronize terminology, product names, and admonition semantics across locales

- note locale-specific examples, legal references, operational assumptions, or screenshots explicitly

- treat translated or locale-specific sections as versioned siblings that must be reviewed for
  semantic parity, not merely formatting parity

### Synchronization strategy

For multi-locale documentation:

1. approve the source-language structure first

2. delegate localized sections against the same approved outline

3. review localized terminology and examples for locale fit

4. confirm version numbers, references, and links remain aligned across locales

## See Also

- [SKILL.md](../SKILL.md#audience--localization) — Audience alignment summary
