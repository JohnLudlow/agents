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

1. **Required Files** — each agent requires two files:
   - `agents/johnludlow-[name].md` — provider-agnostic instructions and behaviour
   - `agents/johnludlow-[name].json` — build metadata (description, mode, temperature, permissions)

2. **Markdown Required Sections**
   - Description: Brief overview of the agent
   - Purpose: What the agent does
   - Inputs: What the agent accepts
   - Outputs: What the agent produces
   - Requirements: MUST, SHOULD, MUST NOT clauses
   - Capabilities: What the agent can do
   - Restrictions: What the agent cannot do
   - Integration: How it works with other agents

   > **Note:** Do not add a `## Temperature` section to the markdown. Temperature is
   > defined in the JSON sidecar and injected by the build script.

3. **JSON Sidecar Schema**

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

   - `mode`: `"primary"` for user-facing agents, `"subagent"` for delegated agents
   - `temperature`: `0.0`–`1.0`. Lower = more deterministic. The build injects a
     matching guidance text block into generated output for platforms that do not
     honour the frontmatter temperature field.
   - `permission`: OpenCode permission map. Copilot uses description + temperature only.

4. **Naming Convention**
   - All agent names start with `johnludlow-`
   - Use hyphen-separated names (e.g., `johnludlow-feature-planner`)
   - File names match agent names with `.md` and `.json` extensions

5. **Documentation**
   - Use clear, plain English
   - Define any technical jargon
   - Include examples where helpful
   - Link to related agents and skills

### Skill Definitions

When creating or modifying skills:

1. **Required Files** — each skill requires two files:
   - `skills/johnludlow-[name].md` — provider-agnostic content
   - `skills/johnludlow-[name].json` — build metadata (description)

2. **JSON Sidecar Schema**

   ```json
   {
     "description": "One-line description shown in skill pickers"
   }
   ```

3. **Markdown Required Sections**
   - Overview: What the skill covers
   - Key principles or standards
   - Language-specific guidance (if applicable)
   - Examples where appropriate

4. **Naming Convention**
   - All skill names start with `johnludlow-`
   - Use descriptive names (e.g., `johnludlow-code-quality`)
   - File names match skill names with `.md` and `.json` extensions

5. **Standards**
   - Focus on practical, actionable guidance
   - Include examples from supported languages (C#, TypeScript, C++)
   - Link to official documentation where helpful

### Templates

When creating or updating templates:

1. **Structure**
   - Include YAML frontmatter with title, description, author, date
   - Use clear section headings (h2)
   - Provide helpful comments or placeholders
   - Include example content where appropriate

2. **Validation**
   - Must pass `rumdl check .`
   - Should be concise but complete
   - Should guide users through the document structure

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

### Adding a New Template

1. Create a new file in `docs/templates/` named `[document-type]-template.md`
2. Follow the existing template format and do not add YAML frontmatter
3. Provide clear structure with helpful placeholders
4. Include example content where appropriate
5. Update the README.md to reference the new template

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
