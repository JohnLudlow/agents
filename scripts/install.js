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
 * Get source agents directory for a platform
 *
 * For OpenCode: Uses pre-built opencode/agents (with YAML frontmatter + permissions)
 * For Copilot: Uses generated .github/agents in global mode (with Copilot frontmatter),
 *              or canonical agents/ in local mode (build will add frontmatter before shipping)
 */
function getSourceAgentsDir(platform, mode) {
  if (platform === "opencode") {
    return SOURCE_DIRS.opencodeAgents;
  }
  if (platform === "copilot") {
    // For global Copilot: use pre-built .github/agents with Copilot frontmatter
    if (mode === "global") {
      return path.join(__dirname, "..", ".github", "agents");
    }
    // For local Copilot: use canonical agents
    // (Copilot CLI will use the canonical agents which are installed locally)
    return SOURCE_DIRS.canonicalAgents;
  }
  throw new Error(`Unknown platform: ${platform}`);
}

/**
 * Get source skills directory for a platform
 *
 * For both OpenCode and Copilot: Uses canonical skills/ (plain markdown)
 */
function getSourceSkillsDir(platform) {
  // Both platforms use canonical skills (plain markdown)
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
  const sourceAgentsDir = getSourceAgentsDir(platform, mode);
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
    copyDirectory(sourceAgentsDir, agentsDir);
    const count = countMarkdownFiles(agentsDir);
    console.log(`    ✓ Installed ${count} agents`);
  }

  // Install skills
  if (fs.existsSync(sourceSkillsDir)) {
    console.log("  → Installing skills...");
    copyDirectory(sourceSkillsDir, skillsDir);
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
  return path.join(opencodePath, "opencode.json");
}

/**
 * Read and parse OpenCode config
 */
function readOpenCodeConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    // Create new config if it doesn't exist
    return { plugin: [] };
  }
  try {
    const content = fs.readFileSync(configPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.warn(`   ⚠️  Could not parse existing config at ${configPath}, starting fresh`);
    return { plugin: [] };
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
  const config = readOpenCodeConfig(configPath);

  // Ensure plugin array exists
  if (!Array.isArray(config.plugin)) {
    config.plugin = [];
  }

  const pluginInstallations = [
    {
      name: "oh-my-opencode",
      package: null, // No npm package for oh-my-opencode
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

    // Install npm package if specified
    if (plugin.package) {
      const result = spawnSync("npm", ["install", "-g", plugin.package], {
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

  console.log("\n4. Additional commands:");
  console.log("   - npm run restore     : Restore from backup");
  console.log("   - npm run uninstall   : Remove installations");
  console.log("   - npm run list        : Show installed agents/skills");

  console.log("\n5. Documentation:");
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
    console.log("\n🔨 Building agent definitions...");
    try {
      const { buildOpenCodeAgents, buildCopilotAgents } = require("./build-agents.js");
      buildOpenCodeAgents();
      buildCopilotAgents();
    } catch (buildError) {
      console.warn("   ⚠️  Could not build agents, using pre-built versions");
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

    // Display next steps
    displayNextSteps(opencodePath, copilotPath, mode);

    console.log("\n✨ Installation successful!");
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
