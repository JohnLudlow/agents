# Agent Permissions

This document describes the permission model for @johnludlow/agents agents in
OpenCode.

## Overview

Each agent has specific permissions that control what actions it can perform. These
permissions are automatically installed to your OpenCode configuration and ensure
agents operate within their intended scope.

## Permission Levels

Each permission can be set to:

- **`allow`** — The action runs without approval
- **`ask`** — OpenCode prompts you for approval before running the action
- **`deny`** — The action is blocked and cannot run

## Agent Roles and Permissions

### Feature Planner (`johnludlow-feature-planner`)

**Purpose**: Creates detailed feature plans and implementation specifications.

**Capabilities**:

- Read all project files
- Write to `/docs/plans/` directory
- Run read-only git commands (log, status, diff)
- Create and update GitHub issues

**Restrictions**:

- Cannot modify source code
- Cannot commit or push changes
- Cannot run build or test commands
- Cannot modify configuration files

**Use cases**:

- Planning new features
- Creating implementation specifications
- Creating GitHub issues for features
- Analyzing existing code structure

### Feature Implementer (`johnludlow-feature-implementer`)

**Purpose**: Implements features and writes code changes.

**Capabilities**:

- Read all project files (except .env)
- Write to source directories:
  - `src/**`
  - `lib/**`
  - `components/**`
  - `*.ts`, `*.tsx`, `*.cs`, `*.cpp`, `*.h` files
- Run build commands: `npm run build`, `dotnet build`, `cargo build`
- Run test commands: `npm test`, `dotnet test`, `cargo test`
- Run linters: `npm run lint`
- Run read-only git commands

**Restrictions**:

- Cannot commit or push changes (use `git diff` to review)
- Cannot modify configuration or environment files
- Cannot write to documentation directories
- Cannot run other system commands

**Supported Languages**:

- TypeScript/JavaScript
- C#
- C++

**Use cases**:

- Writing new features
- Modifying existing code
- Running tests and linters
- Reviewing changes before submission

### Feature Documenter (`johnludlow-feature-documenter`)

**Purpose**: Writes and maintains project documentation.

**Capabilities**:

- Read all project files
- Write to documentation:
  - `/docs/**` directory
  - `/docs/plans/` directory
  - `README.md`
- Run read-only git commands
- Create and update GitHub issues

**Restrictions**:

- Cannot modify source code
- Cannot commit or push changes
- Cannot run build or test commands
- Cannot modify configuration files

**Use cases**:

- Writing API documentation
- Creating user guides
- Updating README and guides
- Maintaining documentation plans

### Feature Tester (`johnludlow-feature-tester`)

**Purpose**: Tests features and reports test results.

**Capabilities**:

- Read all project files (except .env)
- Run test commands:
  - `npm test`
  - `dotnet test`
  - `cargo test`
- Run read-only git commands

**Restrictions**:

- Cannot make any code changes
- Cannot commit or push changes
- Cannot run build commands
- Cannot run other system commands

**Use cases**:

- Running comprehensive test suites
- Reporting test results
- Analyzing test failures
- Verifying features work correctly

## Permission File Location

The permissions are defined in two places:

### 1. Global Configuration (`config.json`)

Installed to `~/.config/opencode/config.json` (global) or `.opencode/config.json`
(local).

Contains:

- Global permission defaults
- Agent-specific permission overrides

### 2. Agent Definitions (Markdown)

Installed to `~/.config/opencode/agents/` (global) or `.opencode/agents/`
(local).

Contains:

- Individual agent descriptions
- Agent-specific permission rules
- Agent capabilities and restrictions

## Examples

### Ask the Planner to Create a Feature Plan

```text
@johnludlow-feature-planner Create a detailed plan for adding user authentication
to the API
```

The planner can:

- Read all code files
- Write the plan to `/docs/plans/authentication-plan.md`
- Create a GitHub issue with the plan

### Ask the Implementer to Implement a Feature

```text
@johnludlow-feature-implementer Implement the feature described in /docs/plans/authentication-plan.md
```

The implementer can:

- Read the plan and all code
- Write implementation code
- Run tests and linters
- Review changes with `git diff`

The implementer cannot:

- Commit the changes (you'll submit them via `git commit` yourself)
- Delete or modify other files

### Ask the Documenter to Update Documentation

```text
@johnludlow-feature-documenter Update the API documentation with the new
authentication endpoints
```

The documenter can:

- Read all code and documentation
- Write to `/docs/` directory
- Create GitHub issues
- Create documentation plans

### Ask the Tester to Verify Implementation

```text
@johnludlow-feature-tester Run all tests and report results for the
authentication feature
```

The tester can:

- Run the full test suite
- Report which tests pass/fail
- Analyze test coverage
- Suggest test improvements

## Permission Patterns

Permissions use simple pattern matching:

- `*` — Matches any command or file path
- `?` — Matches exactly one character
- `git log*` — Matches `git log` with any arguments
- `src/**` — Matches all files under src/
- `*.env` — Matches .env files

## Modifying Permissions

You can customize agent permissions by editing:

1. **Global config** (`~/.config/opencode/config.json` or `.opencode/config.json`)
2. **Agent definitions** (`~/.config/opencode/agents/*.md` or `.opencode/agents/*.md`)

After modifying, restart OpenCode for changes to take effect.

### Example: Allow Implementer to Commit

Add to `config.json` in the `johnludlow-feature-implementer` agent:

```json
{
  "agent": {
    "johnludlow-feature-implementer": {
      "permission": {
        "bash": {
          "git commit *": "ask"
        }
      }
    }
  }
}
```

## Safety Guidelines

These permissions are designed to:

1. **Prevent accidents** — Restrict destructive operations (like `git push`)
2. **Enable productivity** — Allow agents to do their intended work
3. **Maintain control** — Require approval for sensitive operations
4. **Reduce friction** — Minimize approval prompts for safe operations

## See Also

- [OpenCode Permissions Documentation](https://opencode.ai/docs/permissions/)
- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/)
