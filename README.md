# johnludlow Agents and Skills

A collection of reusable AI agents and skills for Copilot CLI and OpenCode, designed to streamline feature planning, implementation, documentation, and testing for multi-language projects.

## Overview

This repository contains agents and skills that work with both Copilot CLI and OpenCode. These tools are designed to assist with the complete software development lifecycle:

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

- **Plan Template** (`docs/templates/plan-template.md`): Structure for feature plans
- **Documentation Template** (`docs/templates/documentation-template.md`): Structure for technical documentation

## Installation

### Prerequisites

- Node.js 18+ (for Copilot CLI or OpenCode)
- Git
- Bash (Linux/macOS) or PowerShell (Windows)

### Quick Start

#### Windows (PowerShell)
```powershell
cd path/to/your/repo
.\install.ps1 -All
```

#### Linux/macOS (Bash)
```bash
cd /path/to/your/repo
chmod +x ./install.sh
./install.sh --all
```

### Advanced Installation

Install for specific tools:

**PowerShell:**
```powershell
.\install.ps1 -OpenCode
.\install.ps1 -CopilotCLI
```

**Bash:**
```bash
./install.sh --opencode
./install.sh --copilot-cli
```

Specify custom installation path:

**PowerShell:**
```powershell
.\install.ps1 -InstallPath "C:\custom\path"
```

**Bash:**
```bash
./install.sh --install-path "/custom/path"
```

## Usage

### Using Agents with Copilot CLI

```bash
copilot chat johnludlow-feature-planner "Please plan a user authentication system"
```

### Using Agents with OpenCode

```bash
opencode agent johnludlow-feature-planner
# or
opencode /command johnludlow-feature-planner "Please plan a user authentication system"
```

## Workflow Example

A typical workflow using these agents:

1. **Plan** (johnludlow-feature-planner)
   ```
   Define feature requirements, architecture, and implementation phases
   Output: Feature plan document
   ```

2. **Implement** (johnludlow-feature-implementer)
   ```
   Follow the plan to implement code and tests
   Output: Updated source files, tests, and code changes
   ```

3. **Document** (johnludlow-feature-documenter)
   ```
   Create user-friendly documentation for the feature
   Output: API docs, guides, and references
   ```

4. **Test** (johnludlow-feature-tester)
   ```
   Run automated tests and report results
   Output: Test results and coverage reports
   ```

## Supported Languages

These agents are designed to work with:

- **C# / .NET**: Primary language with full support
- **TypeScript / JavaScript**: Full support for web development
- **C++**: Support for game development and systems programming

## Key Features

- ✅ Cross-platform compatibility (Windows, Linux, macOS)
- ✅ Works with both Copilot CLI and OpenCode
- ✅ Enforces documentation standards
- ✅ Consistent code quality expectations
- ✅ Template-based document generation
- ✅ Automated markdown validation

## Project Structure

```
.
├── .github/
│   ├── agents/              # Agent definitions
│   │   ├── johnludlow-feature-planner.md
│   │   ├── johnludlow-feature-implementer.md
│   │   ├── johnludlow-feature-documenter.md
│   │   └── johnludlow-feature-tester.md
│   ├── skills/              # Shared skills
│   │   ├── johnludlow-markdown-standards.md
│   │   └── johnludlow-code-quality.md
│   └── workflows/           # GitHub Actions workflows
│       └── validate.yml
├── docs/
│   ├── templates/           # Document templates
│   │   ├── plan-template.md
│   │   └── documentation-template.md
│   └── plans/               # Generated feature plans
├── scripts/
│   ├── install.ps1         # PowerShell installer
│   └── install.sh          # Bash installer
└── prompt.md               # Original specifications
```

## Configuration

### Copilot CLI

The installation script automatically installs the recommended Copilot plugins. Agents are installed to:

```
~/.local/share/agents/agents/johnludlow-*.md
```

After installation, agents can be referenced in Copilot CLI configuration. Check Copilot CLI documentation for agent configuration details.

**Installed Plugins:**
- awesome-copilot, azure, doublecheck, dotnet, dotnet-diag
- context-engineering, csharp-dotnet-development, csharp-mcp-development
- devops-oncall, technical-spike, microsoft-docs
- openapi-to-application-csharp-dotnet, polyglot-test-agent
- roundup, project-planning, security-best-practices

### OpenCode

Agents are installed to:

```
~/.local/share/agents/agents/johnludlow-*.md
```

Configure agents in your OpenCode configuration file based on your tool's requirements.

## Standards and Best Practices

### Documentation Standards

All documents created by these agents follow the markdown standards defined in johnludlow-markdown-standards skill:

- Valid YAML frontmatter
- Proper heading hierarchy
- Markdown linting compliance
- Plain language with defined jargon
- Valid internal and external links

### Code Quality Standards

Code created by johnludlow-feature-implementer follows the standards in johnludlow-code-quality skill:

- SOLID principles
- Language-specific best practices
- Performance considerations
- Comprehensive testing
- Clear, maintainable code

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Ensure all markdown files pass markdownlint validation
2. Add descriptive comments to agent definitions
3. Update templates when adding new document types
4. Test installation scripts before submitting changes
5. Update this README if adding new agents or skills

## License

[Add your license here]

## Related Repositories

- [Template Repository](https://github.com/JohnLudlow/Template) - Original template with agents
- [FourXGame Repository](https://github.com/JohnLudlow/FourXGame) - Game development agents

## Support

For issues or questions:

- GitHub Issues: [Create an issue](../../issues)
- Discussions: [Start a discussion](../../discussions)

## Changelog

### v0.0.1 (Initial Release)
- Initial agent definitions (planner, implementer, documenter, tester)
- Core skills (markdown standards, code quality)
- Installation scripts (PowerShell and Bash)
- GitHub Actions validation workflow
- Documentation templates

---

Built with ❤️ for multi-language, multi-framework development
