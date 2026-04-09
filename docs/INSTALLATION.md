# Installation Guide

This guide explains how to install `@johnludlow/agents` from a GitHub release.

## Prerequisites

Before installing, ensure you have:

- **Node.js 22.0.0 or later** - [Download](https://nodejs.org/)
- **npm** - Included with Node.js
- **Internet connection** - To download the release package

### Verify Prerequisites

```bash
# Check Node.js version
node --version   # Should be v22.0.0 or later

# Check npm version
npm --version
```

## Quick Start (Recommended)

Visit the **[GitHub Releases page](https://github.com/JohnLudlow/agents/releases/latest)** to find the latest release.
Each release includes a `.tgz` asset — copy its URL and use it with `npx`:

```bash
npx <tgz-url> install --global
```

Or install it locally in your current project:

```bash
npm install <tgz-url>
```

## Installation Methods

### Method 1: From GitHub Release (Recommended)

Visit the **[GitHub Releases page](https://github.com/JohnLudlow/agents/releases/latest)** to find the latest release.
Each release includes a `.tgz` asset — copy its URL and use it for installation.

**Global installation:**

```bash
npx <tgz-url> install --global
```

**Local installation:**

```bash
npm install <tgz-url>
```

**Advantages:**

- Simple one-command installation
- Works on all platforms (Windows, macOS, Linux)
- No scripts to download or execute
- Automatic error checking by npm
- No extraction needed

### Method 2: Download and Install Locally

For offline installation or manual control:

1. **Download the release package**
   - Visit: <https://github.com/JohnLudlow/agents/releases>
   - Download the `.tgz` file for your version

2. **Install with npm**

   ```bash
   # Global installation
   npm install -g ./johnludlow-agents-X.X.X.tgz

   # Local installation
   npm install ./johnludlow-agents-X.X.X.tgz
   ```

### Method 3: From npm Registry

If the package is published to npm:

```bash
# Global installation
npm install -g @johnludlow/agents

# Local installation
npm install @johnludlow/agents
```

## Installation Locations

### Local Installation (Project-Specific)

Installs agents and skills into the current project directory:

```bash
npm install https://github.com/JohnLudlow/agents/releases/download/vX.X.X/johnludlow-agents-X.X.X.tgz
```

**Installation directories:**

- Agents: `.opencode/agents/`
- Skills: `.opencode/skills/`
- GitHub format: `.github/agents/` and `.github/skills/`

**When to use:**

- Installing for a specific project
- Multiple projects with different configurations
- Keeping agents project-specific

### Global Installation (System-Wide)

Makes agents available to all projects:

```bash
npm install -g https://github.com/JohnLudlow/agents/releases/download/vX.X.X/johnludlow-agents-X.X.X.tgz
```

**Installation directories:**

- Agents: `~/.config/opencode/agents/`
- Skills: `~/.config/opencode/skills/`

**When to use:**

- Using agents in multiple projects
- System-wide agent management
- Simplifying workflow across projects

## Verification

After installation, verify that everything worked correctly.

### List Installed Package

```bash
npm list @johnludlow/agents
```

You should see output like:

```text
your-project@1.0.0
└── @johnludlow/agents@X.X.X
```

### List Installed Agents

**For local installation:**

```bash
ls .opencode/agents/
```

**For global installation:**

```bash
ls ~/.config/opencode/agents/
```

You should see files like:

- `johnludlow-feature-planner.md`
- `johnludlow-feature-implementer.md`
- `johnludlow-feature-documenter.md`
- `johnludlow-feature-tester.md`

### Test Agent Integration

**With OpenCode:**

```bash
# Try using an agent
opencode agent johnludlow-feature-planner
```

**With GitHub Copilot CLI:**

```bash
# List available agents
copilot agent list

# Use an agent
copilot chat -a johnludlow-feature-planner
```

## Uninstallation

To remove the package:

```bash
npm uninstall @johnludlow/agents
```

For global installation:

```bash
npm uninstall -g @johnludlow/agents
```

**Note:** The uninstall script will automatically remove agents and skills from your OpenCode configuration directory.

## Troubleshooting

### Node.js version error

**Error:** `npm ERR! engine unsupported`

**Solution:** Upgrade Node.js to version 22.0.0 or later

```bash
# Visit https://nodejs.org/ to download and install
node --version  # Verify installation
```

### npm not found

**Error:** `npm: command not found`

**Solution:** npm is included with Node.js. Reinstall Node.js from <https://nodejs.org/>

### Network/Download fails

**Error:** `npm ERR! 404 Not Found` or download timeout

**Solution:**

1. Check your internet connection
2. Verify the release version exists: <https://github.com/JohnLudlow/agents/releases>
3. Try again - GitHub may be temporarily unavailable
4. Use a specific version instead of "latest"

### npm install fails

**Error:** `npm ERR! code ERESOLVE` or permission errors

**Solution:**

1. Check npm version: `npm --version`
2. Clear npm cache: `npm cache clean --force`
3. Try installing again
4. Check if disk space is available
5. For global install, ensure you have write permissions to npm's global directory

### Cannot find module error after installation

**Error:** `Cannot find module '@johnludlow/agents'`

**Solution:**

1. Verify installation: `npm list @johnludlow/agents`
2. Try reinstalling: `npm install @johnludlow/agents`
3. Clear npm cache: `npm cache clean --force`
4. If using global installation, ensure npm's global bin directory is in your PATH

### Agents not appearing in OpenCode

**Solution:**

1. Verify installation completed successfully
2. Check that agents are in the correct directory:
   - Local: `.opencode/agents/`
   - Global: `~/.config/opencode/agents/`
3. Restart OpenCode or your terminal session
4. For global installation, verify `~/.config/opencode` exists

## Offline Installation

If you need to install without internet access:

1. Download the release `.tgz` file on a machine with internet
2. Transfer the file to the target machine
3. Install with npm:

   ```bash
   npm install -g ./johnludlow-agents-X.X.X.tgz
   ```

## Getting Help

If you encounter issues during installation:

1. **Check this guide** - See the Troubleshooting section above
2. **Check the README** - <https://github.com/JohnLudlow/agents#readme>
3. **Create an issue** - <https://github.com/JohnLudlow/agents/issues>
4. **Start a discussion** - <https://github.com/JohnLudlow/agents/discussions>

## Next Steps

After successful installation:

1. **Read the README** - <https://github.com/JohnLudlow/agents#readme>
2. **Check the documentation** - <https://github.com/JohnLudlow/agents/tree/main/docs>
3. **Review agent definitions** - <https://github.com/JohnLudlow/agents/tree/main/agents>
4. **See usage examples** - Check individual agent files for examples

## What Gets Installed

When you install `@johnludlow/agents`, you get:

### Agents (4 total)

- **johnludlow-feature-planner** - Create comprehensive feature plans
- **johnludlow-feature-implementer** - Implement features from plans
- **johnludlow-feature-documenter** - Generate technical documentation
- **johnludlow-feature-tester** - Run tests and report results

### Skills (2 total)

- **johnludlow-markdown-standards** - Markdown formatting and structure standards
- **johnludlow-code-quality** - Code quality expectations and best practices

### Configuration

- **config.json** - OpenCode configuration with permissions
- **Permission rules** - Security boundaries for each agent

## Backup and Restore

The installation process automatically creates backups:

```bash
# List backups
ls ~/.config/ | grep opencode-backup  # Global
ls .opencode-backup-*                 # Local

# Restore from latest backup
npm run restore
```

## Version Management

To check your installed version:

```bash
npm list @johnludlow/agents
```

To upgrade to a newer version, find the `.tgz` asset on the **[GitHub Releases page](https://github.com/JohnLudlow/agents/releases/latest)** and run:

```bash
npm install -g <tgz-url>
```
