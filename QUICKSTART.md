# Quick Start Guide

## Installation

Install using APM (Agent Package Manager):

**Windows (PowerShell):**

```powershell
apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
```

**macOS/Linux (Bash):**

```bash
apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
```

Replace `vX.Y.Z` with the latest release version from the [releases page](https://github.com/JohnLudlow/agents/releases).

That's it! The installation places:

- Agents into OpenCode configuration
- Skills into OpenCode configuration
- Everything ready to use immediately

## What Gets Installed

### OpenCode

Agents and skills are installed to:

- **Global**: `~/.config/opencode/agents/` and `~/.config/opencode/skills/`
- **Local**: `.opencode/agents/` and `.opencode/skills/`

## Using the Agents

### With OpenCode

Agents are ready to use immediately after installation:

```bash
# In OpenCode chat
/agent jl-feature-planner
```

## Example Workflow

### 1. Plan a Feature

```bash
# Using OpenCode
/agent jl-feature-planner
```

"I need to implement user authentication with OAuth2"

**Output**: Creates `docs/plans/user-authentication.md`

### 2. Implement the Feature

```bash
/agent jl-feature-implementer
```

"Implement the authentication system according to the plan in
docs/plans/user-authentication.md"

**Output**: Modified source files with implementation

### 3. Document the Feature

```bash
/agent jl-feature-documenter
```

"Create API documentation for the authentication system"

**Output**: Creates `docs/api/authentication.md`

### 4. Run Tests

```bash
/agent jl-feature-tester
```

"Run all authentication-related tests"

**Output**: Test results and coverage report

## Available Commands

For more information, see the [Installation Guide](docs/INSTALLATION.md) and the [README](README.md).

## Agent Details

### jl-feature-planner (Temperature: 0.3)

- **Purpose**: Create comprehensive feature plans
- **Input**: Feature description or user story
- **Output**: Well-structured plan document in `docs/plans/`
- **Ideal for**: Planning, requirements clarification, architecture decisions

### jl-feature-implementer (Temperature: 0.2)

- **Purpose**: Implement features following approved plans
- **Input**: Plan document + implementation details
- **Output**: Code changes, tests, and updated documentation
- **Ideal for**: Feature implementation, refactoring, bug fixes

### jl-feature-documenter (Temperature: 0.2)

- **Purpose**: Generate technical documentation
- **Input**: Implementation code + documentation requirements
- **Output**: API docs, guides, and reference materials in `docs/`
- **Ideal for**: API documentation, user guides, architecture docs

### jl-feature-tester (Temperature: 0.2)

- **Purpose**: Run automated tests and validate implementations
- **Input**: Test specifications or implementation
- **Output**: Test results, coverage metrics, failure analysis
- **Ideal for**: Quality assurance, regression testing, validation

## Troubleshooting

### Agents not found in OpenCode

1. Verify installation: `ls ~/.config/opencode/agents/`
2. If empty, run: `apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force`
3. Restart OpenCode

### Need to uninstall?

Manually remove the agents and skills directories:

```bash
# For global installation
rm -rf ~/.config/opencode/agents/  # macOS/Linux
rm -rf $env:APPDATA/opencode/agents/  # Windows PowerShell

# For local installation
rm -rf .opencode/agents/
```

## Environment Requirements

- **APM CLI** - Install from <https://aka.ms/apm>
- **OpenCode** - (optional, but required to use the agents)

## More Information

- See **README.md** for comprehensive documentation
- See **CONTRIBUTING.md** for development guidelines
- Check individual agent definitions in `.apm/agents/` directory
- Review skill definitions in `.apm/skills/` directory

## Getting Help

- Read the [README.md](README.md)
- Read the [Installation Guide](docs/INSTALLATION.md)
- Contribute: See [CONTRIBUTING.md](CONTRIBUTING.md)
- Report issues on GitHub
- Start discussions for questions

---

Happy planning, implementing, and documenting!
