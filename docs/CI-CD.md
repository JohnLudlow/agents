# CI/CD Pipeline Documentation

This document describes the automated CI/CD pipeline for the johnludlow agents
and skills repository.

## Overview

The repository uses GitHub Actions for automated validation, testing, building,
and releasing of the NPM package. The pipeline ensures all changes meet quality
standards before being released.

## Workflow: main.yml

The primary workflow is defined in `.github/workflows/main.yml` and executes on:

- Push to `main` or `develop` branches
- Pull requests to either branch

## Pipeline Stages

### 1. Setup Job

**Purpose**: Initialize the environment and determine semantic version

**Actions**:

- Setup Node.js 22
- Install GitVersion
- Execute GitVersion to determine the next semantic version
- Output version information for subsequent jobs

**Output**: Version number (e.g., `0.1.0`)

### 2. Validate Job

**Purpose**: Check code quality and markdown standards

**Actions**:

- Validate markdown syntax with `rumdl check`
- Check required sections in agent definitions
- Check required sections in skill definitions
- Validate template file structure
- Validate package.json

**Required Sections**:

**Agents must include**:

- Description
- Purpose
- Capabilities
- Restrictions

**Skills must include**:

- Overview

**Templates must include**:

- Plain markdown content only (no YAML frontmatter)

### 3. Build Job

**Purpose**: Create distributable artifacts

**Actions**:

- Create NPM package (`.tgz`)
- Generate GitHub Copilot format artifacts
- Store artifacts for download

**Outputs**:

- `@johnludlow-agents-*.tgz` - NPM package
- `.github/agents/` - Generated Copilot format agents
- `.github/skills/` - Generated Copilot format skills

### 4. Release Job

**Purpose**: Create GitHub release and tag commit (main branch only)

**Actions**:

- Run only on `main` branch after successful build
- Create git tag with semantic version
- Create GitHub release with version number
- Attach build artifacts to release

**Outputs**:

- Git tag (e.g., `v0.1.0`)
- GitHub Release with downloadable artifacts

## Semantic Versioning

The pipeline uses **GitVersion** for automatic semantic versioning based on:

- Commit history analysis
- Conventional commit messages
- Git tags

### Version Bumping

Control version bumps using commit message prefixes:

- `+semver: major` - Increment major version (breaking changes)
- `+semver: minor` - Increment minor version (new features)
- `+semver: patch` - Increment patch version (bug fixes)
- `+semver: none` - No version change

**Example commit message**:

```text
feat: add new johnludlow-performance-analyzer agent

+semver: minor
```

## Reusable Actions

The pipeline uses reusable GitHub Actions for modularity:

### `.github/actions/setup`

Initializes the build environment:

- Sets up Node.js 22
- Installs and runs GitVersion
- Exposes version output variables

### `.github/actions/validate`

Validates code quality:

- Markdown linting with `rumdl`
- Structural validation of agents and skills
- Configuration validation

### `.github/actions/build`

Creates distributable artifacts:

- Generates NPM package
- Creates GitHub Copilot format files
- Prepares release artifacts

## Local Testing

### Running the Validate Action Locally

```bash
# Install rumdl
npm install -g rumdl

# Run markdown validation
rumdl check .

# Check agent structure
for file in agents/*.md; do
  grep -q "## Description" "$file" || echo "Missing Description in $file"
  grep -q "## Purpose" "$file" || echo "Missing Purpose in $file"
done
```

### Running the Build Locally

```bash
# Generate NPM package
npm pack

# Generate Copilot format
npm run generate:copilot
```

## Troubleshooting

### Pipeline Fails on Markdown Validation

Check the validate action output for specific errors:

```bash
rumdl check .
```

Common issues:

- Lines exceeding 80 characters (MD013)
- Headings not surrounded by blank lines (MD022)
- Missing language specification in code blocks (MD040)

### Pipeline Fails on Agent Validation

Ensure all agent files have required sections:

```bash
for file in agents/*.md; do
  grep -q "## Description" "$file" || echo "Missing in $file"
  grep -q "## Purpose" "$file" || echo "Missing in $file"
  grep -q "## Capabilities" "$file" || echo "Missing in $file"
  grep -q "## Restrictions" "$file" || echo "Missing in $file"
done
```

### Version Not Incrementing

Check GitVersion configuration in `GitVersion.yml`. Common issues:

- Branch not in configuration
- Git tags not properly formatted
- Commit messages not following convention

## Environment Variables

The pipeline uses these environment variables:

- `GITHUB_TOKEN` - For GitHub CLI operations
- `VERSION` - Semantic version from GitVersion

## Security

- Git operations in CI that push commits or tags use HTTPS with the GitHub-provided `GITHUB_TOKEN`
- No credentials are logged
- Release tags are used to identify published artifacts

## See Also

- [Contributing Guidelines](../CONTRIBUTING.md)
- [README.md](../README.md)
- [GitVersion Documentation](https://gitversion.net/)
