# Skill Definitions Schema

Canonical schema and conventions for skill definitions.

## Canonical Authoring Location

Author new and updated skill definitions in:

- `.apm/skills/jl-[name]/SKILL.md` — canonical APM skill primitive (Agent Skills spec-compliant directory) with YAML
  frontmatter (`name` matching the directory, plus `description`) and skill body

Supporting documents (templates, reference material, scripts) for a skill live alongside it under
`.apm/skills/jl-[name]/assets/`, `references/`, or `scripts/` as appropriate — never as loose files elsewhere in the
repo.

Legacy `skills/jl-[name].md` plus `skills/jl-[name].json` sidecars are back-compat reference material only. Do not treat
`skills/` as the primary authoring location for new repository work.

## Legacy JSON Sidecar Schema

Back-compat reference only:

```json
{
  "description": "One-line description shown in skill pickers"
}
```

## Markdown Required Sections

- Overview: What the skill covers
- Key principles or standards
- Language-specific guidance (if applicable)
- Examples where appropriate

## Naming Convention

- All skill names start with `jl-`
- Use descriptive hyphen-separated names (for example, `jl-code-quality`)
- Canonical APM primitives are a directory named after the skill containing `SKILL.md` (for example,
  `.apm/skills/jl-code-quality/SKILL.md`), per the Agent Skills specification — not a flat `.skill.md` file
- The `name` field in `SKILL.md` frontmatter must match the directory name
- Legacy `skills/*.md` plus `skills/*.json` sidecars remain back-compat references only

## Standards

- Focus on practical, actionable guidance
- Include examples from supported languages (C#, TypeScript, C++)
- Link to official documentation where helpful
