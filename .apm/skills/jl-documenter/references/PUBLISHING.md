---
description: "Publishing workflow and version alignment detail"
---

# Publishing

Detailed publishing workflow and version alignment for jl-documenter. The
entry point keeps the publication summary and version-alignment requirements
inline; read this for the full workflow steps and version details.

## Publication workflow

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

## See Also

- [SKILL.md](../SKILL.md#publishing--versioning) — Summary kept inline
- [MULTI_AUTHOR_COORDINATION.md](MULTI_AUTHOR_COORDINATION.md) — Review process
