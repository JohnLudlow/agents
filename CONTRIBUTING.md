# Contributing Guide

Thank you for your interest in contributing to the johnludlow agents and skills
repository!

## Getting started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your changes
4. Make your changes
5. Test your changes
6. Submit a pull request

## Issue Management

Issues are stored in Github, generally on this repo, and generally added to the [AI Development](https://github.com/users/JohnLudlow/projects/9/views/1)
project in GitHub.

Issue states are as follows:

| Description                                      | Issue State | Issue Project State |
| ------------------------------------------------ | ----------- | ------------------- |
| Issue has not been investigated yet              | Open        | Todo                |
| Issue has been investigated                      | Open        | Todo                |
| Issue has started development                    | Open        | In progress         |
| Issue has completed development, pending testing | Open        | Test / Review       |
| Issue has successfully completed testing         | Closed      | Done                |

## Code Standards

### Subagent Approval Gates

Subagent delegation is governed by approval gates configured via `jl_approval_gates` in `CONTRIBUTING.md` or
`AGENTS.md`. All skills use a unified boolean pattern:

#### Schema

Each delegating skill defines one or more boolean gates:

```yaml
jl_approval_gates:
  test_approval_required: true              # jl-feature-tester
  documentation_approval_required: true     # jl-documenter
  prototype_approval_required: true         # jl-prototype
  plan_approval_required: true              # jl-planner
  implementation_approval_required: true    # jl-feature-implementer
```

#### Behavior

- When a gate is `true`, the agent prompts the user before delegating that category of work.
- When a gate is `false`, the agent proceeds with delegation pre-authorized.
- If a gate is missing from config, the delegating skill defaults to `true` (human-in-the-loop by default).

#### Per-gate documentation

For skill-specific approval gates, see:

- `jl-feature-tester`: `.apm/skills/jl-feature-tester/SKILL.md` → Configuration section
- `jl-documenter`: `.apm/skills/jl-documenter/SKILL.md` → Configuration section
- `jl-prototype`: `.apm/skills/jl-prototype/SKILL.md` → Configuration section
- `jl-planner`: `.apm/skills/jl-planner/SKILL.md` → Configuration section
- `jl-feature-implementer`: `.apm/agents/jl-feature-implementer.agent.md` → Configuration section
- `jl-recon`: `.apm/skills/jl-recon/SKILL.md` → Configuration section (uses boolean decision_gates pattern)

### Subagent Model Selection

Phase 3 subagent delegation uses a dedicated `jl_subagent_models` config block.
This block is separate from `jl_approval_gates`: approval decides whether a
delegation may happen, while model selection decides which model should run the
delegated task.

#### Schema

```yaml
jl_subagent_models:
  default: "claude-sonnet-5"
  research: "claude-sonnet-5"
  implementation: "gpt-4-turbo"
  test_generation: "claude-opus-4.5"
  documentation: "claude-sonnet-5"
  overrides:
    my-research-task: "claude-opus-4.5"
```

#### Hierarchy and precedence

Model selection resolves in this order, with each level allowed to override the
level below it:

1. per-task override: `jl_subagent_models.overrides.<task-key>`
2. per-delegation-type default: `jl_subagent_models.<delegation-type>`
3. per-agent default: the delegating skill's documented default model
4. global default: `jl_subagent_models.default`

If a requested model is unavailable in the current harness, the delegating
agent must fall back down the hierarchy until it finds an available model. The
delegation result should record both the requested model and the resolved model.

#### jl-recon model-selection overlays

`jl-recon` can provide recon-specific model preferences in its own namespace:

```yaml
jl_recon:
  model_selection:
    default: inherit
    quiz: inherit
    research: claude-sonnet-5
    prototype: gpt-5.4-mini
    task: inherit
    ticket_resolution_checks: gpt-5.4-mini
    status_report_checks: claude-sonnet-5
```

When present, recon resolves in this order:

1. explicit per-action override (`request.model`)
2. `jl_recon.model_selection.<action>`
3. `jl_recon.model_selection.default`
4. `jl_subagent_models` hierarchy above

Use `inherit` to skip a recon-level override and continue to `jl_subagent_models`.
Invalid model names must warn and fall through to the next precedence level.

#### Supported delegation-type keys

Use these canonical keys in repository configuration:

- `research`
- `implementation`
- `test_generation`
- `documentation`

Additional bounded task keys may be added later, but they must remain
snake_case, stable, and documented by the delegating skill.

#### Validation rules

- `jl_subagent_models` must be a mapping object.
- `default` should always be provided; if omitted, delegating skills fall back
  to their own documented hard default.
- top-level delegation-type entries must be strings naming recognized models.
- `overrides`, when present, must be a mapping of stable task keys to model
  names.
- model names must match a recognized family or explicit supported name such as
  `claude-sonnet-5`, `claude-opus-4.5`, `gpt-4-turbo`, `gpt-5.4`,
  `gpt-5.4-mini`, `gemini-3.5-flash`, or later recognized harness models.
- unknown or misspelled model names should be treated as validation warnings at
  minimum and must not be silently accepted as correct.
- a valid configured model can still be unavailable in a given harness; runtime
  resolution must check harness availability before use.

#### Harness constraints

Different harnesses expose different model inventories. Copilot CLI usually has
the broadest set, while browser or extension harnesses may expose only a
subset. Configuration should prefer portable defaults where possible, and
delegating agents must warn when the requested model changes because the current
harness cannot honor it.

### Subagent Delegation Depth

Circular delegation prevention (`parentAgentStack` tracking) uses a
configurable nesting depth limit, separate from `jl_approval_gates` and
`jl_subagent_models`.

#### Schema

```yaml
jl_subagent_delegation:
  max_nesting_depth: 3
```

#### Behavior

- `max_nesting_depth` bounds how many delegation levels deep a chain of
  subagents may go (see `jl-subagent-spawning/SKILL.md` → Circular Delegation
  Prevention).
- If omitted, delegating skills default to `3` (planner → feature-planner →
  feature-tester).
- The value is read once per session; changing it mid-session does not retroactively
  affect a delegation chain already in progress.
- A configured value must be a positive integer; non-numeric or non-positive
  values are validation warnings and fall back to the documented default of `3`.

### Agent Definitions

When creating or modifying agent definitions:

1. Create `.apm/agents/jl-[agent-name].agent.md` with the new or updated agent
   definition.
2. Follow the standard agent schema.

   **For the complete Agent Definitions schema** (naming convention, required sections
   frontmatter format), see <https://microsoft.github.io/apm/producer/author-primitives/instructions-and-agents/>
   — it documents the canonical structure for all agent definitions in this repository and is
   available to agents and tools in downstream repositories.
3. Validate the package.
4. Install locally.
5. Test the agent.
6. Update `README.md` if the new or changed agent should be documented there.

### Skill Definitions

When creating or modifying skills:

1. Create `.apm/skills/jl-[skill-name]/SKILL.md` with the new or updated skill
   definition.
2. Follow the standard skill schema.

   **For the complete Skill Definitions schema** (directory structure, naming
   convention, required sections), see
   <https://agentskills.io/home>.
3. Validate the package.
4. Install locally.
5. Test the skill.
6. Open a pull request with any related documentation updates.

### Templates

When creating or updating templates:

1. **Structure**
   - Templates intended for plan documents in `docs/plans/` must include YAML
     frontmatter with title, description, author, and date fields
   - Other templates should match the conventions of their document type and do
     not need frontmatter unless that artifact's standard requires it
   - Use clear section headings (h2)
   - Provide helpful comments or placeholders
   - Include example content where appropriate

2. **Validation**
   - Must pass `rumdl check .`
   - Should be concise but complete
   - Should guide users through the document structure

### Issue Management and Planning Guidance

When creating or updating plans, issues, or work items for this repository, use
the following rules.

#### Human-in-the-loop rule

- Planning is always collaborative.
- The human user is always in control.
- Agents must ask clarifying questions when requirements, destination, or issue
  structure are unclear.
- Agents must not create or update provider-native artifacts without explicit
  user confirmation for that session.

#### Quiz skill preferences (recorded by jl-quiz on 2026-07-31)

- Output destination for quiz-resolved decisions: update the relevant GitHub issue
  with the fleshed-out requirements
- Interview mode for small sessions: in-chat interview (Mode A); questionnaire
  document (Mode B) for large or multi-area scopes

#### Instruction precedence

Use this precedence order when deciding how and where a plan should be created:

1. Session-specific instructions from the user
2. Any linked issue-management guidance referenced by this file
3. The default rules in this `CONTRIBUTING.md`
4. Interactive clarification with the user if ambiguity remains

If instructions conflict, agents must briefly explain the conflict and ask the
user to confirm which instruction should apply.

#### Supported plan destinations

Plans for this repository may live in one of these destinations:

1. Markdown documents in `docs/plans/`
2. GitHub Issues
3. Azure DevOps work items

GitHub Issues and Azure DevOps are first-class provider-native destinations.
Markdown plans in `docs/plans/` are also fully supported.

#### Choosing the plan destination

Use these rules unless the user gives a session override:

- Use `docs/plans/` when:
  - the work is still exploratory
  - the user wants a local draft before creating provider-native items
  - the plan is too early or too speculative for GitHub Issues or Azure DevOps
- Use GitHub Issues when:
  - the repository is managing the work in GitHub
  - the user wants implementation tracked as issues or sub-issues
- Use Azure DevOps work items when:
  - the team is managing the work in Azure Boards
  - the user explicitly asks for Azure DevOps output

If no destination is clear, ask the user instead of guessing.

#### Expected detail level

Plans must be detailed enough for a later implementer to act without reopening
chat history for missing context.

At minimum, a complete plan should include:

- the problem being solved
- the intended outcome
- scope and non-goals
- important constraints
- implementation phases or ordered work steps
- risks or open questions
- validation or acceptance criteria

Avoid shallow plans such as “update X” or “fix Y” without context, rationale, or
verification guidance.

#### Child-plan and child-item expectations

For larger efforts, use hierarchical planning.

- Markdown plans:
  - a parent plan in `docs/plans/` may link to smaller child plans
- GitHub:
  - prefer a parent issue with child issues or sub-issues
  - do not hide major implementation detail only in long comment threads unless
    the user explicitly wants that format
- Azure DevOps:
  - prefer native parent/child work item relationships

Each child item should have a clear relationship to the parent and a scope that
can be implemented and reviewed independently.

#### Session overrides

Users may override the repository default for a single session.

Examples:

- “Use a markdown plan for this one even though we normally use GitHub Issues.”
- “Do not create provider-native items yet; keep this in `docs/plans/`.”
- “Track this in Azure DevOps instead of GitHub.”

When a session override is given, agents should restate the effective rule in a
short confirmation before continuing.

#### Code samples in plans

Code samples in planning artifacts are for illustration only unless the user
explicitly asks for implementation.

When including code samples:

- keep them minimal and focused
- label the language on fenced code blocks
- prefer pseudocode or partial examples when full implementation is unnecessary
- explain why the sample is relevant

#### Diagrams in plans

Use simple, reviewable text-based diagrams unless the user asks for a different
format.

Preferred default:

- Mermaid for flow, relationship, and sequence diagrams

Diagram guidance:

- keep diagrams small and readable
- include a short explanation of what the diagram shows
- do not use diagrams where a short bullet list is clearer

#### Markdown plan formatting

Plans stored in `docs/plans/` must use YAML frontmatter and a clear heading
hierarchy.

Include, where applicable:

- `title`
- `description`
- `author`
- `date`
- related issue or status metadata if useful

Plans must also pass normal repository markdown validation. The
`jl-plan-template` skill (`.apm/skills/jl-plan-template/SKILL.md`,
template asset at `assets/plan-template.md`) follows the same convention and
should be used as the baseline for new plan documents.

#### Provider-native plan expectations

If a plan is stored in GitHub Issues or Azure DevOps, the provider-native record
must still contain enough detail to stand on its own.

At minimum, provider-native planning artifacts should include:

- a concise summary
- scope
- acceptance criteria
- implementation outline or phases
- links to related parent/child items
- links to markdown plans when supporting documents exist

#### When to use markdown plans vs provider-native items

Use markdown plans when the goal is discovery, shaping, or pre-implementation
alignment.

Use provider-native items when the goal is committed tracking in the team’s work
management system.

It is acceptable to use both, as long as one is clearly the source of record and
the relationship between the artifacts is explicit.

### Adding a New Template

1. Create a new skill directory `.apm/skills/jl-[document-type]-template/`
   with `SKILL.md` and the template asset at
   `assets/[document-type]-template.md`
2. Follow the existing template format for that document type
3. Templates intended for `docs/plans/` must include YAML frontmatter
4. Provide clear structure with helpful placeholders
5. Include example content where appropriate
6. Wire the new skill into the agent(s) that consume it (Community Skills and
   Agents / Skill Activation section) and update the README.md Skills and
   Templates sections

## Testing & Local Development

Quick checklist before opening a pull request:

- Markdown validation

  ```bash
  npx rumdl check .
  ```

- Package validation (APM validator)

  ```bash
  node scripts/validate-apm-package.js
  ```

- Compile / pack (if APM CLI is available)

  ```bash
  apm compile
  apm pack --dry-run
  ```

- Local install for runtime testing

  ```bash
  apm install "C:\src\git\gh\JohnLudlow\agents"   # Windows
  apm install ./                                      # macOS / Linux
  ```

- Reproducible installs (lockfile)

  ```bash
  apm install --update    # refresh apm.lock.yaml locally
  git add apm.lock.yaml && git commit -m "chore: update apm.lock.yaml"
  # In CI use: apm install --frozen
  ```

Notes

- The authoritative validator is `node scripts/validate-apm-package.js`. It checks frontmatter, required fields, and
  common packaging issues.

- `apm compile` and `apm pack` provide additional runtime-target checks when the APM CLI is installed locally; CI will
  run these when available but falls back to a tarball artifact otherwise.

### Installing and testing locally (detailed)

1) Validate the package

```bash
node scripts/validate-apm-package.js
```

2) Compile / pack (optional, requires apm)

```bash
if command -v apm >/dev/null 2>&1; then
  apm compile
  apm pack --dry-run
fi
```

3) Install locally into runtime targets

```bash
apm install "C:\src\git\gh\JohnLudlow\agents"   # Windows example
# or
apm install ./
```

After installation inspect the installed outputs (examples):

- `.github/agents/` and `.github/skills/` — Copilot-ready files
- `opencode/agents/` and `opencode/skills/` — OpenCode-ready files

4) Test in GitHub Copilot

- Open Copilot Chat in VS Code (or GitHub.com) and select the agent from the picker.

5) Test in OpenCode

- Launch OpenCode and select the installed agent; verify permissions and behaviour.

6) Cleanup / restore

- If you need to remove installed artifacts created by `apm install`, delete the generated harness
  files (for example `.github/agents/` or `opencode/agents/`) or use your system's package uninstall
  path if available.1

## Pull Request Guidelines

1. **Title**: Use a clear, descriptive title
   - Good: "Add new jl-performance-analyzer agent"
   - Bad: "Updates"

2. **Description**: Explain what you changed and why
   - What problem does this solve?
   - What files did you modify?
   - Did you add new agents, skills, or templates?

3. **Changes**: Keep pull requests focused
   - One feature or fix per pull request
   - Don't mix multiple changes in one PR
   - Reference any related issues

4. **Testing**: Confirm you tested your changes
   - Markdown validation passes
   - Installation scripts work
   - Links are valid

## Common Tasks

### Adding a New Agent

Preferred authoring location: `.apm/agents/` — create an APM agent primitive named `jl-[agent-name].agent.md`
that includes YAML frontmatter (description, temperature, mode, permissions) followed by the agent body.

1. Create `.apm/agents/jl-[agent-name].agent.md` with YAML frontmatter and the agent markdown body.
2. Follow the standard agent schema (include Description, Purpose, Inputs, Outputs, Requirements, Capabilities, Restrictions).
3. Validate the package and compile locally:

   ```bash
   node scripts/validate-apm-package.js
   apm compile   # optional, requires apm CLI
   ```

4. Install locally for runtime testing:

   ```bash
   apm install ./
   ```

5. Test the agent in Copilot and/or OpenCode (see Installing and Testing Locally above).
6. Update `README.md` with the new agent and open a PR.

> Back-compat: If you prefer the legacy source format (separate `.md` + `.json` sidecar in `agents/`), include both
  files, but note the repository now prefers APM primitives in `.apm/` and the build scripts that converted sidecars have
  been removed.

### Adding a New Skill

Preferred authoring location: `.apm/skills/` — create an APM skill primitive as
`jl-[skill-name]/SKILL.md`, a directory named after the skill
containing `SKILL.md` with YAML frontmatter (`name` matching the directory,
plus `description`) followed by the skill markdown body. This follows the
[Agent Skills specification](https://agentskills.io/specification): the
skill directory may also contain `assets/`, `references/`, and `scripts/`
subdirectories for supporting material, referenced from `SKILL.md` using
paths relative to the skill root.

1. Create `.apm/skills/jl-[skill-name]/SKILL.md` with YAML frontmatter
   and the skill markdown body. Place any supporting templates or reference
   documents under `.apm/skills/jl-[skill-name]/assets/` or
   `references/` and link to them with a skill-root-relative path.
2. Follow the standard skill structure (Overview, Key principles, Examples).
3. Validate and compile:

   ```bash
   node scripts/validate-apm-package.js
   apm compile   # optional
   ```

4. Install locally for runtime testing:

   ```bash
   apm install ./
   ```

5. Test the skill in Copilot and/or OpenCode (see Installing and Testing Locally above).
6. Update `README.md` with the new skill and open a PR.

> Back-compat: Legacy `skills/*.md` + `skills/*.json` sidecars are supported for reference, but new contributions should
  prefer the `.apm/` primitives.

## Release Process

Releases are handled by GitHub Actions and are driven by semantic versioning (GitVersion) and tags.

How the version number is updated

- CI (recommended): the `.github/actions/setup` step runs GitVersion to calculate a semantic version based on commit
  history; this `semVer` is passed to the build job and is used to update `apm.yml` during the CI run.

- Manual release: create a signed (or annotated) tag locally and push it:

```bash
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

  Pushing a release tag triggers the release job in the workflow. CI will generate artifacts, create a GitHub Release,
  and attach packaged artifacts.

- Local testing / ad-hoc bump: to test a version locally you can edit the `version:` field in `apm.yml` and run
  `apm pack` or create a local tag, but the recommended release flow is to rely on CI/GitVersion so versioning is
  consistent across contributors.

Packaging & artifacts

- CI will attempt to run `apm pack` when the APM CLI is available on the runner. If `apm` is not present, the build
  action falls back to creating a tarball of `apm.yml` and the `.apm/` layout.

- Artifacts include the APM package (`*.apm`) or fallback tarball, and generated Copilot/OpenCode outputs when applicable.

Best practices

- Prefer tagging with `vMAJOR.MINOR.PATCH` for releases — this is the most consistent way to produce a well-known
  package version for consumers.

- Commit `apm.lock.yaml` after running `apm install --update` to lock resolved SHAs for reproducible installs in CI.

- Do not manually modify CI-generated tags — create a new tag if you need a new release.

## Questions or Issues?

- Open a GitHub Issue for bug reports
- Start a Discussion for questions or suggestions
- Review existing issues before opening a new one

## Code of Conduct

Please be respectful and inclusive in all interactions. We welcome contributions
from developers of all experience levels.

---

Thank you for contributing to johnludlow agents and skills!
