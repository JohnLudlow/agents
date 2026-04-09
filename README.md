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

### johnludlow-feature-planner

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

- **Feature Planner**: Can read project files, write to `docs/plans/`, run git read
  commands, create GitHub issues
- **Feature Implementer**: Can write source code, run build/test commands, read-only
  git commands
- **Feature Documenter**: Can write documentation, read project files, create GitHub
  issues
- **Feature Tester**: Can read code and docs, run test commands

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

Install directly from the latest release:

**Windows (PowerShell):**

```powershell
npx https://github.com/JohnLudlow/agents/releases/download/latest/johnludlow-agents-latest.tgz install --global
```

**macOS/Linux (Bash):**

```bash
npx https://github.com/JohnLudlow/agents/releases/download/latest/johnludlow-agents-latest.tgz install --global
```

### Or Install Locally

```bash
npm install https://github.com/JohnLudlow/agents/releases/download/latest/johnludlow-agents-latest.tgz
```

### Prerequisites

- Node.js 22.0.0+ ([Download](https://nodejs.org/))
- npm (included with Node.js)

## Usage

### Using Agents with OpenCode

Once installed, agents are available in OpenCode:

```bash
# In any OpenCode session
/agent johnludlow-feature-planner
```

### Using Agents with GitHub Copilot CLI

The agents are automatically generated in Copilot format during installation. Use them in Copilot:

```bash
copilot chat -a johnludlow-feature-planner "Please plan a user authentication system"
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

A typical workflow using these agents:

1. **Plan** (johnludlow-feature-planner)

   Define feature requirements, architecture, and implementation phases
   Output: Feature plan document

2. **Implement** (johnludlow-feature-implementer)

   Follow the plan to implement code and tests
   Output: Updated source files, tests, and code changes

3. **Document** (johnludlow-feature-documenter)

   Create user-friendly documentation for the feature
   Output: API docs, guides, and references

4. **Test** (johnludlow-feature-tester)

   Run automated tests and report results
   Output: Test results and coverage reports

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
│   ├── johnludlow-feature-planner.md
│   ├── johnludlow-feature-implementer.md
│   ├── johnludlow-feature-documenter.md
│   └── johnludlow-feature-tester.md
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
