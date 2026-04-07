# johnludlow Agents and Skills

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

- **Temperature**: 0.6 (balanced creativity and consistency)
- **Focus**: Planning, design, and specification
- **Output**: Markdown plan documents in `docs/plans/`

[View full agent definition](.github/agents/johnludlow-feature-planner.md)

### johnludlow-feature-implementer

Implements features based on approved plans with code quality and best practices.

- **Temperature**: 0.2 (precise, consistent implementation)
- **Focus**: Code implementation, testing, quality
- **Output**: Modified source files and tests

[View full agent definition](.github/agents/johnludlow-feature-implementer.md)

### johnludlow-feature-documenter

Creates user-friendly technical documentation for features and APIs.

- **Temperature**: 0.2 (precise, consistent documentation)
- **Focus**: Documentation, guides, references
- **Output**: Markdown documentation in `docs/`

[View full agent definition](.github/agents/johnludlow-feature-documenter.md)

### johnludlow-feature-tester

Runs automated tests and reports results.

- **Temperature**: 0.2 (precise test execution)
- **Focus**: Testing, validation, quality assurance
- **Output**: Test results and coverage reports

[View full agent definition](.github/agents/johnludlow-feature-tester.md)

## Skills

Skills provide shared knowledge and standards for agents.

### johnludlow-markdown-standards

Defines markdown document structure, formatting, and quality standards.

[View full skill definition](.github/skills/johnludlow-markdown-standards.md)

### johnludlow-code-quality

Defines code quality expectations across C#, TypeScript, and C++.

[View full skill definition](.github/skills/johnludlow-code-quality.md)

## Templates

Pre-built templates for common documents:

- **Plan Template** (`docs/templates/plan-template.md`): Structure for feature
  plans
- **Documentation Template** (`docs/templates/documentation-template.md`):
  Structure for technical documentation

## Installation

### Prerequisites

- Node.js 18+ (for NPM package management)
- npm (Node Package Manager)
- OpenCode or GitHub Copilot CLI (optional, but required to use the agents)

### Quick Start

The installation is completely automated through NPM's `postinstall` hook.

```bash
npm install @johnludlow/agents
```

This automatically:

- Detects your environment (global or local installation)
- Installs agents and skills to OpenCode configuration directory
- Copies agents to GitHub Copilot format in `.github/agents/` (local mode)
- Attempts to install recommended Copilot plugins (if Copilot CLI is available)
- Creates backup of any existing installation

### Global Installation

```bash
npm install -g @johnludlow/agents
```

Global installation will:

- Install to `~/.config/opencode/` (OpenCode global config)
- Make agents available to all projects
- Install Copilot plugins globally
- Create automated backups

### Local Installation

```bash
npm install @johnludlow/agents
```

Local installation will:

- Install to `.opencode/` (project-local config)
- Create `.github/agents/` and `.github/skills/` directories
- Backups stored in the same directory structure
- Project-specific agent configuration

### Verify Installation

```bash
# List installed agents and skills
ls ~/.config/opencode/agents/   # or .opencode/agents/ for local
ls ~/.config/opencode/skills/   # or .opencode/skills/ for local
```

## Usage

### Using Agents with OpenCode

Once installed, agents are available in OpenCode:

```bash
# In any OpenCode session
/agent johnludlow-feature-planner
```

### Using Agents with GitHub Copilot CLI

First, generate Copilot format:

```bash
npm run generate:copilot
```

Then use in Copilot:

```bash
copilot chat -a johnludlow-feature-planner "Please plan a user authentication system"
```

### Available Commands

```bash
# Install (run automatically on npm install, but can be run manually)
npm run install

# Generate GitHub Copilot format from OpenCode format
npm run generate:copilot

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
├── agents/                 # OpenCode agents (primary source)
│   ├── johnludlow-feature-planner.md
│   ├── johnludlow-feature-implementer.md
│   ├── johnludlow-feature-documenter.md
│   └── johnludlow-feature-tester.md
├── skills/                 # OpenCode skills (primary source)
│   ├── johnludlow-markdown-standards.md
│   └── johnludlow-code-quality.md
├── .github/
│   ├── actions/            # Reusable GitHub Actions
│   │   ├── setup/          # Setup Node.js and determine version
│   │   ├── validate/       # Validate markdown and structure
│   │   └── build/          # Build NPM package
│   ├── agents/             # GitHub Copilot format (generated)
│   ├── skills/             # GitHub Copilot format (generated)
│   └── workflows/
│       └── main.yml        # CI/CD workflow
├── docs/
│   ├── CI-CD.md           # CI/CD pipeline documentation
│   ├── templates/          # Document templates
│   └── plans/              # Generated feature plans
├── scripts/
│   ├── install.js         # Installation script (runs on postinstall)
│   ├── uninstall.js       # Uninstall script (runs on preuninstall)
│   ├── generate-copilot.js # Generate GitHub Copilot format
│   ├── restore.js         # Restore from backup
│   └── init.js            # CLI entry point
├── package.json           # NPM package manifest
└── README.md              # This file
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
~/.config/opencode/.johnludlow-backup-YYYY-MM-DDTHH-MM-SS
```

Restore the latest backup:

```bash
npm run restore
```

## Standards and Best Practices

### Documentation Standards

All documents created by these agents follow the markdown standards defined in the
johnludlow-markdown-standards skill:

- Valid YAML frontmatter
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

1. Edit agent/skill definitions in the `agents/` or `skills/` directories
2. Ensure all markdown files pass markdownlint validation
3. Run `npm run generate:copilot` to update GitHub Copilot format
4. Test installation: `npm install` (from package directory)
5. Update README.md if adding new agents or skills
6. Submit a pull request with clear descriptions

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

[Add your license here]

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
- Installation scripts (PowerShell and Bash)
- GitHub Actions validation workflow
- Documentation templates

---

Built with ❤️ for multi-language, multi-framework development
