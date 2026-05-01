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

- **Planning**: Create well-structured feature plans
- **Implementation**: Develop features according to approved plans
- **Documentation**: Generate comprehensive technical documentation
- **Testing**: Validate implementations through automated testing

## Agents

This project uses a two-tier agent architecture:

- **Top-level agents** (`mode: agent`) are user-facing entry points with a fixed,
  locked intent. Select these via `/agent` in OpenCode or `-a` in Copilot CLI.
- **Sub-agents** (`mode: subagent`) perform the actual work, delegated to by
  top-level agents. They are token-efficient and scoped to specific tasks.

Each top-level agent enforces strict boundaries — it will refuse requests outside
its intent and only delegates to permitted sub-agents.

### Top-Level Agents

#### johnludlow-planner

Top-level planning agent. Plans only, never implements. Delegates to planner,
documenter, and reviewer sub-agents.

- **Temperature**: 0.3
- **Delegates to**: feature-planner, feature-documenter, feature-reviewer
- **Refuses**: Implementation, source code changes, build/test commands

[View full agent definition](agents/johnludlow-planner.md)

#### johnludlow-implementer

Top-level implementation agent. Implements approved plans by delegating to
implementer and tester sub-agents.

- **Temperature**: 0.2
- **Delegates to**: feature-implementer, feature-tester, feature-reviewer
- **Refuses**: Planning, documentation, working without an approved plan

[View full agent definition](agents/johnludlow-implementer.md)

#### johnludlow-tdd-implementer

Top-level TDD implementation agent. Enforces the red-green-refactor cycle —
writes tests before implementation code.

- **Temperature**: 0.2
- **Delegates to**: feature-tester, feature-implementer, feature-reviewer
- **Refuses**: Writing implementation before tests, skipping verification

[View full agent definition](agents/johnludlow-tdd-implementer.md)

#### johnludlow-documenter

Top-level documentation agent. Creates and maintains documentation only.

- **Temperature**: 0.2
- **Delegates to**: feature-documenter, feature-reviewer
- **Refuses**: Source code changes, planning, test execution

[View full agent definition](agents/johnludlow-documenter.md)

#### johnludlow-tester

Top-level testing agent. Runs tests and reports results without fixing code.

- **Temperature**: 0.2
- **Delegates to**: feature-tester, feature-reviewer
- **Refuses**: Code changes, planning, documentation

[View full agent definition](agents/johnludlow-tester.md)

### Sub-Agents

#### johnludlow-feature-planner

Creates comprehensive feature plans and project specifications.

- **Temperature**: 0.3 (balanced creativity and consistency)
- **Focus**: Planning, design, and specification
- **Output**: Markdown plan documents in `docs/plans/`

[View full agent definition](agents/johnludlow-feature-planner.md)

### johnludlow-feature-implementer

Implements features based on approved plans with code quality and best practices.

- **Temperature**: 0.2 (precise, consistent implementation)
- **Focus**: Code implementation, testing, quality
- **Output**: Modified source files and tests

[View full agent definition](agents/johnludlow-feature-implementer.md)

### johnludlow-feature-documenter

Creates user-friendly technical documentation for features and APIs.

- **Temperature**: 0.2 (precise, consistent documentation)
- **Focus**: Documentation, guides, references
- **Output**: Markdown documentation in `docs/`

[View full agent definition](agents/johnludlow-feature-documenter.md)

### johnludlow-feature-tester

Runs automated tests and reports results.

- **Temperature**: 0.2 (precise test execution)
- **Focus**: Testing, validation, quality assurance
- **Output**: Test results and coverage reports

[View full agent definition](agents/johnludlow-feature-tester.md)

#### johnludlow-feature-reviewer

Adversarial reviewer sub-agent. Read-only quality gate invoked by all top-level
agents before they report completion. Produces critical feedback with PASS/FAIL
verdicts.

- **Temperature**: 0.4 (balanced for critical analysis)
- **Focus**: Correctness, completeness, consistency, standards compliance
- **Output**: Structured review feedback with severity ratings

[View full agent definition](agents/johnludlow-feature-reviewer.md)

## Skills

Skills provide shared knowledge and standards for agents.

### johnludlow-markdown-standards

Defines markdown document structure, formatting, and quality standards.

[View full skill definition](skills/johnludlow-markdown-standards.md)

### johnludlow-code-quality

Defines code quality expectations across C#, TypeScript, and C++.

[View full skill definition](skills/johnludlow-code-quality.md)

## Permissions

Each agent has specific permissions that control what actions it can perform. These
are automatically installed and configured during setup.

### Permission Model

Top-level agents:

- **Planner**: Read all, write `docs/plans/`, delegate to planner/documenter/reviewer
- **Implementer**: Read all, delegate to implementer/tester/reviewer
- **TDD Implementer**: Read all, delegate to tester/implementer/reviewer (test-first)
- **Documenter**: Read all, delegate to documenter/reviewer
- **Tester**: Read all, delegate to tester/reviewer

Sub-agents:

- **Feature Planner**: Can read project files, write to `docs/plans/`, run git read
  commands, create GitHub issues
- **Feature Implementer**: Can write source code, run build/test commands, read-only
  git commands
- **Feature Documenter**: Can write documentation, read project files, create GitHub
  issues
- **Feature Tester**: Can read code and docs, run test commands
- **Feature Reviewer**: Read-only, no edit/task/webfetch permissions

Each agent is restricted to prevent accidental destructive operations (like git
commits or pushes) while enabling productive work within their domain.

**[Full Permissions Documentation](./docs/PERMISSIONS.md)**

## Templates

Pre-built templates for common documents:

- **Plan Template** (`docs/templates/plan-template.md`): Structure for feature
  plans
- **Documentation Template** (`docs/templates/documentation-template.md`):
  Structure for technical documentation

## Installation

For comprehensive installation instructions, see the **[INSTALLATION.md](docs/INSTALLATION.md)** guide.

### Quick Start (Recommended)

Visit the **[GitHub Releases page](https://github.com/JohnLudlow/agents/releases/latest)** to find the latest release.
Each release includes a `.tgz` asset — copy its URL and use it with `npx`:

```bash
npx <tgz-url> install --global
```

### Prerequisites

- Node.js 22.0.0+ ([Download](https://nodejs.org/))
- npm (included with Node.js)

### What Gets Installed

The installation script automatically sets up:

- **Agents** - Top-level agents (planner, implementer, tdd-implementer, documenter,
  tester) and sub-agents (feature-planner, feature-implementer, feature-documenter,
  feature-tester, feature-reviewer)
- **Skills** - Reusable knowledge bases for all agents
- **OpenCode Plugins**:
  - **oh-my-opencode** - Shell environment configuration for OpenCode
  - **opentmux** - Real-time tmux integration for viewing agent execution
  - **@ramtinj95/opencode-tokenscope** - Token usage analysis and cost tracking
- **GitHub Copilot Plugins** - Recommended development tools (if Copilot CLI is available)

## Usage

### Using Top-Level Agents with OpenCode

Once installed, select a top-level agent for your task:

```bash
# Planning
/agent johnludlow-planner

# Implementation (standard)
/agent johnludlow-implementer

# Implementation (TDD - test-first)
/agent johnludlow-tdd-implementer

# Documentation
/agent johnludlow-documenter

# Testing
/agent johnludlow-tester
```

### Using Top-Level Agents with GitHub Copilot CLI

```bash
# Planning
copilot chat -a johnludlow-planner "Plan a user authentication system"

# Implementation
copilot chat -a johnludlow-implementer "Implement the plan in docs/plans/auth.md"

# TDD Implementation
copilot chat -a johnludlow-tdd-implementer "Implement the plan in docs/plans/auth.md"

# Documentation
copilot chat -a johnludlow-documenter "Document the authentication API"

# Testing
copilot chat -a johnludlow-tester "Run all tests for the auth module"
```

### Available Commands

```bash
# Build format-specific agents from canonical source
npm run build:agents

# Install (run automatically on npm install, but can be run manually)
npm run install:local

# Restore from latest backup
npm run restore

# Show CLI help
npx @johnludlow/agents help
```

### CLI Tool

The package includes a CLI tool for manual management:

```bash
# Global installation
johnludlow-agents [command]

# Local installation  
npx @johnludlow/agents [command]

# Commands:
johnludlow-agents install         # Install agents
johnludlow-agents uninstall       # Remove agents
johnludlow-agents restore         # Restore from backup
johnludlow-agents generate-copilot # Create Copilot format
johnludlow-agents help            # Show help
johnludlow-agents version         # Show version
```

## Workflow Example

A typical workflow using top-level agents:

1. **Plan** (`johnludlow-planner`)

   Define feature requirements, architecture, and implementation phases.
   The planner delegates to sub-agents and invokes the adversarial reviewer
   before completion.
   Output: Feature plan document in `docs/plans/`

2. **Implement** (`johnludlow-implementer` or `johnludlow-tdd-implementer`)

   Follow the approved plan to implement code and tests. The TDD variant
   enforces red-green-refactor (tests written before implementation).
   Output: Updated source files, tests, and code changes

3. **Document** (`johnludlow-documenter`)

   Create user-friendly documentation for the feature.
   Output: API docs, guides, and references in `docs/`

4. **Test** (`johnludlow-tester`)

   Run automated tests and report results.
   Output: Test results and coverage reports

Each top-level agent invokes the `johnludlow-feature-reviewer` sub-agent before
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

## Project Structure

```bash
.
├── agents/                 # 📝 Canonical agent definitions (PRIMARY SOURCE)
│   ├── johnludlow-planner.md              # Top-level: planning
│   ├── johnludlow-implementer.md          # Top-level: implementation
│   ├── johnludlow-tdd-implementer.md      # Top-level: TDD implementation
│   ├── johnludlow-documenter.md           # Top-level: documentation
│   ├── johnludlow-tester.md               # Top-level: testing
│   ├── johnludlow-feature-planner.md      # Sub-agent: planning work
│   ├── johnludlow-feature-implementer.md  # Sub-agent: code changes
│   ├── johnludlow-feature-documenter.md   # Sub-agent: documentation work
│   ├── johnludlow-feature-tester.md       # Sub-agent: test execution
│   └── johnludlow-feature-reviewer.md     # Sub-agent: adversarial review
├── skills/                 # 📝 Canonical skill definitions (PRIMARY SOURCE)
│   ├── johnludlow-markdown-standards.md
│   └── johnludlow-code-quality.md
├── opencode/               # 🔨 Generated OpenCode format (built from agents/)
│   ├── agents/             # With YAML frontmatter and permissions
│   ├── skills/
│   └── config.json
├── .github/                # 🔨 Generated GitHub Copilot format
│   ├── agents/             # Generated Copilot agent markdown with YAML frontmatter
│   ├── skills/             # Generated Copilot skill markdown
│   ├── actions/            # Reusable GitHub Actions
│   │   ├── setup/          # Setup Node.js and determine version
│   │   ├── validate/       # Validate markdown and structure
│   │   └── build/          # Build NPM package
│   └── workflows/
│       └── main.yml        # CI/CD workflow
├── .opencode/              # 🎯 User installation directory (created at install time)
├── docs/
│   ├── CI-CD.md           # CI/CD pipeline documentation
│   ├── PERMISSIONS.md      # Detailed permissions reference
│   ├── templates/          # Document templates
│   └── plans/              # Generated feature plans
├── scripts/                # Build and installation scripts
│   ├── build-agents.js    # 🔨 Build script to generate format-specific versions
│   ├── install.js         # Installation script (runs on postinstall)
│   ├── uninstall.js       # Uninstall script (runs on uninstall)
│   ├── generate-copilot.js # Legacy Copilot generation (use build-agents.js instead)
│   ├── restore.js         # Restore from backup
│   └── init.js            # CLI entry point
├── package.json           # NPM package manifest
└── README.md              # This file

Legend: 📝 = Source files (edit these), 🔨 = Generated files (don't edit), 🎯 = Installation target
```

## Build System

This project uses a single-source-of-truth approach for agent and skill definitions:

### How It Works

1. **Canonical Source** (`agents/` and `skills/` directories)
   - Contains the primary, detailed definitions of all agents and skills
   - Includes complete descriptions, capabilities, requirements, and restrictions
   - Pure markdown format without frontmatter

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
# Build format-specific agents from canonical source
npm run build:agents

# Install agents (includes build step automatically)
npm install

# Install locally in current project
npm run install:local
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
~/.config/opencode.johnludlow-backup-YYYY-MM-DDTHH-MM-SS
```

Restore the latest backup:

```bash
npm run restore
```

## Standards and Best Practices

### Documentation Standards

All documents created by these agents follow the markdown standards defined in the
johnludlow-markdown-standards skill:

- Valid YAML frontmatter for OpenCode definition files
- Proper heading hierarchy
- Markdown linting compliance
- Plain language with defined jargon
- Valid internal and external links

### Code Quality Standards

Code created by johnludlow-feature-implementer follows the standards in the
johnludlow-code-quality skill:

- SOLID principles
- Language-specific best practices
- Performance considerations
- Comprehensive testing
- Clear, maintainable code

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Edit canonical sources** in `agents/` or `skills/` directories (not the generated files)
2. Ensure all markdown files pass markdownlint validation
3. Run `npm run build:agents` to generate format-specific versions
4. Test installation: `npm install` (from package directory)
5. Update README.md if adding new agents or skills
6. Submit a pull request with clear descriptions

**Important**: Always edit files in `agents/` and `skills/` directories. The files in `opencode/`, `.github/`, and
`.opencode/` are automatically generated and should not be edited directly.

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
