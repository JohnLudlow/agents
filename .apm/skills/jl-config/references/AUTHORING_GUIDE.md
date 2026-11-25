---
description: "Authoring guidance for repository maintainers and consumer agents and skills"
---

# Authoring Guide

Guidance for authors who write configuration in repository files and for agents
and skills that document their own jl-config settings. Maintainer material;
not required at runtime.

## Authoring Guidance for Repositories

- Prefer `AGENTS.md` for agent-facing overrides and tighter local behaviour.
- Use `CONTRIBUTING.md` for broader repository defaults shared by humans and agents.
- Keep values portable and repository-relative.
- Override only the settings you need; omitted settings inherit from lower
  precedence sources or defaults.

## Authoring Guidance for Agents and Skills

Each agent or skill should document its own configuration in its own skill `SKILL.md`:

1. **Configuration section heading**: name your config section clearly (e.g., `jl_quiz_requirements` for jl-quiz)
2. **Schema table**: document each setting with type, enum values (if any), and defaults
3. **Setting sensitivity**: mark each setting required, recommended, or optional
4. **Examples**: show how the config looks in CONTRIBUTING.md and AGENTS.md
5. **Prompting guidance**: explain how missing settings are handled

Example (in jl-quiz SKILL.md):

```markdown
## Configuration

jl-quiz reads settings from `jl_quiz_requirements` and `jl_quiz_understanding` configuration in AGENTS.md or CONTRIBUTING.md.

### Schema

| Setting | Type | Allowed values | Default | Sensitivity |
| --- | --- | --- | --- | --- |
| `quiz_mode` | string | `in_chat` or `questionnaire` | `in_chat` | recommended |
| `plan_destination` | string | github_issue, local_file, ... | (none) | required |
| `file_storage_location` | string | repository-relative path | `docs/plans/` | recommended |

### Defaults

If the quiz config block is not found, jl-quiz uses:

- quiz_mode: in_chat
- plan_destination: (prompts user if required and missing)
- file_storage_location: docs/plans/

### Examples

In CONTRIBUTING.md:
\`\`\`yaml
jl_quiz_requirements:
  plan_destination: github_issue
  quiz_mode: in_chat
\`\`\`

In AGENTS.md (overrides quiz_mode only):
\`\`\`yaml
jl_quiz_requirements:
  quiz_mode: questionnaire
\`\`\`
```

## See Also

- [SKILL.md](../SKILL.md) — Configuration resolution and validation mechanism
- [EXAMPLES.md](EXAMPLES.md) — Worked file-presence and merge examples
