#!/usr/bin/env node

/**
 * @johnludlow/agents Installation Script
 *
 * Installs agents and skills in both OpenCode and GitHub Copilot formats.
 * Uses unified installation logic for both platforms with consistent backup/restore.
 * - OpenCode: Installs to ~/.config/opencode/ (global) or .opencode/ (local)
 * - GitHub Copilot: Installs to ~/.copilot/ (global) or .github/ (local)
 */

const fs = require("fs");
const path = require("path");
const net = require("net");
const { spawnSync } = require("child_process");

const {
  BACKUP_SUFFIX,
  PLATFORMS,
  getInstallMode,
  getTargetDirectory,
  removeDirectory,
  copyDirectory,
  backupExistingDirectory,
} = require("./platform-utils.js");

// ============================================================================
// CONFIGURATION
// ============================================================================

// Source directories (relative to package root)
const SOURCE_DIRS = {
  canonicalAgents: path.join(__dirname, "..", "agents"),
  canonicalSkills: path.join(__dirname, "..", "skills"),
  opencodeAgents: path.join(__dirname, "..", "opencode", "agents"),
  opencodeConfig: path.join(__dirname, "..", "opencode"),
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get source agents directory for a platform.
 *
 * Always uses the pre-built format-specific output so installed agents
 * include the correct YAML frontmatter and temperature guidance for each platform.
 */
function getSourceAgentsDir(platform) {
  if (platform === "opencode") {
    return SOURCE_DIRS.opencodeAgents;
  }
  if (platform === "copilot") {
    return path.join(__dirname, "..", ".github", "agents");
  }
  throw new Error(`Unknown platform: ${platform}`);
}

/**
 * Get source skills directory for a platform.
 *
 * Copilot uses the pre-built .github/skills output (includes description frontmatter).
 * OpenCode uses canonical skills/ (plain markdown — no frontmatter needed).
 */
function getSourceSkillsDir(platform) {
  if (platform === "copilot") {
    return path.join(__dirname, "..", ".github", "skills");
  }
  return SOURCE_DIRS.canonicalSkills;
}

/**
 * Count markdown files in directory
 */
function countMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).length;
}

/**
 * Check if OpenCode is installed
 */
function checkOpenCodeInstalled() {
  const openCodeDir = PLATFORMS.opencode.globalDir;
  return fs.existsSync(openCodeDir);
}

// ============================================================================
// INSTALLATION
// ============================================================================

/**
 * Install agents and skills for a platform
 */
function installPlatform(platform, mode) {
  const config = PLATFORMS[platform];
  const targetDir = getTargetDirectory(platform, mode);
  const sourceAgentsDir = getSourceAgentsDir(platform);
  const sourceSkillsDir = getSourceSkillsDir(platform);

  console.log(`${config.emoji} Installing ${config.name} format...`);

  // Backup existing installation (by copying, not moving)
  const backupDirs = backupExistingDirectory(targetDir, platform, mode);
  if (backupDirs) {
    console.log(`  ✓ Backed up existing subdirectories`);
    backupDirs.forEach(dir => {
      console.log(`    → ${path.basename(dir).replace(BACKUP_SUFFIX, '')}`);
    });
  }

  // Now create the target directory (after backup)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // For Copilot: remove old managed subdirectories before installing new ones
  if (platform === "copilot" && config.localManagedSubDirs) {
    for (const subDir of config.localManagedSubDirs) {
      const subDirPath = path.join(targetDir, subDir);
      if (fs.existsSync(subDirPath)) {
        removeDirectory(subDirPath);
      }
    }
  }

  // Create subdirectories
  const agentsDir = path.join(targetDir, "agents");
  const skillsDir = path.join(targetDir, "skills");

  // Install agents
  if (fs.existsSync(sourceAgentsDir)) {
    console.log("  → Installing agents...");
    copyDirectory(sourceAgentsDir, agentsDir, { skipJson: true });
    const count = countMarkdownFiles(agentsDir);
    console.log(`    ✓ Installed ${count} agents`);
  }

  // Install skills
  if (fs.existsSync(sourceSkillsDir)) {
    console.log("  → Installing skills...");
    copyDirectory(sourceSkillsDir, skillsDir, { skipJson: true });
    const count = countMarkdownFiles(skillsDir);
    console.log(`    ✓ Installed ${count} skills`);
  }

  console.log(`\n✓ ${config.name} installation complete to: ${targetDir}`);
  return targetDir;
}

/**
 * Install OpenCode configuration with permissions
 */
function installOpenCodeConfig(mode) {
  console.log("\n⚙️  Installing OpenCode configuration...");

  const targetDir = getTargetDirectory("opencode", mode);
  const configSourceDir = SOURCE_DIRS.opencodeConfig;

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (!fs.existsSync(configSourceDir)) {
    console.log("   ℹ️  OpenCode configuration files not found in package");
    return null;
  }

  // Copy config.json
  const configSourcePath = path.join(configSourceDir, "config.json");
  const configTargetPath = path.join(targetDir, "config.json");

  if (fs.existsSync(configSourcePath)) {
    // Backup existing config
    if (fs.existsSync(configTargetPath)) {
      const backupPath = configTargetPath + BACKUP_SUFFIX;
      fs.copyFileSync(configTargetPath, backupPath);
      console.log("   → Backed up existing config.json");
    }

    fs.copyFileSync(configSourcePath, configTargetPath);
    console.log("   ✓ Installed config.json with permissions");
  }

  console.log(`   📁 Location: ${targetDir}`);
  return targetDir;
}

// ============================================================================
// PLUGIN INSTALLATION
// ============================================================================

// Recommended GitHub Copilot plugins (name@scope format)
const COPILOT_PLUGINS = [
  { name: "awesome-copilot", scope: "awesome-copilot", version: "v1.1.0" },
  { name: "azure", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "doublecheck", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "dotnet", scope: "awesome-copilot", version: "v0.1.0" },
  { name: "dotnet-diag", scope: "awesome-copilot", version: "v0.1.0" },
  { name: "context-engineering", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "csharp-dotnet-development", scope: "awesome-copilot", version: "v1.1.0" },
  { name: "csharp-mcp-development", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "devops-oncall", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "technical-spike", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "microsoft-docs", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "openapi-to-application-csharp-dotnet", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "polyglot-test-agent", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "roundup", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "project-planning", scope: "awesome-copilot", version: "v1.0.0" },
  { name: "security-best-practices", scope: "awesome-copilot", version: "v1.0.0" },
];

// Recommended MCP servers (installed alongside agents)
// These definitions are kept here so the installer can provision recommended
// MCP tooling together with agents without requiring separate setup docs.
//
// MCP types:
//   "remote"       — accessed via remote URL; no local install or port needed
//   "local-npx"    — launched on-demand via npx; no global install or port needed
//   "local-npm"    — installed globally via npm; requires port assignment
//   "local-dotnet" — installed via dotnet tool; requires port assignment
//
// Port range applies only to "local-npm" and "local-dotnet" MCPs.
const MCP_PORT_RANGE = { start: 7001, end: 7099, fallbackStart: 7100 };

const MCP_DEFS = [
  // --- Remote MCPs (config-only, no local install or port) ---
  {
    name: "context-7",
    type: "remote",
    url: "https://mcp.context7.com/mcp/oauth",
    manager: null,
    healthz: null,
    requiredEnvVars: [],
    // Auth: run `opencode mcp auth context7` after config is in place
  },
  {
    name: "github-mcp-server",
    type: "remote",
    url: "https://api.githubcopilot.com/mcp/",
    manager: null,
    healthz: null,
    requiredEnvVars: ["OC_GITHUB_PAT"],
    // Auth: set OC_GITHUB_PAT environment variable
  },
  // --- Local npx MCPs (on-demand via npx; no port) ---
  {
    name: "gamecodex",
    type: "local-npx",
    package: "gamecodex",
    requiresGlobalInstall: true, // npx alone is unreliable; pre-install globally
    command: "npx",
    args: ["-y", "gamecodex"],
    manager: "optional-pm2",
    healthz: "/healthz",
    requiredEnvVars: [],
  },
  // --- Local MCPs (see lobehub deployment guides for install/config details) ---
  // mslearn: https://lobehub.com/mcp/microsoftdocs-mcp?activeTab=deployment
  // nuget:   https://lobehub.com/mcp/dimonsmart-nugetmcpserver?activeTab=deployment
];

/**
 * Check whether the GitHub CLI (`gh`) is available on PATH
 */
function isCopilotCliAvailable() {
  const result = spawnSync("copilot", ["version"], { encoding: "utf8", stdio: "pipe" });
  return result.status === 0;
}

/**
 * Attempt to install a single Copilot plugin via `copilot plugin install`
 * Returns true on success, false on failure.
 */
function installCopilotPlugin(scope, name) {
   const result = spawnSync(
     "copilot",
     ["plugin", "install", `${name}@${scope}`],
     { encoding: "utf8", stdio: "pipe" }
   );
   return result.status === 0;
 }

/**
 * Check whether a TCP port is free on localhost.
 * Uses Node's net module — no external dependency.
 */
function isPortFree(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

/**
 * Find the next free port in [start, end], falling back to fallbackStart on
 * exhaustion. Returns { port, warning } where warning is non-null if fallback used.
 */
async function findFreePort(start, end, fallbackStart, used) {
  for (let p = start; p <= end; p++) {
    if (used.has(p)) continue;
    if (await isPortFree(p)) return { port: p, warning: null };
  }
  // Fallback: scan from fallbackStart upward, capped at 7999
  for (let p = fallbackStart; p < 8000; p++) {
    if (used.has(p)) continue;
    if (await isPortFree(p)) {
      return {
        port: p,
        warning: `default range ${start}-${end} exhausted; using fallback ${p}`,
      };
    }
  }
  throw new Error(`No free port available in ${start}-${end} or fallback range`);
}

/**
 * Install a single MCP server.
 * - "remote":       no install needed; returns true immediately.
 * - "local-npx":    no global install; npx handles on-demand execution. Returns true.
 * - "local-npm":    installs globally via npm.
 * - "local-dotnet": installs via dotnet tool.
 */
function installMcpPackage(mcp) {
  if (mcp.type === "remote") {
    return true;
  }
  if (mcp.type === "local-npx") {
    // Some npx MCPs need a global pre-install to ensure the package is cached
    // and available (npx -y can fail silently in some environments).
    if (mcp.requiresGlobalInstall) {
      const result = spawnSync("npm", ["install", "--global", mcp.package], {
        encoding: "utf8",
        stdio: "pipe",
      });
      return result.status === 0;
    }
    return true;
  }
  if (mcp.type === "local-npm") {
    const pkgSpec = mcp.versionRange ? `${mcp.package}@${mcp.versionRange}` : mcp.package;
    const result = spawnSync("npm", ["install", "-g", pkgSpec], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return result.status === 0;
  }
  if (mcp.type === "local-dotnet") {
    const result = spawnSync(
      "dotnet",
      ["tool", "install", "--global", mcp.package],
      { encoding: "utf8", stdio: "pipe" },
    );
    // Treat "already installed" as success (exit code 1 with specific message)
    if (result.status === 0) return true;
    if (result.stderr && /already installed/i.test(result.stderr)) return true;
    return false;
  }
  throw new Error(`Unknown MCP type: ${mcp.type}`);
}

/**
 * Install recommended Copilot plugins.
 *
 * If the `copilot` CLI is available the script attempts to install each plugin via
 * `copilot plugin install <scope>/<name>`.  When `copilot` is not available (or a
 * plugin install fails) the plugin is flagged for manual installation and a
 * human-readable summary is printed at the end.
 */
function installCopilotPlugins() {
  console.log("\n🔌 Installing recommended Copilot plugins...");

  const ghAvailable = isCopilotCliAvailable();
   if (!ghAvailable) {
     console.log("   ℹ️  Copilot CLI not found — plugins must be installed manually.");
     console.log("      Install the CoPilot CLI: https://github.com/features/copilot/cli/\n");
     console.log("   Recommended plugins:");
     COPILOT_PLUGINS.forEach(({ name, scope, version }) => {
       console.log(`     • ${name}@${scope} (${version})`);
       console.log(`       copilot plugin install ${name}@${scope}`);
     });
     return;
   }

  const succeeded = [];
  const failed = [];

  for (const { name, scope, version } of COPILOT_PLUGINS) {
    process.stdout.write(`   → ${name}@${scope} (${version})... `);
    if (installCopilotPlugin(scope, name)) {
      process.stdout.write("✓\n");
      succeeded.push({ name, scope });
    } else {
      process.stdout.write("✗\n");
      failed.push({ name, scope, version });
    }
  }

   if (succeeded.length > 0) {
     console.log(`\n   ✓ Installed ${succeeded.length} plugin(s) via copilot plugin install`);
   }

   if (failed.length > 0) {
     console.log(`\n   ⚠️  ${failed.length} plugin(s) could not be installed automatically:`);
     failed.forEach(({ name, scope, version }) => {
       console.log(`     • ${name}@${scope} (${version})`);
       console.log(`       copilot plugin install ${name}@${scope}`);
     });
   }
}

/**
 * Check if OpenCode config file exists and return path
 */
function getOpenCodeConfigPath(mode) {
  const opencodePath = getTargetDirectory("opencode", mode);
  const configFile = PLATFORMS.opencode.configFile || "config.json";
  return path.join(opencodePath, configFile);
}

/**
 * Read and parse OpenCode config
 * Returns { config, valid } — valid is false if parsing failed.
 */
function readOpenCodeConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    // Create new config if it doesn't exist
    return { config: { plugin: [] }, valid: true };
  }
  try {
    const content = fs.readFileSync(configPath, "utf8");
    return { config: JSON.parse(content), valid: true };
  } catch (error) {
    // Backup the corrupted file to prevent data loss
    const backupPath = configPath + BACKUP_SUFFIX;
    fs.copyFileSync(configPath, backupPath);
    console.warn(`   ⚠️  Could not parse existing config at ${configPath}`);
    console.warn(`   → Original file backed up to: ${backupPath}`);
    console.warn(`   → Skipping plugin installation. Please fix the JSON and rerun.`);
    return { config: null, valid: false };
  }
}

/**
 * Write OpenCode config
 */
function writeOpenCodeConfig(configPath, config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Install OpenCode plugins
 *
 * Installs npm packages and adds them to the OpenCode plugin configuration.
 * Supports:
 * - oh-my-opencode: Shell configuration enhancer (no npm install needed)
 * - opentmux: tmux integration for agent execution
 * - tokenscope: Token usage analysis and cost tracking
 */
function installOpenCodePlugins(mode) {
  console.log("\n🔌 Installing OpenCode plugins...");

  const configPath = getOpenCodeConfigPath(mode);
  const { config, valid } = readOpenCodeConfig(configPath);
  if (!valid) return;

  // Ensure plugin array exists
  if (!Array.isArray(config.plugin)) {
    config.plugin = [];
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  const deps = packageJson.dependencies || {};

  // TODO: tokenscope also needs a command mapped
  const pluginInstallations = [
    {
      name: "oh-my-opencode",
      package: null,
      description: "Shell configuration and environment setup",
    },
    {
      name: "opentmux",
      package: "opentmux",
      description: "Smart tmux integration for agent execution",
    },
    {
      name: "@ramtinj95/opencode-tokenscope",
      package: "@ramtinj95/opencode-tokenscope",
      description: "Token usage analysis and cost tracking",
    },
  ];

  const installed = [];
  const failed = [];

  for (const plugin of pluginInstallations) {
    process.stdout.write(`   → ${plugin.name}... `);

    if (plugin.package) {
      const version = deps[plugin.package];
      const pkgSpec = version ? `${plugin.package}@${version}` : plugin.package;
      const result = spawnSync("npm", ["install", "-g", pkgSpec], {
        encoding: "utf8",
        stdio: "pipe",
      });

      if (result.status !== 0) {
        process.stdout.write("✗\n");
        failed.push(plugin);
        continue;
      }
    }

    // Add to config if not already present
    if (!config.plugin.includes(plugin.name)) {
      config.plugin.push(plugin.name);
    }

    process.stdout.write("✓\n");
    installed.push(plugin);
  }

  // Write updated config
  if (installed.length > 0 || config.plugin.length > 0) {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    writeOpenCodeConfig(configPath, config);
  }

  // Summary
  if (installed.length > 0) {
    console.log(`\n   ✓ Installed ${installed.length} plugin(s):`);
    installed.forEach(p => {
      console.log(`     • ${p.name}`);
      console.log(`       ${p.description}`);
      if (p.package) {
        console.log(`       Package: ${p.package}`);
      }
    });
  }

  if (failed.length > 0) {
    console.log(`\n   ⚠️  ${failed.length} plugin(s) failed to install:`);
    failed.forEach(p => {
      console.log(`     • ${p.name} (${p.package || "no npm package"})`);
    });
  }

  if (installed.length > 0) {
    console.log(`\n   📁 Config file: ${configPath}`);
  }
}

/**
 * Install MCP servers and write .mcps.json alongside the OpenCode config.
 *
 * Mirrors installCopilotPlugins / installOpenCodePlugins patterns:
 * - Per-MCP success/failure tracking
 * - Best-effort install (does not abort on first failure)
 * - Returns failure count so caller can set non-zero exit code
 */
async function installMcps(mode) {
  console.log("\n🧩 Installing MCP servers...");

  const targetDir = getTargetDirectory("opencode", mode);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const mcpsConfigPath = path.join(targetDir, ".mcps.json");

  // Load or initialise .mcps.json (schema v2)
  let mcpsConfig = { version: 2, mcps: [] };
  let alreadyBacked = false;
  if (fs.existsSync(mcpsConfigPath)) {
    try {
      mcpsConfig = JSON.parse(fs.readFileSync(mcpsConfigPath, "utf8"));
      if (!Array.isArray(mcpsConfig.mcps)) mcpsConfig.mcps = [];
    } catch {
      const backup = mcpsConfigPath + BACKUP_SUFFIX;
      fs.copyFileSync(mcpsConfigPath, backup);
      console.warn(`   ⚠️  Could not parse ${mcpsConfigPath}; backed up to ${backup}`);
      mcpsConfig = { version: 2, mcps: [] };
      alreadyBacked = true;
    }
  }

  const installed = [];
  const failed = [];
  const usedPorts = new Set(mcpsConfig.mcps.map(m => m.port).filter(Boolean));

  for (const mcp of MCP_DEFS) {
    const displayName = mcp.package ? `${mcp.name} (${mcp.package})` : mcp.name;
    process.stdout.write(`   → ${displayName}... `);

    if (!installMcpPackage(mcp)) {
      process.stdout.write("✗ install failed\n");
      failed.push({ ...mcp, reason: "package install" });
      continue;
    }

    let entry;

    if (mcp.type === "remote") {
      // Remote MCPs: config-only, no port or process management needed.
      entry = {
        name: mcp.name,
        type: "remote",
        url: mcp.url,
        manager: null,
        healthz: null,
        requiredEnvVars: mcp.requiredEnvVars || [],
      };
      process.stdout.write(`✓ remote → ${mcp.url}\n`);
    } else if (mcp.type === "local-npx") {
      // Local npx MCPs: on-demand via npx, no port assignment.
      entry = {
        name: mcp.name,
        type: "local-npx",
        package: mcp.package || null,
        requiresGlobalInstall: mcp.requiresGlobalInstall || false,
        command: mcp.command,
        args: mcp.args,
        manager: mcp.manager,
        healthz: mcp.healthz,
        requiredEnvVars: mcp.requiredEnvVars || [],
      };
      process.stdout.write(`✓ npx ${mcp.package}\n`);
    } else {
      // Local npm/dotnet MCPs: assign a free port.
      let portInfo;
      try {
        portInfo = await findFreePort(
          MCP_PORT_RANGE.start,
          MCP_PORT_RANGE.end,
          MCP_PORT_RANGE.fallbackStart,
          usedPorts,
        );
      } catch (err) {
        process.stdout.write(`✗ ${err.message}\n`);
        failed.push({ ...mcp, reason: "no free port" });
        continue;
      }
      usedPorts.add(portInfo.port);

      entry = {
        name: mcp.name,
        type: mcp.type,
        port: portInfo.port,
        url: `http://localhost:${portInfo.port}`,
        manager: mcp.manager,
        healthz: mcp.healthz,
        invoke: mcp.invoke,
        requiredEnvVars: mcp.requiredEnvVars || [],
      };
      process.stdout.write(`✓ port ${portInfo.port}`);
      if (portInfo.warning) process.stdout.write(` (${portInfo.warning})`);
      process.stdout.write("\n");
    }

    // Update .mcps.json entry (replace any existing entry for this MCP)
    const existingIdx = mcpsConfig.mcps.findIndex(m => m.name === mcp.name);
    if (existingIdx >= 0) {
      mcpsConfig.mcps[existingIdx] = entry;
    } else {
      mcpsConfig.mcps.push(entry);
    }
    installed.push(entry);
  }

  // Write .mcps.json (with backup of existing, unless already backed up in error path)
  if (!alreadyBacked && fs.existsSync(mcpsConfigPath)) {
    fs.copyFileSync(mcpsConfigPath, mcpsConfigPath + BACKUP_SUFFIX);
  }
  fs.writeFileSync(mcpsConfigPath, JSON.stringify(mcpsConfig, null, 2));

  // Summary
  if (installed.length > 0) {
    console.log(`\n   ✓ Configured ${installed.length} MCP(s):`);
    installed.forEach(m => {
      const target = m.url || (m.command ? `${m.command} ${(m.args || []).join(" ")}` : m.name);
      console.log(`     • ${m.name} → ${target}`);
    });
    console.log(`   📁 Config file: ${mcpsConfigPath}`);
  }
  if (failed.length > 0) {
    console.log(`\n   ⚠️  ${failed.length} MCP(s) failed:`);
    failed.forEach(m => console.log(`     • ${m.name} (${m.reason})`));
    console.log("\n   See docs/plans/add-mcps-alongside-agents.md → Rollback and Error Handling");
  }

  // NOTE: Process supervision (pm2 / systemd) is the implementer's responsibility;
  // see Process Management section. This installer registers MCPs in .mcps.json
  // but does not start long-lived processes during `npm install`.

  return { installed, failed };
}

/**
 * Write (or merge) MCP entries into the Copilot CLI MCP config file.
 *
 * - Global mode: writes to `~/.copilot/mcp-config.json`
 * - Local mode:  writes to `.mcp.json` in the project root
 *
 * Uses the same config snippets as the "MCP Configuration Snippets" section.
 *
 * NOTE: github-mcp-server has no Copilot config defined yet (see known gap in
 * the MCP Configuration Snippets section). Only MCPs with a documented Copilot
 * config (currently: context-7, gamecodex) are written here.
 */
async function writeCopilotMcpConfig(mode) {
  console.log("\n🧩 Writing Copilot MCP config...");

  // Global: ~/.copilot/mcp-config.json (same dir as agents/skills)
  // Local:  .mcp.json at the project root (not inside .github/)
  const configPath = mode === "local"
    ? path.join(process.cwd(), ".mcp.json")
    : path.join(PLATFORMS.copilot.globalDir, "mcp-config.json");

  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Load or initialise the Copilot MCP config
  let copilotMcpConfig = { mcpServers: {} };
  if (fs.existsSync(configPath)) {
    try {
      copilotMcpConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (typeof copilotMcpConfig.mcpServers !== "object") copilotMcpConfig.mcpServers = {};
    } catch {
      const backup = configPath + BACKUP_SUFFIX;
      fs.copyFileSync(configPath, backup);
      console.warn(`   ⚠️  Could not parse ${configPath}; backed up to ${backup}`);
      copilotMcpConfig = { mcpServers: {} };
    }
  }

  // Merge entries for MCPs that have a documented Copilot config.
  // context-7: OAuth-protected HTTP endpoint
  copilotMcpConfig.mcpServers["context7"] = {
    type: "http",
    url: "https://mcp.context7.com/mcp/oauth",
    tools: ["query-docs", "resolve-library-id"],
  };

  // gamecodex: launched on-demand via npx
  copilotMcpConfig.mcpServers["gamedev"] = {
    command: "npx",
    args: ["-y", "gamecodex"],
  };

  // NOTE: github-mcp-server is intentionally omitted here — its Copilot config
  // has not been specified in issue #15. See "known gap" note in the
  // MCP Configuration Snippets section and the implementation checklist.

  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, configPath + BACKUP_SUFFIX);
  }
  fs.writeFileSync(configPath, JSON.stringify(copilotMcpConfig, null, 2));
  console.log(`   ✓ Copilot MCP config written: ${configPath}`);
}

/**
 * Merge MCP entries into the OpenCode config.json under the "mcp" key.
 *
 * - Global mode: writes to `~/.config/opencode/config.json`
 * - Local mode:  writes to `.opencode/config.json`
 *
 * Writes the documented OpenCode MCP configs for context-7, github-mcp-server,
 * and gamecodex (per the MCP Configuration Snippets section).
 */
async function writeOpenCodeMcpConfig(mode) {
  console.log("\n🧩 Writing OpenCode MCP config...");

  const configPath = getOpenCodeConfigPath(mode);
  const { config, valid } = readOpenCodeConfig(configPath);
  if (!valid) return;

  if (typeof config.mcp !== "object" || config.mcp === null) {
    config.mcp = {};
  }

  // context-7: OAuth-protected remote MCP
  config.mcp["context7"] = {
    type: "remote",
    url: "https://mcp.context7.com/mcp/oauth",
    enabled: true,
  };

  // github-mcp-server: remote MCP authenticated via PAT env var
  config.mcp["github-mcp"] = {
    type: "remote",
    url: "https://api.githubcopilot.com/mcp/",
    headers: {
      Authorization: "Bearer {env:OC_GITHUB_PAT}",
    },
    enabled: true,
  };

  // gamecodex: on-demand via npx (OpenCode uses command array, not command+args)
  config.mcp["gamecodex"] = {
    type: "local",
    command: ["npx", "-y", "gamecodex"],
    enabled: true,
  };

  // Backup before writing
  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, configPath + BACKUP_SUFFIX);
  }

  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  writeOpenCodeConfig(configPath, config);
  console.log(`   ✓ OpenCode MCP config written: ${configPath}`);
}

/**
 * Display next steps
 */
function displayNextSteps(opencodePath, copilotPath, mode) {
  console.log("\n📚 Next steps:");
  console.log("\n1. Agents and skills installed successfully!");

  console.log("\n2. For OpenCode:");
  console.log(`   - ${mode === "global" ? "Global" : "Local"} installation: ${opencodePath}`);
  console.log("   - Agents, skills, and plugins are ready to use immediately");
  console.log("   - See: https://opencode.ai/docs for documentation");

  console.log("\n3. For GitHub Copilot:");
  console.log(`   - ${mode === "global" ? "Global" : "Local"} installation: ${copilotPath}`);
  console.log("   - Agents and skills are ready to use immediately");
  console.log("   - Configure in: .github/copilot/config.yml");

  console.log("\n4. For MCP servers:");
  console.log(`   - MCP registry: ${path.join(opencodePath, ".mcps.json")}`);
  console.log("   - Remote MCPs (context-7, github-mcp-server): no local process needed.");
  console.log("   - For context-7: run `opencode mcp auth context7` to authenticate.");
  console.log("   - For github-mcp-server: ensure OC_GITHUB_PAT environment variable is set.");
  console.log("   - Local npx MCPs (gamecodex): launched on-demand by the host.");
  console.log("   - Local MCPs (mslearn, nuget): start with pm2 or appropriate supervisor.");
  console.log("   - Verify local MCPs with: curl http://localhost:<port>/healthz");

  console.log("\n5. Additional commands:");
  console.log("   - npm run restore     : Restore from backup");
  console.log("   - npm run uninstall   : Remove installations");
  console.log("   - npm run list        : Show installed agents/skills");

  console.log("\n6. Documentation:");
  console.log("   - OpenCode: https://opencode.ai/docs");
  console.log("   - GitHub Copilot: https://github.com/features/copilot");
}

// ============================================================================
// MAIN
// ============================================================================

/**
 * Main installation function
 */
async function main() {
  try {
    console.log("🚀 @johnludlow/agents Installation");
    console.log("=====================================\n");

    const mode = getInstallMode();
    console.log(`📍 Installation mode: ${mode}`);

    // Build agent definitions from canonical source
    console.log("\n🔨 Building agent and skill definitions...");
    try {
      const { buildOpenCodeAgents, buildCopilotAgents, buildOpenCodeSkills, buildCopilotSkills } = require("./build-agents.js");
      buildOpenCodeAgents();
      buildCopilotAgents();
      buildOpenCodeSkills();
      buildCopilotSkills();
    } catch (buildError) {
      console.warn("   ⚠️  Could not build agents/skills, using pre-built versions");
    }

    // Check if OpenCode is available
    const openCodeAvailable = checkOpenCodeInstalled();
    if (!openCodeAvailable && mode === "local") {
      console.log("   Note: Installing to local .opencode directory");
    }

    // Install both platforms
    const opencodePath = installPlatform("opencode", mode);
    installOpenCodeConfig(mode);
    console.log("");
    const copilotPath = installPlatform("copilot", mode);

    // Install OpenCode plugins
    installOpenCodePlugins(mode);

    // Install recommended Copilot plugins
    installCopilotPlugins();

    // Install MCP servers and write configs
    const mcpResult = await installMcps(mode);
    try {
      await writeOpenCodeMcpConfig(mode);
    } catch (err) {
      console.warn(`\n⚠️  Failed to write OpenCode MCP config: ${err.message}`);
      process.exitCode = 2;
    }
    try {
      await writeCopilotMcpConfig(mode);
    } catch (err) {
      console.warn(`\n⚠️  Failed to write Copilot MCP config: ${err.message}`);
      process.exitCode = 2;
    }

    // Display next steps
    displayNextSteps(opencodePath, copilotPath, mode);

    if (mcpResult.failed.length > 0) {
      console.log(`\n⚠️  Installation completed with ${mcpResult.failed.length} MCP failure(s).`);
      process.exitCode = 2;  // Non-zero so CI flags it; do not throw — partial success is acceptable.
    }

    if (process.exitCode && process.exitCode !== 0) {
      console.log("\n⚠️  Installation completed with warnings.");
    } else {
      console.log("\n✨ Installation successful!");
    }
  } catch (error) {
    console.error("\n❌ Installation failed:");
    console.error(error.message);
    process.exit(1);
  }
}

// Run installation if this is being executed directly (postinstall hook)
if (require.main === module) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { installPlatform, installOpenCodeConfig, main };
