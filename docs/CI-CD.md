# CI/CD Pipeline Documentation

## Overview

The `@johnludlow/agents` repository uses a modular GitHub Actions workflow with semantic versioning, automated validation, and artifact publishing. The design follows the patterns established in the Template repository.

## Workflow Structure

### Main Workflow: `.github/workflows/main.yml`

Orchestrates the entire CI/CD pipeline with four main jobs:

```
setup (runs first)
  ↓
  ├─→ validate (parallel)
  │    
  ├─→ build (depends on setup + validate)
  │    ↓
  │    release (depends on setup + build, only on main branch)
```

## Jobs

### 1. Setup Job

**Purpose**: Initialize environment and determine version

**When**: Always runs
**Outputs**: `version` (semantic version)

**Steps**:
1. Checkout repository with full history
2. Setup Node.js 18
3. Determine version based on git tags
4. Cache NPM packages for faster builds

**Version Logic**:
- Gets latest git tag (e.g., `v1.2.3`)
- Increments patch version (e.g., `v1.2.4`)
- Used by downstream jobs for consistent versioning

### 2. Validate Job

**Purpose**: Ensure code quality and documentation standards

**When**: Always runs
**Dependencies**: None

**Validations**:
- ✅ Markdown syntax with markdownlint
- ✅ Required sections in agent definitions:
  - `## Description`
  - `## Purpose`
  - `## Capabilities`
  - `## Restrictions`
- ✅ Required sections in skill definitions:
  - `## Overview`
- ✅ Template structure (YAML frontmatter)
- ✅ package.json validity

**Fails if**: Any validation fails, blocking build and release

### 3. Build Job

**Purpose**: Create NPM package and artifacts

**When**: Always runs (but must pass validate and setup)
**Dependencies**: `setup`, `validate`
**Artifacts**:
- `johnludlow-agents-X.Y.Z.tgz` - NPM package
- `copilot-format/` - GitHub Copilot format agents/skills

**Steps**:
1. Checkout repository
2. Setup Node.js environment
3. Update package.json with determined version
4. Create NPM package with `npm pack`
5. Generate GitHub Copilot format with `npm run generate:copilot`
6. Upload artifacts with 30-day retention

**Artifacts Available**:
```
npm-package/
  └─ johnludlow-agents-0.1.2.tgz    (NPM package)

copilot-format/
  └─ agents/                          (Copilot format agents)
  └─ skills/                          (Copilot format skills)
```

### 4. Release Job

**Purpose**: Tag repository and publish release

**When**: Only on `push` to `main` branch (not pull requests)
**Dependencies**: `setup`, `build`

**Steps**:
1. Checkout repository with full history
2. Configure git user (GitHub Actions bot)
3. Create annotated git tag (e.g., `v0.1.2`)
4. Push tag to repository
5. Triggers GitHub Release creation

**Note**: This job only runs after successful build on main branch

## GitHub Actions

### Action: `.github/actions/setup`

**Reusable action for environment setup and versioning**

**Inputs**: None

**Outputs**:
- `version` - Semantic version (e.g., `0.1.2`)
- `version_tag` - Git tag format (e.g., `v0.1.2`)

**Used by**: All jobs that need versioning or Node.js

### Action: `.github/actions/validate`

**Reusable action for markdown and code validation**

**Inputs**: None

**Outputs**: None (exits with code 1 on failure)

**Used by**: Validate job

**Validations**:
- Markdown files in `agents/`, `skills/`, `docs/templates/`
- Documentation files (`README.md`, `QUICKSTART.md`, `CONTRIBUTING.md`)
- Agent definition structure
- Skill definition structure
- Template frontmatter format
- package.json syntax

### Action: `.github/actions/build`

**Reusable action for building NPM package**

**Inputs**:
- `version` - Version to set in package.json (required)

**Outputs**: None

**Artifacts Created**:
- `johnludlow-agents-X.Y.Z.tgz` - NPM tarball
- `.github/agents/` - Copilot format agents
- `.github/skills/` - Copilot format skills

**Used by**: Build job

## Triggering Workflows

### On Push to Main
All jobs run:
1. `setup` → determines version
2. `validate` → checks quality
3. `build` → creates package
4. `release` → creates git tag and triggers GitHub Release

### On Push to Develop
Jobs 1-3 run, but NOT release:
1. `setup` → determines version
2. `validate` → checks quality
3. `build` → creates package (no tag)

### On Pull Request
Jobs 1-2 run, but NOT build or release:
1. `setup` → determines version
2. `validate` → checks quality

## Version Management

### Semantic Versioning

Uses simple git tag-based versioning:

```bash
# Create releases manually with git tags
git tag v0.1.0
git push origin v0.1.0
```

Or let GitHub Actions create tags:
- Workflow determines next patch version
- Creates git tag: `v0.1.2`
- GitHub Actions creates Release

### Version Format

- **Git tags**: `v0.1.2` (with `v` prefix)
- **package.json**: `0.1.2` (without `v` prefix)
- **Artifacts**: `johnludlow-agents-0.1.2.tgz` (without `v` prefix)

## Artifact Management

### NPM Package

**File**: `johnludlow-agents-X.Y.Z.tgz`

**Created by**: Build job
**Available**: During workflow run
**Retention**: 30 days
**Contains**: All agents, skills, scripts, documentation

**Download**:
```bash
# From GitHub Actions artifacts UI
# Or via gh command:
gh run download <run-id> -n npm-package
```

### Copilot Format

**Location**: `.github/agents/` and `.github/skills/`

**Created by**: `npm run generate:copilot` (in build job)
**Available**: In artifacts and in repository
**Contains**: Agents and skills in GitHub Copilot format

## Permissions

The workflow uses minimal required permissions:

```yaml
permissions:
  contents: read         # Validate job
  artifacts: write       # Build job (upload)
  contents: write        # Release job (git push)
```

## Monitoring

### GitHub Actions UI

- **Actions tab**: View workflow runs
- **Logs**: Detailed output from each job
- **Artifacts**: Download npm package and Copilot format

### Exit Codes

- `0` - Success
- `1` - Validation failed (markdown, structure, etc.)
- `128` - Git error (tag conflicts, etc.)

## Troubleshooting

### Validate Job Fails

**Check**:
1. Markdown files pass `markdownlint`
2. Agent files have required sections
3. Skill files have `## Overview` section
4. Templates have YAML frontmatter
5. package.json is valid JSON

**Fix**:
```bash
# Locally:
npm install -g markdownlint-cli
markdownlint 'agents/*.md'
```

### Build Job Fails

**Check**:
1. Validate job passed
2. Setup job ran successfully
3. `npm pack` works locally
4. `npm run generate:copilot` works locally

**Fix**:
```bash
# Locally:
npm install
npm run generate:copilot
npm pack
```

### Release Job Doesn't Run

**Check**:
1. You're pushing to `main` branch (not PR)
2. Build job succeeded
3. Repository has write permissions

**Note**: Release job only runs on `push` events to `main`, not on pull requests

### Version Already Exists

**If**: Tag `vX.Y.Z` already exists

**Fix**: Delete tag and re-run workflow
```bash
git tag -d vX.Y.Z
git push --delete origin vX.Y.Z
```

## Example Workflow Run

```
Event: Push to main branch
Branch: refs/heads/main
Commit: 12345ab

[setup]
  ├─ Checkout with fetch-depth: 0
  ├─ Setup Node.js 18
  ├─ Git tags: latest = v0.1.0
  ├─ Determine version: 0.1.1
  └─ Output: version = 0.1.1
  
[validate] (parallel)
  ├─ Markdown validation ✓
  ├─ Agent structure ✓
  ├─ Skill structure ✓
  ├─ Template format ✓
  └─ package.json ✓
  
[build] (waits for setup + validate)
  ├─ Setup Node.js
  ├─ Update package.json: 0.1.1
  ├─ Create npm package
  ├─ Generate Copilot format
  ├─ Upload artifact: johnludlow-agents-0.1.1.tgz (30 days)
  └─ Upload artifact: copilot-format (30 days)
  
[release] (waits for setup + build, main branch only)
  ├─ Setup Node.js
  ├─ Create git tag: v0.1.1
  ├─ Push tag to repository
  └─ GitHub Release created (auto)
```

## See Also

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Reusable Workflows](https://docs.github.com/en/actions/learn-github-actions/workflow-syntax-for-github-actions)
- [Template Repository CI/CD](https://github.com/JohnLudlow/Template/.github/workflows)
- [NPM Package Documentation](README.md)
