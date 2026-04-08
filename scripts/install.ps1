# DEPRECATED: Use npm installation instead

This script is deprecated and no longer maintained.

## Use this instead:

```powershell
npm install @johnludlow/agents
```

The npm-based installation (via `scripts/install.js`) is now the recommended way to install agents and skills.
It provides:
- Unified installation for both OpenCode and GitHub Copilot
- Automatic backup/restore functionality
- Cross-platform support (Windows, macOS, Linux)
- Proper permission management
- Better error handling

## Manual installation (not recommended)

If you need to manually install agents, you can:

1. Copy agents from `opencode/agents/` to `$env:APPDATA\opencode\agents\` (Windows) or `~/.config/opencode/agents/` (Linux/Mac)
2. Copy skills from `skills/` to `$env:APPDATA\opencode\skills\` or `~/.config/opencode/skills/`
3. Copy config.json from `opencode/config.json` to the appropriate location

But the npm installation is strongly recommended.
