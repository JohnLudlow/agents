# Installation Testing Guide

This guide provides comprehensive testing procedures for the `@johnludlow/agents` installation process across all platforms and installation methods.

## Test Environment Setup

### Prerequisites for Testing

- Windows 10/11 with PowerShell 5.1+ (for PowerShell tests)
- macOS/Linux with Bash 4.0+ (for Bash tests)
- Node.js 22.0.0+ installed
- npm installed
- Git installed (for clone-based testing)
- Internet connection (for downloading releases)
- At least 500 MB free disk space

### Clean Test Environment

Create a clean test environment by:

1. Using a fresh VM or container
2. Using a temporary user account
3. Removing previous installations:

   ```bash
   npm uninstall @johnludlow/agents
   npm uninstall -g @johnludlow/agents
   rm -rf ~/.config/opencode/  # macOS/Linux
   rm -rf $APPDATA/opencode/   # Windows
   ```

## Test Matrix

| Platform | Shell | Installation Method | Node Version | Status |
|----------|-------|---------------------|--------------|--------|
| Windows | PowerShell | Script | 22.0.0 | |
| Windows | PowerShell | Script | 24.0.0 | |
| Windows | cmd | npm | 22.0.0 | |
| macOS | Bash | Script | 22.0.0 | |
| macOS | Bash | Script | 24.0.0 | |
| macOS | Zsh | Script | 22.0.0 | |
| Linux | Bash | Script | 22.0.0 | |
| Linux | Bash | npm | 22.0.0 | |

## Test Procedures

### Test 1: PowerShell Script Installation (Local)

**Platform**: Windows
**Method**: PowerShell installation script, local installation

**Prerequisites**:

- Windows 10/11
- PowerShell 5.1+
- Node.js 22.0.0+
- Internet connection

**Steps**:

1. **Open PowerShell**

   ```powershell
   # Start PowerShell (as regular user, not admin)
   powershell
   ```

2. **Download the installation script**

   ```powershell
   $version = "latest"
   $script = "install-release.ps1"
   Invoke-WebRequest -Uri "https://github.com/JohnLudlow/agents/releases/download/$version/$script" -OutFile $script
   ```

3. **Run the installation script**

   ```powershell
   .\$script -Version $version
   ```

4. **Verify installation**

   ```powershell
   npm list @johnludlow/agents
   ls .opencode/agents/
   ```

**Expected Results**:

- Script downloads successfully
- No errors during extraction
- NPM installation completes
- `.opencode/agents/` directory created
- All 4 agents present in `.opencode/agents/`
- Exit code 0

**Success Criteria**:

- ✓ Script completes without errors
- ✓ All agents visible in `.opencode/agents/`
- ✓ Verification shows package installed

---

### Test 2: PowerShell Script Installation (Global)

**Platform**: Windows
**Method**: PowerShell installation script, global installation

**Prerequisites**:

- Same as Test 1
- Administrator access (for global npm install)

**Steps**:

1. **Start PowerShell as Administrator**

2. **Download the installation script**

   ```powershell
   $version = "latest"
   $script = "install-release.ps1"
   Invoke-WebRequest -Uri "https://github.com/JohnLudlow/agents/releases/download/$version/$script" -OutFile $script
   ```

3. **Run with global flag**

   ```powershell
   .\$script -Version $version -Global
   ```

4. **Verify global installation**

   ```powershell
   npm list -g @johnludlow/agents
   ls $PROFILE\NodeModules\@johnludlow\agents\
   ```

**Expected Results**:

- Same as Test 1, but in global npm location
- Exit code 0

---

### Test 3: Bash Script Installation (Local)

**Platform**: macOS/Linux
**Method**: Bash installation script, local installation

**Prerequisites**:

- macOS or Linux
- Bash 4.0+
- Node.js 22.0.0+
- curl or wget installed
- tar installed

**Steps**:

1. **Open terminal**

   ```bash
   cd ~/test-directory  # Use a test directory
   ```

2. **Download the installation script**

   ```bash
   curl -fsSL "https://github.com/JohnLudlow/agents/releases/download/latest/install-release.sh" -o install-release.sh
   chmod +x install-release.sh
   ```

3. **Run the installation script**

   ```bash
   ./install-release.sh latest
   ```

4. **Verify installation**

   ```bash
   npm list @johnludlow/agents
   ls .opencode/agents/
   ```

**Expected Results**:

- Script downloads successfully
- No errors during extraction
- NPM installation completes
- `.opencode/agents/` directory created
- All 4 agents present in `.opencode/agents/`
- Exit code 0

---

### Test 4: Bash Script Installation (Global)

**Platform**: macOS/Linux
**Method**: Bash installation script, global installation

**Prerequisites**:

- Same as Test 3
- May require `sudo` or elevated privileges

**Steps**:

1. **Download the installation script**

   ```bash
   curl -fsSL "https://github.com/JohnLudlow/agents/releases/download/latest/install-release.sh" -o install-release.sh
   chmod +x install-release.sh
   ```

2. **Run with global flag**

   ```bash
   ./install-release.sh latest --global
   ```

3. **Verify global installation**

   ```bash
   npm list -g @johnludlow/agents
   ls ~/.config/opencode/agents/
   ```

**Expected Results**:

- Agents installed to `~/.config/opencode/agents/`
- All agents present
- Exit code 0

---

### Test 5: Direct npm Installation

**Platform**: Any
**Method**: Direct npm installation from .tgz package

**Prerequisites**:

- Node.js 22.0.0+
- npm
- Downloaded `.tgz` file from release

**Steps**:

1. **Download release package**
   - Visit: <https://github.com/JohnLudlow/agents/releases>
   - Download the `.tgz` file for your version

2. **Install with npm**

   ```bash
   npm install ./johnludlow-agents-VERSION.tgz
   ```

3. **Verify installation**

   ```bash
   npm list @johnludlow/agents
   ls .opencode/agents/
   ```

**Expected Results**:

- Package extracts successfully
- NPM installation completes
- All agents installed
- Exit code 0

---

### Test 6: Global npm Installation

**Platform**: Any
**Method**: Global npm installation

**Prerequisites**:

- Same as Test 5
- Administrator/sudo access

**Steps**:

1. **Download release package**
   - Visit: <https://github.com/JohnLudlow/agents/releases>
   - Download the `.tgz` file

2. **Install globally**

   ```bash
   npm install -g ./johnludlow-agents-VERSION.tgz
   ```

3. **Verify**

   ```bash
   npm list -g @johnludlow/agents
   ```

**Expected Results**:

- Installed to global npm location
- All agents present in global OpenCode directory
- Exit code 0

---

### Test 7: Agent Verification

**Platform**: Any
**Method**: Verify agents work after installation

**Prerequisites**:

- Installation completed successfully
- OpenCode installed

**Steps**:

1. **List installed agents**

   ```bash
   # Local
   ls .opencode/agents/

   # Global
   ls ~/.config/opencode/agents/
   ```

2. **Check agent content**

   ```bash
   cat .opencode/agents/johnludlow-feature-planner.md | head -20
   ```

3. **Verify YAML frontmatter** (for OpenCode agents)
   - Should have frontmatter between `---` markers
   - Should include: name, description, temperature, instructions

4. **Test with OpenCode**

   ```bash
   # Try to load the agent
   opencode agent johnludlow-feature-planner
   ```

**Expected Results**:

- All 4 agents present:
  - johnludlow-feature-planner.md
  - johnludlow-feature-implementer.md
  - johnludlow-feature-documenter.md
  - johnludlow-feature-tester.md
- Valid YAML frontmatter in each file
- Agents loadable in OpenCode

---

### Test 8: Error Handling

**Platform**: Any
**Method**: Test error conditions

**Prerequisites**:

- Test environment set up

**Test Cases**:

1. **Node version too old**
   - Temporarily unset Node.js from PATH
   - Run installation script
   - Expected: Proper error message, exit code 1

2. **npm not installed**
   - Unset npm from PATH
   - Run installation script
   - Expected: Error message, exit code 1

3. **Network failure**
   - Simulate network failure (disconnect or use proxy)
   - Run installation script
   - Expected: Download fails gracefully, clear error message

4. **Disk space exhausted**
   - On small disk/container
   - Run installation
   - Expected: Clear error if disk space insufficient

5. **Permission denied**
   - Try global install without proper permissions
   - Expected: Clear error about permissions

---

### Test 9: Uninstallation

**Platform**: Any
**Method**: Verify uninstall works correctly

**Prerequisites**:

- Package installed

**Steps**:

1. **Uninstall the package**

   ```bash
   npm uninstall @johnludlow/agents
   # or globally
   npm uninstall -g @johnludlow/agents
   ```

2. **Verify removal**

   ```bash
   npm list @johnludlow/agents
   ls .opencode/agents/
   ```

**Expected Results**:

- Package no longer in npm list
- Agents directory still exists (preserved)
- Or agents removed if cleanup script is present
- Exit code 0

---

### Test 10: Backup and Restore

**Platform**: Any
**Method**: Test backup and restore functionality

**Prerequisites**:

- Initial installation

**Steps**:

1. **Install a version**

   ```bash
   npm install @johnludlow/agents@1.0.0
   ```

2. **Check backup created**

   ```bash
   ls ~/.config/ | grep "opencode-backup"
   # or
   ls . | grep "opencode-backup"
   ```

3. **Modify an agent** (to verify restore works)

   ```bash
   echo "test" >> ~/.config/opencode/agents/johnludlow-feature-planner.md
   ```

4. **Restore from backup**

   ```bash
   npm run restore
   ```

5. **Verify restore**
   - Original file should be restored

**Expected Results**:

- Backup created automatically
- Restore script available
- Original files restored
- No data loss

---

## Regression Testing

### Post-Release Checklist

After each release, verify:

1. **Installation Scripts Execute**
   - [ ] PowerShell script runs without errors
   - [ ] Bash script runs without errors
   - [ ] Both support `--version` and `--global` flags

2. **Release Notes Generated**
   - [ ] Release notes created automatically
   - [ ] Installation instructions included
   - [ ] Changelog included
   - [ ] Contributors listed
   - [ ] Build status badge shows in README

3. **Package Quality**
   - [ ] NPM package builds successfully
   - [ ] All files included in package
   - [ ] Package size reasonable (~1-5 MB)
   - [ ] No extraneous files

4. **GitHub Release**
   - [ ] Release created on GitHub
   - [ ] Release notes display correctly
   - [ ] Installation scripts attached
   - [ ] NPM package attached
   - [ ] Version tag created

5. **Documentation**
   - [ ] README links to installation guide
   - [ ] INSTALLATION.md is comprehensive
   - [ ] CI-CD.md documents release process
   - [ ] Examples are accurate

---

## Continuous Integration Testing

### Automated Test Plan

Recommended GitHub Actions workflow tests:

1. **Setup Action Tests**
   - Verify Node.js setup
   - Verify GitVersion execution
   - Verify version output

2. **Validate Action Tests**
   - Markdown validation passes
   - Agent structure validation passes
   - Skill structure validation passes

3. **Build Action Tests**
   - NPM package creates
   - Package size verified
   - Artifacts uploadable

4. **Release Action Tests**
   - Release notes generate
   - GitHub release creates
   - Assets attached correctly

---

## Known Issues and Workarounds

### PowerShell Script Execution Policy

**Issue**: `running scripts is disabled on this system`

**Workaround**:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### macOS Code Signing

**Issue**: Script cannot be executed (gatekeeper)

**Workaround**:

```bash
chmod +x install-release.sh
xattr -d com.apple.quarantine install-release.sh
```

### Network Issues on Slow Connections

**Issue**: Download timeout

**Workaround**:

- Download manually from releases page
- Use local installation method
- Check internet connection

---

## Test Report Template

```markdown
## Installation Test Report

**Date**: YYYY-MM-DD
**Tester**: Name
**Version Tested**: X.X.X

### Environment

- Platform: [Windows/macOS/Linux]
- Node.js Version: X.X.X
- npm Version: X.X.X
- Shell: [PowerShell/Bash/Zsh/Other]

### Tests Completed

- [ ] Test 1: PowerShell Local
- [ ] Test 2: PowerShell Global
- [ ] Test 3: Bash Local
- [ ] Test 4: Bash Global
- [ ] Test 5: npm Local
- [ ] Test 6: npm Global
- [ ] Test 7: Agent Verification
- [ ] Test 8: Error Handling
- [ ] Test 9: Uninstallation
- [ ] Test 10: Backup/Restore

### Issues Found

- [Issue 1]
- [Issue 2]

### Recommendations

- [Recommendation 1]
- [Recommendation 2]

### Overall Result: PASS / FAIL
```

---

## Continuous Improvement

After each release, collect:

1. **User Feedback**
   - Issues reported on GitHub
   - Comments on releases
   - Support questions

2. **Performance Metrics**
   - Download times
   - Installation time
   - Success rate

3. **Error Patterns**
   - Most common errors
   - Platform-specific issues
   - Network-related failures

Use this data to improve scripts and documentation.
