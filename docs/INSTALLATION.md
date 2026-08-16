# Installation Guide

This guide explains how to install `jl-agents` using APM (Agent Package Manager).

## Prerequisites

Before installing, ensure you have:

- **APM CLI** - [Install APM](https://aka.ms/apm)
- **Internet connection** - To download the package

## Quick Start (Recommended)

Install using APM from the GitHub repository:

**Windows (PowerShell):**

```powershell
apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
```

**macOS/Linux (Bash):**

```bash
apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
```

Replace `vX.Y.Z` with the latest release version from the [releases page](https://github.com/JohnLudlow/agents/releases).

## Installation Methods

### Method 1: From GitHub (Recommended)

Install directly from the GitHub repository using a specific release tag:

```bash
apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
```

**Flags explained:**

- `#vX.Y.Z` — pins to a specific release (recommended for reproducibility)
- `--global` — installs system-wide (omit for project-local installation)
- `--target opencode` — specifies the OpenCode deployment target
- `--force` — overwrites any existing installation

**Advantages:**

- Simple one-command installation
- Works on all platforms (Windows, macOS, Linux)
- Automatically resolves dependencies
- Stores installation metadata in `apm.lock.yaml` for reproducibility

### Method 2: From Latest Default Branch

Install the latest development version (unreleased):

```bash
apm install JohnLudlow/agents --global --target opencode --force
```

**Note:** This installs HEAD of the default branch, which may include unreleased changes.

### Method 3: From a Specific Branch or Commit

```bash
# Install from a specific branch
apm install JohnLudlow/agents#branch-name --global --target opencode --force

# Install from a specific commit SHA
apm install JohnLudlow/agents#abc123def456 --global --target opencode --force
```

### Method 4: Local Installation (Project-Specific)

To install locally in your current project instead of globally:

```bash
apm install JohnLudlow/agents#vX.Y.Z --target opencode --force
```

(Omit the `--global` flag)

## Installation Locations

### Local Installation (Project-Specific)

Installs agents and skills into the current project directory:

```bash
apm install JohnLudlow/agents#vX.Y.Z --target opencode --force
```

**Installation directories:**

- Agents: `.opencode/agents/`
- Skills: `.opencode/skills/`

**When to use:**

- Installing for a specific project
- Multiple projects with different configurations
- Keeping agents project-specific

### Global Installation (System-Wide)

Makes agents available to all projects:

```bash
apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
```

**Installation directories:**

- Agents: `~/.config/opencode/agents/` (macOS/Linux)
- Agents: `$APPDATA/opencode/agents/` (Windows)
- Skills: `~/.config/opencode/skills/` (macOS/Linux)
- Skills: `$APPDATA/opencode/skills/` (Windows)

**When to use:**

- Using agents in multiple projects
- System-wide agent management
- Simplifying workflow across projects

## Verification

After installation, verify that the agents landed in your OpenCode installation:

**macOS/Linux:**

```bash
ls ~/.config/opencode/agents/ | grep jl-
```

**Windows (PowerShell):**

```powershell
ls $env:APPDATA\opencode\agents\ | Where-Object Name -like "jl-*"
```

You should see agent files like:

- `jl-planner.agent.md`
- `jl-implementer.agent.md`
- `jl-feature-documenter.agent.md` (if available)
- `jl-feature-tester.agent.md` (if available)

### Check the Lockfile

Inspect `apm.lock.yaml` to confirm what was installed:

```bash
cat apm.lock.yaml
```

You should see entries like:

```yaml
local_deployed_files:
  - .github/agents/jl-planner.agent.md
  - .github/agents/jl-implementer.agent.md
local_deployed_file_hashes:
  .github/agents/jl-planner.agent.md: sha256:...
```

### Test Agent Integration

**With OpenCode:**

```bash
# Try using an agent
opencode chat
# Select an installed agent from the agent picker
```

## Uninstallation

To remove the agents and skills:

**Linux/macOS:**

```bash
rm -rf ~/.config/opencode/agents/jl-*
rm -rf ~/.config/opencode/skills/jl-*
```

**Windows (PowerShell):**

```powershell
Remove-Item $env:APPDATA\opencode\agents\jl-* -Recurse
Remove-Item $env:APPDATA\opencode\skills\jl-* -Recurse
```

To remove a local (project-specific) installation:

```bash
rm -rf .opencode/agents/jl-*
rm -rf .opencode/skills/jl-*
```

## Troubleshooting

### APM CLI not found

**Error:** `apm: command not found`

**Solution:** Install APM from <https://aka.ms/apm>

```bash
# macOS/Linux
curl -sSL https://aka.ms/apm-unix | sh

# Windows (via PowerShell)
Invoke-WebRequest -Uri "https://aka.ms/apm-win" -OutFile "$env:TEMP\apm-setup.exe"
& "$env:TEMP\apm-setup.exe"
```

### Installation fails with permission error

**Error:** Permission denied or access denied

**Solution:**

1. For global installation on macOS/Linux, use `sudo`:

   ```bash
   sudo apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
   ```

2. For Windows, ensure PowerShell is running as Administrator

3. Check disk space: `df -h` (Linux/macOS) or `Get-PSDrive C:` (Windows)

### Agents not appearing after installation

**Solution:**

1. Verify installation completed: `cat apm.lock.yaml`
2. Check the correct directory:
   - Local: `.opencode/agents/`
   - Global: `~/.config/opencode/agents/` (macOS/Linux) or `$APPDATA/opencode/agents/` (Windows)
3. Restart OpenCode or your terminal session
4. Verify the agent files exist and are readable: `ls -la ~/.config/opencode/agents/`

### Update existing installation

To update to a newer version:

```bash
apm install JohnLudlow/agents#vX.Y.Z --global --target opencode --force
```

The `--force` flag will overwrite the previous installation.

## Reproducible Installations (For CI/Teams)

To ensure everyone uses the same resolved versions:

### Local: Create the lockfile

```bash
apm install JohnLudlow/agents#vX.Y.Z --update
git add apm.lock.yaml
git commit -m "chore: update apm.lock.yaml"
```

### CI: Use frozen mode

In your CI pipeline:

```bash
apm install --frozen
```

This uses the exact versions recorded in `apm.lock.yaml`, ensuring reproducibility.

## Getting Help

If you encounter issues during installation:

1. **Check this guide** — See the Troubleshooting section above
2. **Check the README** — <https://github.com/JohnLudlow/agents#readme>
3. **Create an issue** — <https://github.com/JohnLudlow/agents/issues>
4. **Start a discussion** — <https://github.com/JohnLudlow/agents/discussions>

## Next Steps

After successful installation:

1. **Read the Quick Start** — <https://github.com/JohnLudlow/agents/blob/main/QUICKSTART.md>
2. **Check the README** — <https://github.com/JohnLudlow/agents#readme>
3. **Review agent definitions** — `.apm/agents/` or `.opencode/agents/`
4. **See usage examples** — Check individual agent files for examples

## What Gets Installed

When you install `jl-agents`, you get:

### Agents

- **jl-planner** — Create comprehensive feature plans
- **jl-implementer** — Implement features from plans
- Additional agents as available in the repository

### Skills

- Supporting skills and utilities (if included in the package)

### Configuration

- **apm.lock.yaml** — Installation metadata and resolved versions
- Permission rules and security boundaries for each agent

## Version Management

To check your installed version, inspect the lockfile:

```bash
cat apm.lock.yaml | grep -A 2 "local_packages"
```

To upgrade, run the install command again with the new version tag:

```bash
apm install JohnLudlow/agents#vNEW.X.Y --global --target opencode --force
git add apm.lock.yaml
git commit -m "chore: update agents to vNEW.X.Y"
```
