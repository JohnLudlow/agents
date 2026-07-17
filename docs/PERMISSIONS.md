# Agent Permissions

This document describes the permission model for @johnludlow/agents agents in
OpenCode.

## Overview

Each agent has specific permissions that control what actions it can perform. These
permissions are automatically installed to your OpenCode configuration and ensure
agents operate within their intended scope.

This project uses a two-tier architecture:

- **Top-level agents** (`mode: primary`) are user-facing entry points with locked
  intent and restricted delegation permissions
- **Sub-agents** (`mode: subagent`) perform the actual work within their specific
  domain

## Permission Levels

Each permission can be set to:

- **`allow`** — The action runs without approval
- **`ask`** — OpenCode prompts you for approval before running the action
- **`deny`** — The action is blocked and cannot run

All agents in this repository are also configured to use the following tooling
without approval prompts where the harness supports them:

- LSP resources
- Skill invocation
- Codegraph exploration tools (`codegraph_codegraph_explore`,
  `codegraph_codegraph_node`, `codegraph_codegraph_search`)

### Provider Command Allowlists

For provider interactions, agents may use only the following commands:

- **Read-only context** (planner and non-planner agents):
  - `gh issue list*`
  - `gh issue view*`
  - `az boards query*`
  - `az boards work-item show*`
- **Approval-gated writes** (planner agents only):
  - `gh issue create*`
  - `gh issue edit*`
  - `az boards work-item create*`
  - `az boards work-item update*`

Non-planner agents may use read-only provider commands for context only:

- `gh issue list`, `gh issue view`
- `az boards query`, `az boards work-item show`

Provider-native create and update actions remain out of scope for non-planner
agents unless a later change explicitly expands that scope.

## Top-Level Agent Permissions

Top-level agents orchestrate work by delegating to sub-agents. They have restricted
`task` permissions that control which sub-agents they can invoke.

### Planner (`johnludlow-planner`)

**Purpose**: Orchestrates planning work. Plans only, never implements.

**Capabilities**:

- Read all project files
- Write to `docs/plans/` directory
- Run read-only git commands
- Read GitHub issue and Azure DevOps work-item context
- Create and update GitHub issues with approval
- Create and update Azure DevOps work items with approval
- Delegate to: feature-planner, feature-documenter, feature-reviewer

**Restrictions**:

- Cannot delegate to feature-implementer or feature-tester
- Cannot modify source code
- Cannot commit, push, pull, rebase, or merge changes
- Cannot create, delete, or modify git branches
- Cannot perform provider writes without explicit approval
- Cannot run build or test commands

### Implementer (`johnludlow-implementer`)

**Purpose**: Orchestrates implementation of approved plans.

**Capabilities**:

- Read all project files (except .env)
- Use LSP where available
- Run read-only git commands
- Read provider issue and work-item context
- Delegate to: feature-implementer, feature-tester, feature-reviewer

**Restrictions**:

- Cannot delegate to feature-planner or feature-documenter
- Cannot edit files directly (must delegate to sub-agents)
- Cannot commit or push changes
- Cannot create or update provider-native records

### TDD Implementer (`johnludlow-tdd-implementer`)

**Purpose**: Orchestrates test-driven implementation (red-green-refactor).

**Capabilities**:

- Read all project files (except .env)
- Use LSP where available
- Run read-only git commands
- Read provider issue and work-item context
- Delegate to: feature-tester, feature-implementer, feature-reviewer

**Restrictions**:

- Cannot delegate to feature-planner or feature-documenter
- Cannot edit files directly (must delegate to sub-agents)
- Cannot commit or push changes
- Cannot create or update provider-native records
- Enforces test-first ordering via system prompt

### Documenter (`johnludlow-documenter`)

**Purpose**: Orchestrates documentation work.

**Capabilities**:

- Read all project files
- Use LSP where available
- Run read-only git commands
- Read provider issue and work-item context
- Delegate to: feature-documenter, feature-reviewer

**Restrictions**:

- Cannot delegate to feature-planner, feature-implementer, or feature-tester
- Cannot edit files directly (must delegate to sub-agents)
- Cannot commit or push changes
- Cannot create or update provider-native records

### Tester (`johnludlow-tester`)

**Purpose**: Orchestrates test execution and reporting.

**Capabilities**:

- Read all project files (except .env)
- Use LSP where available
- Run read-only git commands
- Read provider issue and work-item context
- Delegate to: feature-tester, feature-reviewer

**Restrictions**:

- Cannot delegate to feature-planner, feature-implementer, or feature-documenter
- Cannot edit files directly (must delegate to sub-agents)
- Cannot commit or push changes
- Cannot create or update provider-native records

## Sub-Agent Permissions

Sub-agents perform the actual work delegated by top-level agents.

### Feature Planner (`johnludlow-feature-planner`)

**Purpose**: Creates detailed feature plans and implementation specifications.

**Capabilities**:

- Read all project files
- Write to `/docs/plans/` directory
- Run read-only git commands (log, status, diff)
- Read GitHub issue and Azure DevOps work-item context
- Create and update GitHub issues with approval
- Create and update Azure DevOps work items with approval

**Restrictions**:

- Cannot modify source code
- Cannot commit, push, pull, rebase, or merge changes
- Cannot create, delete, or modify git branches
- Cannot perform provider writes without explicit approval
- Cannot run build or test commands
- Cannot modify configuration files

**Use cases**:

- Planning new features
- Creating implementation specifications
- Creating GitHub issues or Azure DevOps work items for features
- Analyzing existing code structure

### Feature Implementer (`johnludlow-feature-implementer`)

**Purpose**: Implements features and writes code changes.

**Capabilities**:

- Read all project files (except .env)
- Use LSP where available
- Read provider issue and work-item context
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
- Cannot create or update provider-native records
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
- Use LSP where available
- Read provider issue and work-item context
- Write to documentation:
  - `/docs/*.md`
  - `/docs/templates/*.md`
  - `README.md`
- Run read-only git commands

**Restrictions**:

- Cannot modify source code
- Cannot commit or push changes
- Cannot create or update provider-native records
- Cannot write plan documents in `docs/plans/`
- Cannot run build or test commands
- Cannot modify configuration files

**Use cases**:

- Writing API documentation
- Creating user guides
- Updating README and guides
- Supporting documentation for approved work

### Feature Tester (`johnludlow-feature-tester`)

**Purpose**: Tests features and reports test results.

**Capabilities**:

- Read all project files (except .env)
- Use LSP where available
- Read provider issue and work-item context
- Run test commands:
  - `npm test`
  - `dotnet test`
  - `cargo test`
- Run read-only git commands

**Restrictions**:

- Cannot make any code changes
- Cannot commit or push changes
- Cannot create or update provider-native records
- Cannot run build commands
- Cannot run other system commands

**Use cases**:

- Running comprehensive test suites
- Reporting test results
- Analyzing test failures
- Verifying features work correctly

### Feature Reviewer (`johnludlow-feature-reviewer`)

**Purpose**: Adversarial quality gate. Reviews all work before completion.

**Capabilities**:

- Read all project files
- Use LSP where available
- Read provider issue and work-item context
- Run read-only git commands (log, status, diff, branch)
- Analyse diffs and code changes

**Restrictions**:

- Cannot edit or write any files (strictly read-only)
- Cannot run build or test commands
- Cannot commit or push changes
- Cannot create or update provider-native records
- Cannot delegate to other agents
- Cannot fetch web content

**Use cases**:

- Reviewing plans for completeness and correctness
- Reviewing code changes for quality and standards compliance
- Reviewing documentation for accuracy
- Reviewing test results for adequacy
- Providing PASS/FAIL verdicts with severity-rated feedback

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
- Create a GitHub issue with the plan, with approval

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
- Read GitHub issue and Azure DevOps work-item context
- Support documentation for approved work

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

### Usage Reporting

All agents now include automatic token and context usage reporting capabilities:

**Sub-agents** report their usage as a single-line summary after completing work:

- OpenCode: Run `/tokenscope`, or if unavailable, fall back to native session tool calls
- Copilot CLI: Run the built-in `/usage` and `/context` commands

**Top-level agents** collect sub-agent summaries, add their own platform usage
data, and present an aggregated report before reporting completion.

No additional permissions are required — session tools are native tool calls,
`/tokenscope` is provided by the already-installed plugin, and `/usage` and
`/context` are built into Copilot CLI.

## Safety Guidelines

These permissions are designed to:

1. **Prevent accidents** — Restrict destructive operations (like `git push`)
2. **Enable productivity** — Allow agents to do their intended work
3. **Maintain control** — Require approval for sensitive operations
4. **Reduce friction** — Minimize approval prompts for safe operations

## See Also

- [OpenCode Permissions Documentation](https://opencode.ai/docs/permissions/)
- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/)
