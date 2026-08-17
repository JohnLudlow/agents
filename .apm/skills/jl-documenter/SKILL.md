---
name: jl-documenter
description: "Documentation orchestration skill for large, multi-section, or specialist documentation workflows handled by jl-documenter and delegated documenter agents."
---

# jl-documenter

## Overview

This skill documents how `jl-documenter` should plan, delegate, review, and publish documentation work when one writer is not the right shape for the job. Use it when a documentation request is large enough to split into parallel sections, specialized enough to benefit from an expert documenter, or broad enough to require multi-author coordination.

`jl-documenter` remains the parent orchestrator. Delegation does not transfer ownership of scope, audience, approval handling, consolidation, or publication readiness.

## When to Use This Skill

Use this skill when `jl-documenter` needs to:

- split a large documentation project into parallel sections such as API reference, user guide, architecture guide, and troubleshooting

- delegate specialized documentation such as performance tuning, security guidance, migration notes, or framework-specific guidance

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

## Configuration

`jl-documenter` reads settings from `jl_approval_gates` configuration in `CONTRIBUTING.md` and `AGENTS.md`, using `jl-config` for resolution and repository-relative defaults.

### Schema

| Setting | Type | Allowed values | Default | Meaning |
| --- | --- | --- | --- | --- |
| `jl_approval_gates.documentation_approval_required` | boolean | `true`, `false` | `true` | Controls whether delegated documentation sections require an approval prompt |
| `jl_approval_gates.documentation_publish_approval_required` | boolean | `true`, `false` | `true` | Controls whether the final publish step requires explicit approval after section consolidation |

### Resolution rules

- Resolve config before the first delegation decision.

- When `documentation_approval_required` is `true`, prompt before delegating each section.

- When `documentation_publish_approval_required` is `true`, require explicit approval before final publication.

- If config is missing or malformed, default to `documentation_approval_required: true` and `documentation_publish_approval_required: true` (human-in-the-loop by default).

### Example configuration

In `CONTRIBUTING.md`:

```yaml
jl_approval_gates:
  documentation_approval_required: true
  documentation_publish_approval_required: true
```

In `AGENTS.md`:

```yaml
jl_approval_gates:
  documentation_approval_required: false
```

## Approval Gate Integration

Approval gates apply at each delegation decision point and again before publication when the resolved publish gate requires it.

### Approval prompt

When `documentation_approval_required` is `true`, use this exact pattern:

`Delegate {section} documentation to {target_agent}? [Approve] [Decline]`

Examples:

- `Delegate API documentation to api-documentation-specialist? [Approve] [Decline]`

- `Delegate architecture documentation to architecture-documenter? [Approve] [Decline]`

### Session-level and per-section behaviour

1. Resolve `jl_approval_gates.documentation_approval_required` at session start.

2. For each candidate delegated section, check the effective approval mode.

3. If `documentation_approval_required` is `true`, prompt before calling `DelegateToSubagent`.

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

- a section is specialized enough to benefit from an expert writer, such as performance, security, migration, API, or architecture guidance

- code documentation should be written by the implementer-facing documenter, especially when implementation details need tight alignment with shipped behavior

- a language-specific or framework-specific section needs focused expertise

- a section is too large, too detailed, or too risky for one inline documentation pass

Do not delegate tiny edits, trivial wording cleanup, or a section whose dependency chain is still too unclear to bound.

## Documentation Decomposition

`jl-documenter` should decompose large work before drafting begins. Delegation is a first-class option inside decomposition, not a late escape hatch.

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

The parent documentation pipeline remains:

`outline -> section drafts -> review -> publish`

Delegation fits between outline and section drafting, and may recur during revision.

### Parent control pseudocode

```text
resolve documentation approval config
build outline and section list
for each section:
  classify section type, audience, and complexity
  if section is large or specialist:
    resolve effective approval mode
    choose target agent
    if approval required:
      ask "Delegate {section} documentation to {target_agent}? [Approve] [Decline]"
    if approved:
      create section worktree + branch
      DelegateToSubagent(section)
      collect section draft + metadata
    else:
      apply fallback
  else:
    draft inline
normalize all sections
review consolidated output
if publish gate requires approval:
  ask for publication approval
publish only after all required sections are approved
```

### Decomposition workflow

```text
large documentation request
  -> create outline
  -> break outline into bounded sections
  -> evaluate each section for specialization, size, and audience fit
  -> delegate approved sections
  -> write simple sections inline
  -> consolidate returned drafts into the master document
```

### Review and revision workflow

```text
delegated section draft returned
  -> verify metadata and structure
  -> review for tone, accuracy, completeness, and clarity
  -> if approved, merge into master document
  -> if revision needed, return targeted feedback to the same section owner or rewrite inline
```

## Specialized Documenter Selection

Choose the target agent based on document type, audience, and complexity.

| Section type | Typical audience | Use when | Target agent |
| --- | --- | --- | --- |
| `feature` | developers or users | feature behavior, workflows, shipped capabilities, implementation-adjacent guidance | `jl-feature-documenter` |
| `api` | developers and integrators | endpoint, contract, request/response, SDK, or usage reference | `api-documentation-specialist` |
| `user-guide` | end users or operators | task-based guidance, onboarding, tutorials, walkthroughs | `user-documentation-specialist` |
| `architecture` | developers, maintainers, architects | design intent, system boundaries, component interaction, trade-offs | `architecture-documenter` |
| `troubleshooting` | operators, support, maintainers | diagnosis steps, failure modes, remediation guidance | `support-documentation-specialist` |
| `performance` | operators, advanced developers | tuning, profiling, scaling, bottlenecks, capacity guidance | specialist performance documenter |
| `security` | operators, security reviewers, developers | hardening, threat notes, safe defaults, compliance-sensitive guidance | specialist security documenter |
| `migration` | existing adopters and maintainers | version-to-version changes, upgrade sequence, compatibility notes | migration documenter |
| `localization` | locale-specific audiences | translated or region-tailored guidance | language-specific documenter |

Selection rules:

- Prefer `jl-feature-documenter` for feature documentation and implementation-adjacent sections already aligned to repository documentation patterns.

- Prefer the most audience-matched specialist when the section is a standalone discipline such as API, architecture, or troubleshooting.

- Prefer the narrowest competent specialist rather than a general documenter when terminology, examples, or validation are domain-sensitive.

- If no specialist exists in the current harness, document the gap and fall back according to config.

## Model Selection

Model selection for documentation delegation follows the shared hierarchy:
global default < per-agent default < per-type default < per-task override.

For `jl-documenter`, the per-agent default is `claude-sonnet-5` because
documentation synthesis, tone normalization, and cross-section consistency
usually benefit from strong reasoning.

Resolve models in this order:

1. explicit `DelegationRequest.model`
2. `jl_subagent_models.overrides.<task-key>`
3. `jl_subagent_models.<delegation-type>`
4. `jl-documenter` per-agent default
5. `jl_subagent_models.default`

Typical mapping:

- `documentation` -> `jl_subagent_models.documentation`

If a chosen model is unavailable in the current harness, continue down the
hierarchy until an available model is found and record the substitution in the
consolidated publication summary.

Example configuration:

```yaml
jl_subagent_models:
  default: "claude-sonnet-5"
  documentation: "claude-sonnet-5"
  overrides:
    migration-guide-rewrite: "claude-opus-4.5"
```

### Concrete examples

1. Research-style documentation analysis with override:
   a difficult migration guide can explicitly request `claude-opus-4.5` for one
   bounded rewrite task.
2. Test-generation adjacent docs:
   when documenting performance-test guidance, keep normal docs on Claude while
   a generated test appendix may explicitly use `gpt-4-turbo` if requested.
3. Harness fallback:
   if browser harness cannot honor the requested model, fall back through the
   hierarchy and clearly report which model actually wrote the delegated
   section.

## Branch & Worktree Management

Each delegated section gets isolated workspace state so multiple documenters can work in parallel without overwriting one another.

### Branch naming

- Parent documentation branch: choose the session's main documentation branch as the coordination root.

- Child section branch pattern: `docs/{doc-id}/{section}-{agent-id}`

- Each child branch must track back to the main documentation branch used by the parent `jl-documenter` session.

### Worktree naming

Use this naming pattern for section worktrees:

`worktree-docs-{section}-{unix-seconds}`

### Coordination rules

- one delegated section per child branch

- keep section scope bounded to its assigned branch

- merge completed sections back into the parent documentation branch only after review

- offer manual review before cleanup of child worktrees and branches

### Merge strategy

Choose a merge strategy that matches the documentation set:

- single PR or single review artifact when the document only makes sense as one coordinated publish event

- separate PRs per section when review ownership differs or when sections can land independently without confusing readers

In both cases, the parent documentation branch remains the roll-up point for consistency checks and publication readiness.

## Documentation Artifact Collection

Each delegated documenter should return both content and metadata so the parent can consolidate intelligently.

### Required returned artifacts

Each delegated section should return:

- the draft section content

- section metadata including outline level, intended placement, word count, and review status

- declared cross-references to other sections

- open questions, known gaps, and assumptions

### Consolidation checks

After collecting all sections, `jl-documenter` must:

- verify heading hierarchy and placement are consistent

- normalize formatting across code blocks, admonitions, tables, images, and lists

- check for content gaps between sections

- check for overlap, duplication, or contradictions

- verify internal links and cross-references within and across sections

- confirm terminology and voice are consistent across all authors

Do not publish a stitched document set that reads like unrelated fragments.

## Multi-Author Coordination

Delegation creates multiple authors, but publication still requires one coherent review workflow.

### Review expectations

Every delegated section must be reviewed by one or more of:

- the section author

- a subject-matter expert

- a human reviewer

- the parent `jl-documenter` during consolidation

Review for:

- tone consistency

- technical accuracy

- completeness against the agreed outline

- clarity for the intended audience

- consistency with adjacent sections

### Conflict resolution

If two sections overlap or contradict one another:

- mediate scope boundaries in the parent outline

- request revision from the affected delegated author when that preserves expertise and accountability

- rewrite inline only when faster and safer than a second delegation round

- record unresolved conflicts as publication blockers

### Review workflow

```text
delegated agent provides draft
  -> parent checks structure and metadata
  -> reviewer or subject-matter expert checks accuracy and clarity
  -> approve or request revision
  -> repeat until accepted or intentionally deferred
```

### Coordination with `jl-feature-documenter`

When `jl-feature-documenter` owns implementation-facing feature docs:

- avoid duplicating the same behavior description in a second general section

- let implementation docs carry detailed feature mechanics

- let broader product or platform docs link to the feature section instead of repeating it

## Audience & Localization

Delegated sections must still describe one coherent documentation experience.

### Audience alignment

Before delegating, state the intended audience for every section, such as:

- end users

- developers

- operators

- maintainers

- security reviewers

Do not let one section drift into developer depth while its sibling is written for casual end users unless the outline explicitly separates those audiences.

### Localization and language-specific documentation

If delegating to multiple language-specific documenters:

- keep one source outline and one section inventory

- synchronize terminology, product names, and admonition semantics across locales

- note locale-specific examples, legal references, operational assumptions, or screenshots explicitly

- treat translated or locale-specific sections as versioned siblings that must be reviewed for semantic parity, not merely formatting parity

### Synchronization strategy

For multi-locale documentation:

1. approve the source-language structure first

2. delegate localized sections against the same approved outline

3. review localized terminology and examples for locale fit

4. confirm version numbers, references, and links remain aligned across locales

## Publishing & Versioning

Do not publish until every required delegated section is reviewed, structurally integrated, and aligned to the target release.

### Publication workflow

1. collect and consolidate all required sections

2. run formatting and markdown validation

3. run link validation, including cross-section references

4. confirm audience, tone, and terminology consistency

5. confirm every required section is approved

6. if the publish gate requires approval, obtain it before the publish step

7. publish the coordinated document set

### Version alignment

Delegated sections must align with:

- the feature or product version being documented

- the documentation version or branch being published

- any migration baseline and target version called out in upgrade guidance

If a returned section documents the wrong version, treat it as a revision item, not as good-enough output.

## Review Process

The normal documentation review process still applies, but multi-author work adds section-level review and consolidation review.

- Review each delegated section before merge into the parent document set.

- Review the consolidated document set for cohesion after section merge.

- Use adversarial or subject-matter review when a section is high-risk, externally visible, or difficult to validate from the repository alone.

- Do not treat section approval as automatic publication approval.

## Publishing

Publishing may be a simple handoff for small inline docs or a gated coordination event for delegated multi-section documentation.

- Single-section inline docs may publish after standard review when no extra publish gate applies.

- Delegated multi-section docs should publish only after all approved sections are consolidated and validated together.

- If a critical delegated section is missing and fallback is `delay-publication`, postpone publication rather than shipping an incomplete guide.

## Examples

### Example 1: Large product documentation split by specialty

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

## References

- `jl-subagent-spawning` — `../jl-subagent-spawning/SKILL.md` for `DelegateToSubagent` protocol and harness fallback patterns

- `jl-recon` — `../jl-recon/SKILL.md` for inherited gate handling and graceful AFK delegation patterns

- `jl-feature-documenter` — `../../agents/jl-feature-documenter.agent.md` for implementation-facing documentation ownership

- `jl-documentation-template` — `../jl-documentation-template/SKILL.md` for canonical structure of produced docs

- `jl-markdown-standards` — `../jl-markdown-standards/SKILL.md` for markdown formatting and validation requirements

- `jl-config` — `../jl-config/SKILL.md` for configuration resolution precedence and validation model
