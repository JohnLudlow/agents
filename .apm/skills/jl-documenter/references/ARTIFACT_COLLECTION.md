---
description: "Delegated documenter return artifacts and consolidation checks"
---

# Artifact Collection

Detailed artifact collection and consolidation checks for jl-documenter. The
entry point keeps the required-artifacts list inline; read this for the full
consolidation checks.

## Required returned artifacts

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

## See Also

- [SKILL.md](../SKILL.md#documentation-artifact-collection) — Required-artifacts list inline
- [MULTI_AUTHOR_COORDINATION.md](MULTI_AUTHOR_COORDINATION.md) — Review expectations
