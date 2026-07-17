# Contributing Guide

Thank you for your interest in contributing to the johnludlow agents and skills
repository!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your changes
4. Make your changes
5. Test your changes
6. Submit a pull request

## Code Standards

### Agent Definitions

When creating or modifying agent definitions:

1. **Canonical Authoring Location** — author new and updated agent definitions in:
   - `.apm/agents/johnludlow-[name].agent.md` — canonical APM agent primitive with YAML frontmatter and agent body

   Legacy `agents/johnludlow-[name].md` plus `agents/johnludlow-[name].json`
   sidecars are back-compat reference material only. Do not treat `agents/` as the
   primary authoring location for new repository work.

2. **Markdown Required Sections**
   - Description: Brief overview of the agent
   - Purpose: What the agent does
   - Inputs: What the agent accepts
   - Outputs: What the agent produces
   - Requirements: MUST, SHOULD, MUST NOT clauses
   - Capabilities: What the agent can do
   - Restrictions: What the agent cannot do
   - Integration: How it works with other agents

   > **Note:** Do not add a `## Temperature` section to the markdown. For canonical
   > `.apm/` primitives, temperature belongs in YAML frontmatter. If you are
   > maintaining a legacy back-compat reference in `agents/`, temperature belongs
   > in the JSON sidecar instead.

3. **Legacy JSON Sidecar Schema (back-compat only)**

   ```json
   {
     "description": "One-line description shown in agent pickers",
     "mode": "primary",
     "temperature": 0.2,
     "permission": {
       "read": { "*": "allow" },
       "edit": { "*": "deny" },
       "bash": { "*": "deny", "git log*": "allow" },
       "grep": { "*": "allow" },
       "webfetch": "ask",
       "task": { "*": "deny" }
     }
   }
   ```

   - Use this only when maintaining a legacy back-compat reference under `agents/`
   - `mode`: `"primary"` for user-facing agents, `"subagent"` for delegated agents
   - `temperature`: `0.0`–`1.0`. Lower = more deterministic.
   - `permission`: OpenCode permission map. Copilot uses description + temperature only.

4. **Naming Convention**
   - All agent names start with `johnludlow-`
   - Use hyphen-separated names (e.g., `johnludlow-feature-planner`)
   - Canonical APM primitive files use the `.agent.md` suffix
   - Legacy `agents/*.md` plus `agents/*.json` sidecars remain back-compat references only

5. **Documentation**
   - Use clear, plain English
   - Define any technical jargon
   - Include examples where helpful
   - Link to related agents and skills

### Skill Definitions

When creating or modifying skills:

1. **Canonical Authoring Location** — author new and updated skill definitions in:
   - `.apm/skills/johnludlow-[name].skill.md` — canonical APM skill primitive with YAML frontmatter and skill body

   Legacy `skills/johnludlow-[name].md` plus `skills/johnludlow-[name].json`
   sidecars are back-compat reference material only. Do not treat `skills/` as
   the primary authoring location for new repository work.

2. **Legacy JSON Sidecar Schema (back-compat only)**

   ```json
   {
     "description": "One-line description shown in skill pickers"
   }
   ```

3. Markdown Required Sections
   - Overview: What the skill covers
   - Key principles or standards
   - Language-specific guidance (if applicable)
   - Examples where appropriate

4. Naming Convention
   - All skill names start with `johnludlow-`
   - Use descriptive names (e.g., `johnludlow-code-quality`)
   - Canonical APM primitive files use the `.skill.md` suffix
   - Legacy `skills/*.md` plus `skills/*.json` sidecars remain back-compat references only

5. Standards
   - Focus on practical, actionable guidance
   - Include examples from supported languages (C#, TypeScript, C++)
   - Link to official documentation where helpful

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

Plans must also pass normal repository markdown validation. The plan template in
`docs/templates/plan-template.md` follows the same convention and should be used
as the baseline for new plan documents.

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

1. Create a new file in `docs/templates/` named `[document-type]-template.md`
2. Follow the existing template format for that document type
3. Templates intended for `docs/plans/` must include YAML frontmatter
4. Provide clear structure with helpful placeholders
5. Include example content where appropriate
6. Update the README.md to reference the new template

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
   - Good: "Add new johnludlow-performance-analyzer agent"
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

Preferred authoring location: `.apm/agents/` — create an APM agent primitive named `johnludlow-[agent-name].agent.md`
that includes YAML frontmatter (description, temperature, mode, permissions) followed by the agent body.

1. Create `.apm/agents/johnludlow-[agent-name].agent.md` with YAML frontmatter and the agent markdown body.
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

Preferred authoring location: `.apm/skills/` — create an APM skill primitive named `johnludlow-[skill-name].skill.md`
with YAML frontmatter (`description`) followed by the skill markdown body.

1. Create `.apm/skills/johnludlow-[skill-name].skill.md` with YAML frontmatter and the skill markdown body.
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
