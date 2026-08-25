# Agent Configuration Overrides

This file can optionally override repository-wide agent settings defined in
`CONTRIBUTING.md`, following the portable `jl-config` pattern.

## Repository Configuration

This is the active configuration for this repository. Agents read these settings when running in this repo.
Configuration is in a YAML code fence for markdown readability; the linter automatically strips code fences before parsing.

```yaml
jl_quiz:
  quiz_mode: in_chat
  plan_destination: github_issue
  file_storage_location: docs/plans/

jl_recon:
  decision_gates:
    destination_confirmation: false
    inciting_issue_confirmation: false
    research_afk: false
  uncertainty_tracking:
    pattern: "## Not Yet Specified (Fog of War)"

jl_issue_management:
  plan_destination: github_issue
  file_storage_location: docs/plans/
  decision_gates:
    destination_confirmation: false
    research_afk: false
```

## Repository Structure and Document Placement Rules

**CRITICAL**: This section exists because agents have repeatedly placed documentation and configuration in the wrong
locations. Read it carefully. If your task involves writing or organizing files in this repository, you must follow
these rules.

### The Core Problem

This repository produces an NPM package (JohnLudlow/agents) that gets installed in other repositories. Files that agents
reference must be **shipped as part of the package** or they will not be available in downstream repositories.

**Key rule**: If a skill or agent references a file (reads it, uses it as a template, validates against it), that file
**must be in `.apm/skills/` or `.apm/agents/`** so it gets shipped. Files in `/docs/`, `/scripts/`, `CONTRIBUTING.md`,
or `AGENTS.md` are **repo-local only** and cannot be reliably referenced by agents working in other repositories.

### Roles and Contexts

| Role                 | Acting in              | Sees what                                                                                                                    |
| -------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Agent maintainer** | JohnLudlow/agents repo | All local files (`CONTRIBUTING.md`, `AGENTS.md`, `/docs/`, `/scripts/`) + all shipped files (`.apm/agents/`, `.apm/skills/`) |
| **Agent user**       | Any other repository   | Only shipped files (agents, skills, references)                                                                              |

This repository is NOT the only repository. Remember this.

### Document Types: Where They Go

| Document Type                          | Purpose                                                    | Shipped? | Correct Location                                                                    | Examples of Wrong Places                                 |
| -------------------------------------- | ---------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Agent or skill definition**          | Source code for an agent or skill                          | Yes      | `.apm/agents/*.md` or `.apm/skills/*/SKILL.md`                                      | N/A (these are in the right place)                       |
| **Configuration schema or reference**  | Documentation of what config settings a skill accepts      | Yes      | `<skill>/SKILL.md` (Configuration section) or `<skill>/references/CONFIG_SCHEMA.md` | ❌ CONTRIBUTING.md, ❌ /docs/, ❌ AGENTS.md              |
| **Skill examples or templates**        | Example usage, template files, sample input/output         | Yes      | `<skill>/references/*.md` or `<skill>/assets/*`                                     | ❌ /docs/, ❌ CONTRIBUTING.md                            |
| **Skill guide or walkthrough**         | Detailed guide on how to use a skill                       | Yes      | `<skill>/SKILL.md` or `<skill>/references/GUIDE.md`                                 | ❌ /docs/, ❌ CONTRIBUTING.md                            |
| **Repository contribution guidelines** | Rules for contributing to JohnLudlow/agents (human-facing) | No       | `CONTRIBUTING.md`                                                                   | N/A (repo-local only)                                    |
| **Agent configuration for this repo**  | Settings for how agents work *in this repository*          | No       | `AGENTS.md`                                                                         | ❌ /docs/, ❌ CONTRIBUTING.md, ❌ in a skill SKILL.md    |
| **General documentation**              | Setup, installation, usage guides for humans               | No       | `/docs/` or `README.md`                                                             | Can reference shipped files, but should not contain them |
| **CI/CD scripts**                      | Scripts run by GitHub Actions or other CI                  | No       | `/scripts/`                                                                         | N/A (repo-local only)                                    |

### Decision Rules (Use These)

**Rule 1**: If a **skill or agent reads/references** a file during execution, it must be shipped.

- ✅ `jl-config` reads `jl-config/references/validation-rules.md` → it's in references/ → shipped
- ❌ Agent tries to read `/docs/recon-guide.md` → repo-local → not shipped → fails in other repos

**Rule 2**: If a file is **configuration for how agents work in this specific repo**, it goes in `AGENTS.md`.

- ✅ "jl-quiz should use quiz_mode: b in this repo" → AGENTS.md
- ❌ "Here's how to configure jl-quiz" → That goes in jl-quiz/SKILL.md (shipped)

**Rule 3**: If you're adding content that a **skill needs to function**, add it to the skill's directory.

- ✅ Need a template for jl-feature-planner? → jl-plan-template/assets/plan-template.md
- ❌ Put it in /docs/ → won't be available in other repos

**Rule 4**: If you're adding **maintenance or setup documentation for humans**, it goes in `/docs/` or `README.md`.

- ✅ "How to install this package" → /docs/INSTALLATION.md
- ❌ "Configuration for jl-quiz" (that's agent/skill content, not human setup docs)

### Examples

#### ✅ CORRECT: Adding a configuration schema to a skill

```text
.apm/skills/jl-quiz/
├── SKILL.md                    ← Says "Configuration section below"
└── references/
    └── CONFIG_SCHEMA.md        ← Full schema details
```

Agent users in other repos can access this because it's shipped.

---

#### ❌ WRONG: Putting configuration schema in AGENTS.md

```markdown
# AGENTS.md

## jl-quiz Configuration Schema

jl-quiz accepts the following settings:

- quiz_mode: a or b
- ...

❌ This won't be available in other repos. If an agent in a downstream
   repo needs to understand jl-quiz config, it should read jl-quiz/SKILL.md,
   not a document in JohnLudlow/agents repo.
```

---

#### ❌ WRONG: Putting skill guide in /docs/

```text
/docs/
└── how-to-use-jl-recon.md      ❌ Not shipped; other repos can't see it
```

If you need to document how to use jl-recon, it goes in `jl-recon/SKILL.md` or `jl-recon/references/GUIDE.md`.

---

#### ✅ CORRECT: Putting CI scripts in /scripts/

```text
/scripts/
└── validate-apm-package.js     ✅ This is repo-local CI; not shipped
```

This is only used in JohnLudlow/agents, so it stays local.

---

#### ❌ WRONG: Updating deployed agents and skills

```text
~/.agents/skills/jl-recon
└── SKILL.md                    ❌ Not within the repo, and therefore won't be built and would be overriden by the next 
                                   deployment
```

If you need to update an agent, update the relevant file in [.apm/agents].

If you need to update a skill, update the relevant file in [.apm/skills].

---

### When You're Unsure

Ask yourself:

1. **Is this file going to be read/used by a skill or agent?** → It must be in `.apm/skills/` or `.apm/agents/`
2. **Is this file only relevant to this repository?** → It can go in CONTRIBUTING.md, AGENTS.md, /docs/, or /scripts/
3. **Is this file needed in other repos that use these skills?** → It must be shipped (in .apm/)
4. **Will a downstream agent or skill need this?** → Shipped location only
5. **Is this just setup/usage documentation for humans?** → `/docs/` is fine (reference shipped files if needed)

If you answer "yes" to #4, use a shipped location. If you answer "yes" to #2 or #5, use a repo-local location.

---

## References

- Full configuration validation schema: `.apm/skills/jl-config/validation-rules.md`
- jl-config skill: `.apm/skills/jl-config/SKILL.md`
- Individual agent settings:
  - jl-quiz: `.apm/skills/jl-quiz/SKILL.md`
  - jl-recon: `.apm/skills/jl-recon/SKILL.md`
  - jl-issue-management: `.apm/skills/jl-issue-management/SKILL.md`
- Issue tracking this: [#111 — Bug: agents keep putting skill docs in stupid places](https://github.com/JohnLudlow/agents/issues/111)
