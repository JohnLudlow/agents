# Installation Guide

This guide explains how to install `@johnludlow/agents` using our automated release installation scripts.

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

## Quick Start

The fastest way to install is using the automated installation script for your platform.

### Windows (PowerShell)

```powershell
# Download and run the installation script
$version = "latest"  # or specific version like "1.0.0"
$script = "install-release.ps1"

Invoke-WebRequest -Uri "https://github.com/JohnLudlow/agents/releases/download/latest/$script" -OutFile $script

# Run the installation
.\$script -Version $version
```

Or install directly with NPM from the release:

```powershell
# Download the .tgz package from the release page
npm install ./johnludlow-agents-VERSION.tgz
```

### macOS/Linux (Bash)

```bash
# Download and run the installation script
version="latest"  # or specific version like "1.0.0"

curl -fsSL "https://github.com/JohnLudlow/agents/releases/download/$version/install-release.sh" -o install-release.sh
chmod +x install-release.sh

./install-release.sh $version
```

Or install directly with npm:

```bash
# Download the .tgz package from the release page
npm install ./johnludlow-agents-VERSION.tgz
```

## Installation Methods

We support multiple installation methods depending on your preference and environment.

### Method 1: Automated Installation Scripts (Recommended)

The easiest and most reliable method. These scripts handle:

- Version detection
- Package download
- Extraction
- NPM installation
- Verification

**Advantages:**

- Simple one-command installation
- Automatic error checking
- Works with both local and global installation
- Cross-platform support

**Disadvantages:**

- None

**See:** Quick Start section above

### Method 2: Direct npm Installation

Install directly from the release package if you already have it downloaded.

```bash
npm install ./johnludlow-agents-VERSION.tgz
```

For global installation:

```bash
npm install -g ./johnludlow-agents-VERSION.tgz
```

**Advantages:**

- Simple
- No script execution needed

**Disadvantages:**

- Must download package file first
- Must remember correct file name

### Method 3: Manual Download and Install

For full control or when scripts are blocked:

1. **Download the release package**
   - Visit: <https://github.com/JohnLudlow/agents/releases>
   - Download the `.tgz` file for your version

2. **Extract the package**

   Windows (PowerShell):

   ```powershell
   tar -xzf johnludlow-agents-VERSION.tgz
   ```

   macOS/Linux:

   ```bash
   tar -xzf johnludlow-agents-VERSION.tgz
   ```

3. **Install with npm**

   ```bash
   npm install ./package
   ```

## Installation Locations

The package installs to different locations depending on the installation type:

### Local Installation (Project-Specific)

Installs agents and skills into the current project directory:

```bash
npm install @johnludlow/agents
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
npm install -g @johnludlow/agents
```

or with the installation script:

```powershell
.\install-release.ps1 -Global
```

```bash
./install-release.sh --global
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
└── @johnludlow/agents@1.0.0
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

**Error:** `Node.js version X.X.X is below minimum required version 22.0.0`

**Solution:** Upgrade Node.js to version 22.0.0 or later

```bash
# Visit https://nodejs.org/ to download and install
node --version  # Verify installation
```

### npm not found

**Error:** `npm is not installed or not in PATH`

**Solution:** npm is included with Node.js. Reinstall Node.js from <https://nodejs.org/>

### Script execution disabled (Windows)

**Error:** `Cannot be loaded because running scripts is disabled on this system`

**Solution:** Enable script execution temporarily:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\install-release.ps1
```

Or run PowerShell as Administrator and set:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned
```

### Download fails

**Error:** `Failed to download package` or `curl: command not found`

**Solution:**

1. Check your internet connection
2. Try downloading the release manually from <https://github.com/JohnLudlow/agents/releases>
3. Ensure curl or wget is installed (usually pre-installed on macOS/Linux)

### npm install fails

**Error:** `npm install failed`

**Solution:**

1. Check npm version: `npm --version`
2. Clear npm cache: `npm cache clean --force`
3. Try installing again
4. Check if disk space is available
5. Check file permissions in the installation directory

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

## Advanced Installation Options

### Installation Script Options

**PowerShell:**

```powershell
.\install-release.ps1 -Help
.\install-release.ps1 -Version "1.0.0"      # Install specific version
.\install-release.ps1 -Global               # Install globally
.\install-release.ps1 -Version "1.0.0" -Global  # Both options
```

**Bash:**

```bash
./install-release.sh
./install-release.sh 1.0.0              # Install specific version
./install-release.sh latest --global    # Install latest globally
./install-release.sh 1.0.0 --global     # Both options
```

### Custom Installation Directory

To install to a custom temporary directory:

**PowerShell:**

```powershell
.\install-release.ps1 -WorkingDirectory "C:\custom\temp"
```

**Bash:**

```bash
TEMP_DIR="/custom/temp" ./install-release.sh
```

### Offline Installation

If you need to install without internet access:

1. Download the release `.tgz` file on a machine with internet
2. Transfer the file to the target machine
3. Install with npm:

   ```bash
   npm install ./johnludlow-agents-VERSION.tgz
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

### Scripts

- **install.js** - Installation script
- **uninstall.js** - Uninstall script
- **restore.js** - Backup restore script

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

To upgrade to a newer version:

```bash
npm install @johnludlow/agents@latest
```

To install a specific version:

```bash
npm install @johnludlow/agents@1.0.0
```
