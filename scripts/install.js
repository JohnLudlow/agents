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
const os = require("os");

// ============================================================================
// CONFIGURATION
// ============================================================================

const BACKUP_SUFFIX = `.johnludlow-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;

// Installation platform definitions
const PLATFORMS = {
  opencode: {
    name: "OpenCode",
    emoji: "⚙️ ",
    globalDir: path.join(os.homedir(), ".config", "opencode"),
    localDir: (cwd) => path.join(cwd, ".opencode"),
    requiresConfig: true,
    configFile: "config.json",
  },
  copilot: {
    name: "GitHub Copilot",
    emoji: "🔌",
    globalDir: path.join(os.homedir(), ".copilot"),
    localDir: (cwd) => path.join(cwd, ".github"),
    requiresConfig: false,
    // Only backup/restore these subdirs in local mode to avoid clobbering other .github content
    localManagedSubDirs: ["agents", "skills"],
  },
};

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
 * For Copilot: Uses canonical agents/ (plain markdown)
 */
function getSourceAgentsDir(platform) {
  if (platform === "opencode") {
    return SOURCE_DIRS.opencodeAgents;
  }
  if (platform === "copilot") {
    // Copilot gets plain markdown from canonical source
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
 * Copy directory recursively, skipping README.md files
 */
function copyDirectory(source, target) {
  if (!fs.existsSync(source)) {
    return;
  }

  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);

  files.forEach((file) => {
    // Never copy README.md into agent/skill directories
    if (file === "README.md") return;

    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

/**
 * Backup existing directory
 */
function backupExistingDirectory(targetDir) {
  if (fs.existsSync(targetDir)) {
    const backupDir = targetDir + BACKUP_SUFFIX;
    fs.renameSync(targetDir, backupDir);
    return backupDir;
  }
  return null;
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

/**
 * Determine installation mode (global vs local)
 */
function getInstallMode() {
  const isGlobalInstall = process.env.npm_config_global === "true";
  return isGlobalInstall ? "global" : "local";
}

/**
 * Get target directory for a platform and mode
 * Note: Does NOT create the directory - that's done after backup
 */
function getTargetDirectory(platform, mode, cwd = process.cwd()) {
  const platformConfig = PLATFORMS[platform];
  if (!platformConfig) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  if (mode === "global") {
    return platformConfig.globalDir;
  } else {
    return platformConfig.localDir(cwd);
  }
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

  if (mode === "local" && config.localManagedSubDirs) {
    // For Copilot local: only backup managed subdirs to avoid clobbering the rest of .github
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    for (const subDirName of config.localManagedSubDirs) {
      const subDir = path.join(targetDir, subDirName);
      const backupDir = backupExistingDirectory(subDir);
      if (backupDir) {
        console.log(`  ✓ Backed up existing ${subDirName}/ to: ${path.basename(backupDir)}`);
      }
    }
  } else {
    // Backup existing installation (before creating directory)
    const backupDir = backupExistingDirectory(targetDir);
    if (backupDir) {
      console.log(`  ✓ Backed up existing installation to: ${backupDir}`);
    }

    // Now create the target directory (after backup)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
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

  // Copy agent definitions to agents directory
  const agentsSourceDir = path.join(configSourceDir, "agents");
  const agentsTargetDir = path.join(targetDir, "agents");

  if (fs.existsSync(agentsSourceDir)) {
    if (!fs.existsSync(agentsTargetDir)) {
      fs.mkdirSync(agentsTargetDir, { recursive: true });
    }

    const agentFiles = fs.readdirSync(agentsSourceDir).filter(f => f.endsWith('.md'));
    agentFiles.forEach(file => {
      const sourcePath = path.join(agentsSourceDir, file);
      const targetPath = path.join(agentsTargetDir, file);
      fs.copyFileSync(sourcePath, targetPath);
    });

    if (agentFiles.length > 0) {
      console.log(`   ✓ Installed ${agentFiles.length} agent definitions`);
    }
  }

  console.log(`   📁 Location: ${targetDir}`);
  return targetDir;
}

/**
 * Display next steps
 */
function displayNextSteps(opencodePath, copilotPath, mode) {
  console.log("\n📚 Next steps:");
  console.log("\n1. Agents and skills installed successfully!");

  console.log("\n2. For OpenCode:");
  console.log(`   - ${mode === "global" ? "Global" : "Local"} installation: ${opencodePath}`);
  console.log("   - Agents and skills are ready to use immediately");
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
      const { buildOpenCodeAgents } = require("./build-agents.js");
      buildOpenCodeAgents();
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
