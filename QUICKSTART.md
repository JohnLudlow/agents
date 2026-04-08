# Quick Start Guide

## Installation

The simplest way to install `@johnludlow/agents` is using NPM:

```bash
npm install @johnludlow/agents
```

Or for global installation across all your projects:

```bash
npm install -g @johnludlow/agents
```

That's it! The installation script runs automatically and sets up:

- Agents to OpenCode configuration
- Skills to OpenCode configuration
- Backup of any existing installation
- GitHub Copilot format (optional, use `npm run generate:copilot`)

## What Gets Installed

### OpenCode

Agents and skills are installed to:

- **Global**: `~/.config/opencode/agents/` and `~/.config/opencode/skills/`
- **Local**: `.opencode/agents/` and `.opencode/skills/`

### GitHub Copilot

Generate Copilot format (optional):

```bash
npm run generate:copilot
```

This creates:

- `.github/agents/`
- `.github/skills/`

## Using the Agents

### With OpenCode

Agents are ready to use immediately after installation:

```bash
# In OpenCode chat
/agent johnludlow-feature-planner
```

### With GitHub Copilot CLI

First generate the Copilot format:

```bash
npm run generate:copilot
```

Then use with Copilot:

```bash
copilot chat -a johnludlow-feature-planner "Please plan a new feature"
```

## Example Workflow

### 1. Plan a Feature

```bash
# Using OpenCode
/agent johnludlow-feature-planner
```

"I need to implement user authentication with OAuth2"

**Output**: Creates `docs/plans/user-authentication.md`

### 2. Implement the Feature

```bash
/agent johnludlow-feature-implementer
```

"Implement the authentication system according to the plan in
docs/plans/user-authentication.md"

**Output**: Modified source files with implementation

### 3. Document the Feature

```bash
/agent johnludlow-feature-documenter
```

"Create API documentation for the authentication system"

**Output**: Creates `docs/api/authentication.md`

### 4. Run Tests

```bash
/agent johnludlow-feature-tester
```

"Run all authentication-related tests"

**Output**: Test results and coverage report

## Available Commands

```bash
# Installation (automatic, but can be run manually)
npm run install

# Generate GitHub Copilot format from OpenCode format
npm run generate:copilot

# Restore from latest backup
npm run restore

# Show help
npx johnludlow-agents help

# Show version
npx johnludlow-agents version
```

## Agent Details

### johnludlow-feature-planner (Temperature: 0.6)

- **Purpose**: Create comprehensive feature plans
- **Input**: Feature description or user story
- **Output**: Well-structured plan document in `docs/plans/`
- **Ideal for**: Planning, requirements clarification, architecture decisions

### johnludlow-feature-implementer (Temperature: 0.2)

- **Purpose**: Implement features following approved plans
- **Input**: Plan document + implementation details
- **Output**: Code changes, tests, and updated documentation
- **Ideal for**: Feature implementation, refactoring, bug fixes

### johnludlow-feature-documenter (Temperature: 0.2)

- **Purpose**: Generate technical documentation
- **Input**: Implementation code + documentation requirements
- **Output**: API docs, guides, and reference materials in `docs/`
- **Ideal for**: API documentation, user guides, architecture docs

### johnludlow-feature-tester (Temperature: 0.2)

- **Purpose**: Run automated tests and validate implementations
- **Input**: Test specifications or implementation
- **Output**: Test results, coverage metrics, failure analysis
- **Ideal for**: Quality assurance, regression testing, validation

## Supported Languages

These agents work with:

- **C# / .NET** (primary)
- **TypeScript / JavaScript**
- **C++** (game development)

## Troubleshooting

### Agents not found in OpenCode

1. Verify installation: `ls ~/.config/opencode/agents/`
2. If empty, run: `npm run install`
3. Restart OpenCode

### Need to uninstall?

```bash
npm uninstall @johnludlow/agents

# Or globally
npm uninstall -g @johnludlow/agents
```

### Restore from backup?

```bash
npm run restore
```

Backups are saved with timestamps and can be restored at any time.

### Using in your project?

Add to your project's package.json:

```json
{
  "dependencies": {
    "@johnludlow/agents": "^0.0.1"
  }
}
```

Then agents are available locally in `.opencode/agents/`

## Environment Requirements

- **Node.js**: 22.0.0 or higher
- **npm**: 6.0.0 or higher
- **OpenCode**: (optional, but required to use the agents)
- **GitHub Copilot CLI**: (optional, for Copilot integration)

## More Information

- See **README.md** for comprehensive documentation
- See **CONTRIBUTING.md** for development guidelines
- Check individual agent definitions in `agents/` directory
- Review skill definitions in `skills/` directory

## Getting Help

- Read the [README.md](README.md)
- Contribute: See [CONTRIBUTING.md](CONTRIBUTING.md)
- Report issues on GitHub
- Start discussions for questions

---

Happy planning, implementing, and documenting!
