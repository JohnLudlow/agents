# johnludlow Agents and Skills

[![Build Status](https://github.com/JohnLudlow/agents/actions/workflows/main.yml/badge.svg)](https://github.com/JohnLudlow/agents/actions/workflows/main.yml)
[![npm version](https://img.shields.io/npm/v/@johnludlow/agents)](https://www.npmjs.com/package/@johnludlow/agents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A collection of reusable AI agents and skills for OpenCode and GitHub Copilot CLI,
designed to streamline feature planning, implementation, documentation, and testing
for multi-language projects.

Distributed as an NPM package with automated installation scripts for seamless setup
across different development environments.

## Overview

This repository contains agents and skills that work with both Copilot CLI and
OpenCode. These tools are designed to assist with the complete software development
lifecycle:

Canonical source files live under `.apm/agents/` and `.apm/skills/`.

- **Planning**: Create well-structured feature plans in markdown, GitHub Issues, or Azure DevOps work items
- **Implementation**: Develop features according to approved plans
- **Documentation**: Generate comprehensive technical documentation
- **Testing**: Validate implementations through automated testing

## Agents

This project uses a two-tier agent architecture:

- **Top-level agents** (`mode: primary`) are user-facing entry points with a fixed,
  locked intent. Select these via `/agent` in OpenCode or `-a` in Copilot CLI.
- **Sub-agents** (`mode: subagent`) perform the actual work, delegated to by
  top-level agents. They are token-efficient and scoped to specific tasks.

Each top-level agent enforces strict boundaries — it will refuse requests outside
its intent and only delegates to permitted sub-agents.

### Top-Level Agents

#### jl-planner

Top-level planning agent. Plans only, never implements. Delegates to planner,
documenter, and reviewer sub-agents.

- **Temperature**: 0.3
- **Delegates to**: feature-planner, feature-documenter, feature-reviewer
- **Refuses**: Implementation, source code changes, build/test commands

[View full agent definition](.apm/agents/jl-planner.agent.md)

#### jl-implementer

Top-level implementation agent. Implements approved plans by delegating to
implementer and tester sub-agents.

- **Temperature**: 0.2
- **Delegates to**: feature-implementer, feature-tester, feature-reviewer
- **Refuses**: Planning, documentation, working without an approved plan

[View full agent definition](.apm/agents/jl-implementer.agent.md)

#### jl-tdd-implementer

Top-level TDD implementation agent. Enforces the red-green-refactor cycle —
writes tests before implementation code.

- **Temperature**: 0.2
- **Delegates to**: feature-tester, feature-implementer, feature-reviewer
- **Refuses**: Writing implementation before tests, skipping verification

[View full agent definition](.apm/agents/jl-tdd-implementer.agent.md)

#### jl-documenter

Top-level documentation agent. Creates and maintains documentation only.

- **Temperature**: 0.2
- **Delegates to**: feature-documenter, feature-reviewer
- **Refuses**: Source code changes, planning, test execution

[View full agent definition](.apm/agents/jl-documenter.agent.md)

#### jl-tester

Top-level testing agent. Runs tests and reports results without fixing code.

- **Temperature**: 0.2
- **Delegates to**: feature-tester, feature-reviewer
- **Refuses**: Code changes, planning, documentation

[View full agent definition](.apm/agents/jl-tester.agent.md)

### Usage Reporting

Agents support structured token and context usage reporting. After every
session, the reported details depend on the specific agent and platform:

- **Sub-agents**: Emit a single-line summary with input/output/cached token counts
- **Top-level agents**: Aggregate available sub-agent usage summaries into a
  structured final report presented to the user
- **Platform-native**: Agents use the telemetry commands documented in their
  definitions, such as `/tokenscope` (OpenCode), and some Copilot CLI agents may
  use built-in `/usage` and `/context` commands where supported

This feature is non-blocking — usage reporting is informational and does not
interrupt the agent's primary workflow.

### Sub-Agents

#### jl-feature-planner

Creates comprehensive feature plans and project specifications.

- **Temperature**: 0.3 (balanced creativity and consistency)
- **Focus**: Planning, design, specification, and issue management
- **Output**: Markdown plan documents in `docs/plans/`, GitHub Issues, or Azure DevOps work items

[View full agent definition](.apm/agents/jl-feature-planner.agent.md)

#### jl-feature-implementer

Implements features based on approved plans with code quality and best practices.

- **Temperature**: 0.2 (precise, consistent implementation)
- **Focus**: Code implementation, testing, quality
- **Output**: Modified source files and tests

[View full agent definition](.apm/agents/jl-feature-implementer.agent.md)

#### jl-feature-documenter

Creates user-friendly technical documentation for features and APIs.

- **Temperature**: 0.2 (precise, consistent documentation)
- **Focus**: Documentation, guides, references
- **Output**: Markdown documentation in `docs/`

[View full agent definition](.apm/agents/jl-feature-documenter.agent.md)

#### jl-feature-tester

Runs automated tests and reports results.

- **Temperature**: 0.2 (precise test execution)
- **Focus**: Testing, validation, quality assurance
- **Output**: Test results and coverage reports

[View full agent definition](.apm/agents/jl-feature-tester.agent.md)

#### jl-feature-reviewer

Adversarial reviewer sub-agent. Read-only quality gate invoked by all top-level
agents before they report completion. Produces critical feedback with PASS/FAIL
verdicts.

- **Temperature**: 0.4 (balanced for critical analysis)
- **Focus**: Correctness, completeness, consistency, standards compliance
- **Output**: Structured review feedback with severity ratings

[View full agent definition](.apm/agents/jl-feature-reviewer.agent.md)

## Skills

Skills provide shared knowledge and standards for agents.

### jl-quiz

Structured question skill. Interviews the user in chat for narrow decisions,
or generates a questionnaire document for broad decisions, and lets the user
switch between the two modes at any point in the session. Used by all agents
when they encounter decisions that only the user can answer.
Provider- and harness-agnostic.

[View full skill definition](.apm/skills/jl-quiz/SKILL.md)

### jl-markdown-standards

Defines markdown document structure, formatting, and quality standards.

[View full skill definition](.apm/skills/jl-markdown-standards/SKILL.md)

### jl-code-quality

Defines code quality expectations across C#, TypeScript, and C++.

[View full skill definition](.apm/skills/jl-code-quality/SKILL.md)

### jl-code-tour

Generates CodeTour `.tour` walkthrough files for a repo, or walks a user
through code live in-chat, for onboarding. User-invoked only — agents may
suggest it by name but only a human launches it.

[View full skill definition](.apm/skills/jl-code-tour/SKILL.md)

### jl-issue-management

Defines provider-agnostic issue-management guidance for markdown plans, GitHub
Issues, and Azure DevOps work items.

[View full skill definition](.apm/skills/jl-issue-management/SKILL.md)

### jl-plan-template

Provides the canonical plan document template and structure for feature plans
stored in `docs/plans/`, including YAML frontmatter. Used by
`jl-feature-planner` and `jl-planner`.

[View full skill definition](.apm/skills/jl-plan-template/SKILL.md)

### jl-prototype

Generates a time-boxed, stack-agnostic prototype — runnable code, an IaC
deployment, a mockup, a docs sample, or an architecture sketch — on its own
`prototype/<slug>` branch. Runs `jl-quiz` as a mandatory pre-step and
refuses to generate until shared understanding is confirmed.

[View full skill definition](.apm/skills/jl-prototype/SKILL.md)

### jl-documentation-template

Provides the canonical documentation template and structure for feature and
API documentation stored in `docs/`. Used by `jl-feature-documenter`
and `jl-documenter`.

[View full skill definition](.apm/skills/jl-documentation-template/SKILL.md)

### jl-recon

Charts a map of decision tickets that turns a large, poorly-understood
feature into a well-understood one. Human-in-the-loop by default (Research
tickets may run AFK only with explicit per-ticket approval). Delegates to
`jl-quiz` for destination-naming and Grilling tickets, and to
`jl-prototype` for Prototype tickets. User-invoked only.

[View full skill definition](.apm/skills/jl-recon/SKILL.md)

## Agent and Skill Configuration

Each skill and agent defines its own configuration options. Configuration is documented in the skill's own `SKILL.md` file.

### Per-Skill Configuration

- **[jl-quiz Configuration](.apm/skills/jl-quiz/SKILL.md#configuration)** — Interview mode (live chat vs. questionnaire),
  output destination (GitHub Issues, markdown, or Azure DevOps), file storage location
- **[jl-recon Configuration](.apm/skills/jl-recon/SKILL.md#configuration)** — Decision gates (destination confirmation,
  inciting issue confirmation, research AFK sign-off), uncertainty tracking pattern, and
  model-selection overrides for delegated work and quality checks
- **[jl-issue-management Configuration](.apm/skills/jl-issue-management/SKILL.md#configuration)** — Issue destination, file storage location, decision gates
- **[jl-config Reference](.apm/skills/jl-config/SKILL.md)** — Configuration resolution mechanism and portable config pattern (used by all skills)
- **[jl-subagent-spawning Configuration](.apm/skills/jl-subagent-spawning/SKILL.md#approval-gates-jl_approval_gates)** —
  Approval gates, model selection hierarchy, and the plugin capability manifest

### Plugin Capability Manifest

Skills, agents, and plugins declare which delegation-relevant capabilities they support directly
in their own frontmatter — a `capabilities` block alongside `name` and `description` — rather than
in a separate registry file:

```yaml
---
name: jl-prototype
description: Build a throwaway prototype to answer a design question.
capabilities:
  subagent_spawning: false
  fleet_mode: false
  worktree_isolation: true
---
```

A missing `capabilities` block means capability-unknown, not capability-denied — no migration is
required for existing skills. See [Configuration Guide](docs/CONFIGURATION.md#plugin-capability-manifest)
for worked examples and
[`PLUGIN_CAPABILITY_REGISTRY.md`](.apm/skills/jl-subagent-spawning/references/PLUGIN_CAPABILITY_REGISTRY.md)
for the full schema and discovery mechanism.

### How to Configure

For downstream repositories installing this APM package:

1. Check the relevant skill's `SKILL.md` file for available settings
2. Create or edit `AGENTS.md` in your repository root to override defaults:

   ```yaml
   jl_quiz:
     quiz_mode: b    # Override: use questionnaires instead of live chat
   ```

3. Run `npm run validate` (if your repository uses this package's validation) to check syntax and schema

See [jl-config](.apm/skills/jl-config/SKILL.md) for full details on the configuration resolution mechanism and worked examples in [jl-config Examples](.apm/skills/jl-config/references/EXAMPLES.md).

## Permissions

Each agent has specific permissions that control what actions it can perform. These
are automatically installed and configured during setup.

### Permission Model

Top-level agents:

- **Planner**: Read all, write `docs/plans/`, inspect provider records, and create or update GitHub/Azure DevOps planning
  artifacts with approval; delegate to planner/documenter/reviewer
- **Implementer**: Read all, delegate to implementer/tester/reviewer
- **TDD Implementer**: Read all, delegate to tester/implementer/reviewer (test-first)
- **Documenter**: Read all, delegate to documenter/reviewer
- **Tester**: Read all, delegate to tester/reviewer

Sub-agents:

- **Feature Planner**: Can read project files, write to `docs/plans/`, run git read
  commands, and create or update GitHub issues and Azure DevOps work items with approval
- **Feature Implementer**: Can write source code, run build/test commands, read-only
  git commands
- **Feature Documenter**: Can write documentation, read project files, and read provider issue/work-item context
- **Feature Tester**: Can read code and docs, run test commands
- **Feature Reviewer**: Read-only, no edit/task/webfetch permissions

Each agent is restricted to prevent accidental destructive operations (like git
commits or pushes) while enabling productive work within their domain.

**[Full Permissions Documentation](./docs/PERMISSIONS.md)**

## Templates

Document templates are now delivered as skills, with the template itself as
an asset, so they are loaded as explicit skill dependencies by the agents
that use them:

- **Plan Template** — see
  [jl-plan-template](.apm/skills/jl-plan-template/SKILL.md).
  Structure for feature plans stored in `docs/plans/`, including YAML
  frontmatter. Used by `jl-feature-planner` and `jl-planner`.
- **Documentation Template** — see
  [jl-documentation-template](.apm/skills/jl-documentation-template/SKILL.md).
  Structure for technical documentation stored in `docs/`. Used by
  `jl-feature-documenter` and `jl-documenter`.

## Installation

For comprehensive installation instructions, see the **[INSTALLATION.md](docs/INSTALLATION.md)** guide.

### Quick Start (Recommended)

Install using APM (Agent Package Manager) from the latest release:

**Windows (PowerShell):**

```powershell
apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
```

**macOS/Linux (Bash):**

```bash
apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
```

Replace `vX.Y.Z` with the latest version from the **[GitHub Releases page](https://github.com/JohnLudlow/agents/releases/latest)**.

### Prerequisites

- **APM CLI** - [Install APM](https://aka.ms/apm)

### What Gets Installed

The installation places:

- **Agents** - Top-level agents (planner, implementer, tdd-implementer, documenter,
  tester) and sub-agents (feature-planner, feature-implementer, feature-documenter,
  feature-tester, feature-reviewer)
- **Skills** - Reusable knowledge bases for all agents
- **OpenCode Plugins**:
  - **oh-my-opencode** - Shell environment configuration for OpenCode
  - **opentmux** - Real-time tmux integration for viewing agent execution
  - **@ramtinj95/opencode-tokenscope** - Token usage analysis and cost tracking

## Usage

### Using Top-Level Agents with OpenCode

Once installed, select a top-level agent for your task:

```bash
# Planning
/agent jl-planner

# Implementation (standard)
/agent jl-implementer

# Implementation (TDD - test-first)
/agent jl-tdd-implementer

# Documentation
/agent jl-documenter

# Testing
/agent jl-tester
```

### Using Top-Level Agents with GitHub Copilot CLI

```bash
# Planning
copilot chat -a jl-planner "Plan a user authentication system"

# Implementation
copilot chat -a jl-implementer "Implement the plan in docs/plans/auth.md"

# TDD Implementation
copilot chat -a jl-tdd-implementer "Implement the plan in docs/plans/auth.md"

# Documentation
copilot chat -a jl-documenter "Document the authentication API"

# Testing
copilot chat -a jl-tester "Run all tests for the auth module"
```

### Available Commands

```bash
# Validate package and primitives
node scripts/validate-apm-package.js
# (optional) If you have the APM CLI installed:
# apm compile && apm pack --dry-run

# Install locally with APM (preferred for runtime testing)
# apm install ./
```

## Workflow Example

A typical workflow using top-level agents:

1. **Plan** (`jl-planner`)

   Define feature requirements, architecture, and implementation phases.
   The planner delegates to sub-agents and invokes the adversarial reviewer
   before completion.
   Output: Feature plan document in `docs/plans/`, GitHub Issue content, or
   Azure DevOps work-item content depending on the selected plan target. Any
   provider-native create or update action remains approval-gated.

2. **Implement** (`jl-implementer` or `jl-tdd-implementer`)

   Follow the approved plan to implement code and tests. The TDD variant
   enforces red-green-refactor (tests written before implementation).
   Output: Updated source files, tests, and code changes

3. **Document** (`jl-documenter`)

   Create user-friendly documentation for the feature.
   Output: API docs, guides, and references in `docs/`

4. **Test** (`jl-tester`)

   Run automated tests and report results.
   Output: Test results and coverage reports

Each top-level agent invokes the `jl-feature-reviewer` sub-agent before
reporting completion, ensuring adversarial quality review of all work.

## Supported Languages

These agents are designed to work with:

- **C# / .NET**: Primary language with full support
- **TypeScript / JavaScript**: Full support for web development
- **C++**: Support for game development and systems programming

## Key Features

- ✅ Cross-platform (Windows, Linux, macOS)
- ✅ Single command installation via NPM
- ✅ Works with both OpenCode and GitHub Copilot CLI
- ✅ Enforces documentation standards
- ✅ Consistent code quality expectations
- ✅ Template-based document generation
- ✅ Automated markdown validation
- ✅ Automatic backup and restore functionality
- ✅ Semantic versioning with npm
- ✅ Easy uninstall with `npm uninstall`
- ✅ Automatic token usage reporting after every session

## Project Structure

```bash
.
├── .apm/                   # 📝 Canonical source files (PRIMARY SOURCE)
│   ├── agents/
│   │   ├── jl-planner.agent.md
│   │   ├── jl-implementer.agent.md
│   │   ├── jl-tdd-implementer.agent.md
│   │   ├── jl-documenter.agent.md
│   │   ├── jl-tester.agent.md
│   │   ├── jl-feature-planner.agent.md
│   │   ├── jl-feature-implementer.agent.md
│   │   ├── jl-feature-documenter.agent.md
│   │   ├── jl-feature-tester.agent.md
│   │   └── jl-feature-reviewer.agent.md
│   └── skills/
│       ├── jl-quiz/
│       │   ├── SKILL.md
│       │   └── assets/
│       │       └── clarify-questionnaire-template.md
│       ├── jl-plan-template/
│       │   ├── SKILL.md
│       │   └── assets/
│       │       └── plan-template.md
│       ├── jl-documentation-template/
│       │   ├── SKILL.md
│       │   └── assets/
│       │       └── documentation-template.md
│       ├── jl-markdown-standards/
│       │   └── SKILL.md
│       ├── jl-code-quality/
│       │   └── SKILL.md
│       └── jl-issue-management/
│           └── SKILL.md
├── agents/                 # ↩️ Legacy back-compat references only
├── skills/                 # ↩️ Legacy back-compat references only
├── opencode/               # 🔨 Generated OpenCode format (built from .apm/)
│   ├── agents/
│   ├── skills/
│   └── config.json
├── .github/                # 🔨 Generated GitHub Copilot format
│   ├── agents/
│   ├── skills/
│   ├── actions/
│   └── workflows/
├── .opencode/              # 🎯 User installation directory (created at install time)
├── docs/
│   ├── CI-CD.md
│   ├── PERMISSIONS.md
│   └── plans/              # Feature plans (use YAML frontmatter)
├── scripts/
├── package.json
└── README.md

Legend: 📝 = Source files (edit these), 🔨 = Generated files (don't edit), 🎯 = Installation target
```

## Build System

This project uses a single-source-of-truth approach for agent and skill definitions:

### How It Works

1. **Canonical Source** (`.apm/agents/` and `.apm/skills/`)
   - Contains the primary, detailed definitions of all agents and skills
   - Uses APM primitives with YAML frontmatter plus the agent or skill body
   - Is the only authoring location that new repository changes should target
   - Treats legacy `agents/` and `skills/` paths as back-compat references only

2. **Build Process** (runs on `npm install` and `npm run build:agents`)
   - Generates format-specific versions from the canonical source
   - Creates OpenCode format with YAML frontmatter (including permissions)
   - Creates Copilot **agent** format with Copilot-compatible YAML frontmatter (description + temperature)
   - Creates Copilot **skill** format with Copilot-compatible YAML frontmatter (description)
   - Outputs to `opencode/agents/`, `opencode/skills/`, `.github/agents/`, `.github/skills/`

3. **Installation** (automatic via postinstall hook)
   - Runs the build process first to generate format-specific files
   - Installs built agents to `.opencode/` (local) or `~/.config/opencode/` (global)
   - Installs permissions configuration
   - Creates backups automatically

### Why Single-Source-of-Truth?

This approach ensures:

- **No duplicates**: One canonical definition maintained
- **Consistency**: Same content generates all formats
- **Maintainability**: Update once, deploy everywhere
- **Format flexibility**: Different platforms get optimized formats

### Commands

```bash
# Validate package and primitives
node scripts/validate-apm-package.js
# (optional) If you have the APM CLI installed:
# apm compile && apm pack --dry-run

# Install locally with APM (preferred for runtime testing)
# apm install ./
```

## Configuration

### Installation Directories

Agents and skills are installed to predictable locations:

#### OpenCode (Global)

```bash
~/.config/opencode/agents/
~/.config/opencode/skills/
```

#### OpenCode (Local)

```bash
.opencode/agents/
.opencode/skills/
```

#### GitHub Copilot (Generated)

```bash
.github/agents/          (created by npm run generate:copilot)
.github/skills/          (created by npm run generate:copilot)
```

### Backups

Installation backups are created automatically:

```bash
~/.config/opencode.jl-backup-YYYY-MM-DDTHH-MM-SS
```

Restore the latest backup:

```bash
npm run restore
```

## Standards and Best Practices

### Documentation Standards

All documents created by these agents follow the markdown standards defined in the
jl-markdown-standards skill:

- Valid YAML frontmatter for `.apm/` agent and skill primitives and for plan documents in `docs/plans/`
- Proper heading hierarchy
- Markdown linting compliance
- Plain language with defined jargon
- Valid internal and external links

### Code Quality Standards

Code created by jl-feature-implementer follows the standards in the
jl-code-quality skill:

- SOLID principles
- Language-specific best practices
- Performance considerations
- Comprehensive testing
- Clear, maintainable code

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Edit canonical sources** in `.apm/agents/` and `.apm/skills/` (do not edit
   generated files in `.github/` or `opencode/`)
2. Ensure all markdown files pass markdownlint validation
3. Run `npm run build:agents` to generate format-specific versions
4. Test installation: `npm install` (from package directory)
5. Update README.md if adding new agents or skills
6. Submit a pull request with clear descriptions

**Important**: Always edit files in `.apm/agents/` and `.apm/skills/`. Legacy `agents/` and `skills/` paths are
back-compat references only. The files in `opencode/`, `.github/`, and `.opencode/` are automatically generated and
should not be edited directly.

See CONTRIBUTING.md for detailed guidelines.

## CI/CD Pipeline

The repository uses GitHub Actions for automated validation and packaging:

**Workflow**: `.github/workflows/main.yml`

**Actions**:

- `setup` - Initialize environment and determine semantic version
- `validate` - Check markdown, structure, and package.json
- `build` - Create NPM package and Copilot format artifacts
- `release` - Tag commits and create GitHub releases (main branch only)

**Automatic on**:

- Push to `main` or `develop` branches
- Pull requests to either branch

**Outputs**:

- Downloadable NPM package (`.tgz`)
- GitHub Copilot format artifacts
- Semantic versioning with git tags

See [CI/CD.md](docs/CI-CD.md) for detailed pipeline documentation.

## License

MIT License

Copyright (c) 2026 JohnLudlow

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Related Repositories

- [Template Repository](https://github.com/JohnLudlow/Template) - Original template
  with agents
- [FourXGame Repository](https://github.com/JohnLudlow/FourXGame) - Game
  development agents

## Support

For issues or questions:

- GitHub Issues: [Create an issue](https://github.com/JohnLudlow/agents/issues)
- Discussions:
  [Start a discussion](https://github.com/JohnLudlow/agents/discussions)

## Changelog

### v0.0.1 (Initial Release)

- Initial agent definitions (planner, implementer, documenter, tester)
- Core skills (markdown standards, code quality)
- Node-based installation scripts
- GitHub Actions validation workflow
- Documentation templates

---

Built with ❤️ for multi-language, multi-framework development
