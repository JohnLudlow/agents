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

## Testing Changes

Before submitting a pull request:

1. **Markdown validation** — run `rumdl check .` to catch formatting issues in all source markdown files:

   ```bash
   npx rumdl check .
   ```

2. **Build validation** — run the build to confirm every agent and skill generates clean output with no warnings:

   ```bash
   npm run build:agents
   ```

3. **Agent definition review** — ensure all required sections are present, file names
   match agent/skill names, and links are valid.

### Installing and Testing Locally

Use the following workflow to test your changes in GitHub Copilot and OpenCode before submitting.

#### Step 1 — Build

Generate format-specific output from all source files:

```bash
npm run build:agents
```

This produces:

| Directory | Platform | Contents |
|-----------|----------|----------|
| `.github/agents/` | GitHub Copilot | Copilot frontmatter (description + temperature) |
| `opencode/agents/` | OpenCode | Full YAML frontmatter with mode and permissions |
| `.github/skills/` | GitHub Copilot | Skill frontmatter (description) |
| `opencode/skills/` | OpenCode | Plain markdown |

A clean build prints no `⚠️` warnings and exits with code 0. If any `.md` source
file is missing its `.json` sidecar the build fails with exit code 1.

#### Step 2 — Test in GitHub Copilot

After building, `.github/agents/` already contains correctly formatted agent files
for this repository. No additional install step is needed for in-repository testing:

1. Open Copilot Chat in this repository (VS Code or GitHub.com)
2. Select your agent from the agent picker, or reference it with `@agent-name`
3. Verify the description is correct and the agent behaves as expected

To inspect the generated frontmatter:

```bash
# Windows (PowerShell)
Get-Content .github\agents\johnludlow-[name].md | Select-Object -First 5

# macOS / Linux
head -5 .github/agents/johnludlow-[name].md
```

#### Step 3 — Test in OpenCode

Copy the built agents and skills into the local `.opencode/` directory:

```bash
npm run install:local
```

Then:

1. Launch OpenCode in this repository
2. Switch to the agent with `/agent johnludlow-[name]`
3. Confirm it loads with the expected permissions and temperature

#### Restoring a previous installation

The install script backs up your existing installation before writing. To roll back:

```bash
npm run restore    # restore from the most recent backup
npm run uninstall  # remove installed files without restoring
```

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

1. Create `agents/johnludlow-[agent-name].md` — write provider-agnostic instructions
2. Create `agents/johnludlow-[agent-name].json` — add description, mode, temperature, and permissions
3. Follow the standard agent definition structure (see [Agent Definitions](#agent-definitions) above)
4. Run `npm run build:agents` and confirm there are no `⚠️` warnings
5. Test the agent in Copilot and/or OpenCode (see [Installing and Testing Locally](#installing-and-testing-locally) above)
6. Update `README.md` with the new agent

### Adding a New Skill

1. Create `skills/johnludlow-[skill-name].md` — write provider-agnostic content
2. Create `skills/johnludlow-[skill-name].json` — add a `description` field
3. Follow the standard skill definition structure (see [Skill Definitions](#skill-definitions) above)
4. Run `npm run build:agents` and confirm there are no `⚠️` warnings
5. Test the skill in Copilot and/or OpenCode (see [Installing and Testing Locally](#installing-and-testing-locally) above)
6. Update `README.md` with the new skill

### Adding a New Template

1. Create a new file in `docs/templates/` named `[document-type]-template.md`
2. Follow the existing template format and do not add YAML frontmatter
3. Provide clear structure with helpful placeholders
4. Include example content where appropriate
5. Update the README.md to reference the new template

## Release Process

Releases are handled automatically via GitHub Actions:

1. Merge your changes to the `main` branch
2. GitHub Actions validates your changes
3. A version number is automatically generated
4. Artifacts (tar.gz and zip) are created
5. The commit is tagged with the new version

## Questions or Issues?

- Open a GitHub Issue for bug reports
- Start a Discussion for questions or suggestions
- Review existing issues before opening a new one

## Code of Conduct

Please be respectful and inclusive in all interactions. We welcome contributions
from developers of all experience levels.

---

Thank you for contributing to johnludlow agents and skills!
