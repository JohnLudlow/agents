---
name: jl-documenter
description: "Documentation orchestration skill for large, multi-section, or specialist documentation workflows handled by jl-documenter and delegated documenter agents."
---

# jl-documenter

## Overview

This skill documents how `jl-documenter` should plan, delegate, review, and publish documentation work when one writer
is not the right shape for the job. Use it when a documentation request is large enough to split into parallel sections,
specialized enough to benefit from an expert documenter, or broad enough to require multi-author coordination.

`jl-documenter` remains the parent orchestrator. Delegation does not transfer ownership of scope, audience, approval
handling, consolidation, or publication readiness.

## When to Use This Skill

Use this skill when `jl-documenter` needs to:

- split a large documentation project into parallel sections such as API reference, user guide,
  architecture guide, and troubleshooting
- delegate specialized documentation such as performance tuning, security guidance, migration
  notes, or framework-specific guidance
- route implementation-adjacent documentation to `jl-feature-documenter`
- coordinate multiple documentation contributors while preserving one published voice and one approved final artifact
- decide whether a section is small enough to write inline or large enough to hand to a specialist

## Key Principles

- `jl-documenter` owns the parent documentation objective from outline through publication.
- Delegate only bounded sections, not vague goals.
- Resolve approval gates before each delegated section.
- Keep all delegated sections aligned to the same audience, version, and publishing target.
- Consolidate every returned section into one coherent documentation set before publication.
- Require review for each delegated section and for the consolidated output.

## Load contract

Read [references/DELEGATION_WORKFLOWS.md](references/DELEGATION_WORKFLOWS.md) for the full
delegation pipelines, [references/SPECIALIST_SELECTION.md](references/SPECIALIST_SELECTION.md)
for the full specialist table, [references/BRANCH_WORKTREE.md](references/BRANCH_WORKTREE.md)
for branch and worktree management, [references/ARTIFACT_COLLECTION.md](references/ARTIFACT_COLLECTION.md)
for artifact checks, [references/MULTI_AUTHOR_COORDINATION.md](references/MULTI_AUTHOR_COORDINATION.md)
for multi-author coordination, [references/AUDIENCE_LOCALIZATION.md](references/AUDIENCE_LOCALIZATION.md)
for audience and localization detail, [references/PUBLISHING.md](references/PUBLISHING.md) for
publishing workflow and version alignment, and [references/EXAMPLES.md](references/EXAMPLES.md)
for scenarios.

## Configuration

`jl-documenter` reads settings from `jl_approval_gates` configuration in `CONTRIBUTING.md` and
`AGENTS.md`, using `jl-config` for resolution and repository-relative defaults.

### Schema

| Setting | Type | Allowed values | Default | Meaning |
| --- | --- | --- | --- | --- |
| `jl_approval_gates.documentation_approval_required` | boolean | `true`, `false` | `true` | Controls whether delegated documentation sections require an approval prompt |
| `jl_approval_gates.documentation_publish_approval_required` | boolean | `true`, `false` | `true` | Controls whether the final publish step requires explicit approval after section consolidation |

### Resolution rules

- Resolve config before the first delegation decision.
- When `documentation_approval_required` is `true`, prompt before delegating each section.
- When `documentation_publish_approval_required` is `true`, require explicit approval before final publication.
- If config is missing or malformed, default to `documentation_approval_required: true` and
  `documentation_publish_approval_required: true` (human-in-the-loop by default).

Worked examples: [references/CONFIGURATION_EXAMPLES.md](references/CONFIGURATION_EXAMPLES.md).

## Approval Gate Integration

Approval gates apply at each delegation decision point and again before publication when the
resolved publish gate requires it.

### Approval prompt

When `documentation_approval_required` is `true`, use this exact pattern:

`Delegate {section} documentation to {target_agent}? [Approve] [Decline]`

Examples:

- `Delegate API documentation to api-documentation-specialist? [Approve] [Decline]`
- `Delegate architecture documentation to architecture-documenter? [Approve] [Decline]`

### Session-level and per-section behaviour

1. Resolve `jl_approval_gates.documentation_approval_required` at session start.
2. For each candidate delegated section, check the effective approval mode.
3. If `documentation_approval_required` is `true`, prompt before delegating
   each section to the target agent's native delegation in the current harness
   (with inline/manual fallback).
4. If `documentation_approval_required` is `false`, delegation is pre-authorized.
5. If the user declines, record the gap in the documentation plan and explain why delegation was needed.
6. Before publication, resolve `documentation_publish_approval_required` and require approval if `true`.

### Graceful fallback when delegation is unavailable

If the harness cannot spawn subagents, or the needed specialist is unavailable:

- warn the user that delegated documentation is unavailable in the current harness
- offer the inline alternative for the same bounded section
- mark the section as a manual handoff requiring offline completion

Do not pretend delegation occurred when it did not.

## When to Delegate

Delegate when one or more of these conditions are true:

- the documentation set is large enough to split into parallel sections without losing coherence
- a section is specialized enough to benefit from an expert writer, such as performance, security,
  migration, API, or architecture guidance
- code documentation should be written by the implementer-facing documenter, especially when
  implementation details need tight alignment with shipped behavior
- a language-specific or framework-specific section needs focused expertise
- a section is too large, too detailed, or too risky for one inline documentation pass

Do not delegate tiny edits, trivial wording cleanup, or a section whose dependency chain is still
too unclear to bound.

## Documentation Decomposition

`jl-documenter` should decompose large work before drafting begins. Delegation is a first-class
option inside decomposition, not a late escape hatch.

Recommended decomposition order:

1. define the parent documentation objective
2. confirm audience, version, and publication target
3. outline the full document or document set
4. identify bounded sections that can proceed independently
5. decide section-by-section whether to write inline or delegate
6. collect drafts back into one reviewable structure

Typical section splits include:

- API reference
- user guide
- architecture or design guide
- troubleshooting or operations guide
- migration or upgrade notes
- performance or security appendix

## Delegation Workflows

The parent documentation pipeline remains: `outline -> section drafts -> review -> publish`.
Delegation fits between outline and section drafting, and may recur during revision.

Read [references/DELEGATION_WORKFLOWS.md](references/DELEGATION_WORKFLOWS.md) for the full
parent-control pseudocode and workflow steps.

## Specialized Documenter Selection

Choose the target agent based on document type, audience, and complexity: prefer
`jl-feature-documenter` for feature documentation, the most audience-matched specialist for
standalone disciplines, and the narrowest competent specialist when terminology or validation
are domain-sensitive. If no specialist exists in the current harness, document the gap and fall
back according to config. Full table: [references/SPECIALIST_SELECTION.md](references/SPECIALIST_SELECTION.md).

## Branch & Worktree Management

Each delegated section gets isolated workspace state so multiple documenters can work in parallel
without overwriting one another (child branch `docs/{doc-id}/{section}-{agent-id}`, worktree
`worktree-docs-{section}-{unix-seconds}`). Read [references/BRANCH_WORKTREE.md](references/BRANCH_WORKTREE.md)
for branch naming, merge strategy and coordination rules.

## Documentation Artifact Collection

Each delegated documenter returns content and metadata so the parent can
consolidate. Required returned artifacts per section: the draft section content,
section metadata (outline level, intended placement, word count, review status),
declared cross-references to other sections, and open questions, known gaps, and
assumptions. Read [references/ARTIFACT_COLLECTION.md](references/ARTIFACT_COLLECTION.md)
for the consolidation checks.

## Multi-Author Coordination

Delegation creates multiple authors, but publication still requires one coherent review workflow.
Read [references/MULTI_AUTHOR_COORDINATION.md](references/MULTI_AUTHOR_COORDINATION.md) for review
expectations, conflict resolution and the review workflow.

## Audience & Localization

Delegated sections describe one coherent documentation experience: state the intended audience
for each section before delegating. Read [references/AUDIENCE_LOCALIZATION.md](references/AUDIENCE_LOCALIZATION.md)
for localization and synchronization strategy.

## Publishing & Versioning

Do not publish until every required delegated section is reviewed,
structurally integrated, and aligned to the target release. Read
[references/PUBLISHING.md](references/PUBLISHING.md) for the publication workflow
and version alignment.

## Review Process

The normal documentation review process still applies, but multi-author work adds section-level
review and consolidation review.

- Review each delegated section before merge into the parent document set.
- Review the consolidated document set for cohesion after section merge.
- Use adversarial or subject-matter review when a section is high-risk, externally visible, or
  difficult to validate from the repository alone.
- Do not treat section approval as automatic publication approval.

## Publishing

Publishing may be a simple handoff for small inline docs or a gated coordination event for delegated multi-section documentation.

- Single-section inline docs may publish after standard review when no extra publish gate applies.
- Delegated multi-section docs should publish only after all approved sections are consolidated and validated together.
- If a critical delegated section is missing and fallback is `delay-publication`, postpone
  publication rather than shipping an incomplete guide.

## References

- `jl-recon` — `../jl-recon/SKILL.md` for inherited gate handling and graceful AFK delegation patterns
- `jl-feature-documenter` — `../../agents/jl-feature-documenter.agent.md` for implementation-facing documentation ownership
- `jl-documentation-template` — `../jl-documentation-template/SKILL.md` for canonical structure of produced docs
- `jl-markdown-standards` — `../jl-markdown-standards/SKILL.md` for markdown formatting and validation requirements
- `jl-config` — `../jl-config/SKILL.md` for configuration resolution precedence and validation model
