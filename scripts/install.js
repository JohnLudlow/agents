#!/usr/bin/env node

/**
 * @johnludlow/agents Installation Script
 *
 * Installs agents and skills in both OpenCode and GitHub Copilot formats.
 * - OpenCode: Installs to ~/.config/opencode/ (global) or .opencode/ (local)
 * - GitHub Copilot: Installs to ~/.copilot/ (global) or .github/ (local)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

// Configuration
const OPENCODE_GLOBAL_DIR = path.join(os.homedir(), ".config", "opencode");
const OPENCODE_LOCAL_DIR = path.join(process.cwd(), ".opencode");
const COPILOT_GLOBAL_DIR = path.join(os.homedir(), ".copilot");
const COPILOT_LOCAL_DIR = path.join(process.cwd(), ".github");
const BACKUP_SUFFIX = `.johnludlow-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;

// Source directories (relative to package root)
const SOURCE_DIRS = {
  agents: path.join(__dirname, "..", "agents"),
  skills: path.join(__dirname, "..", "skills"),
};

/**
 * Check if OpenCode is installed
 */
function checkOpenCodeInstalled() {
  if (!fs.existsSync(OPENCODE_GLOBAL_DIR)) {
    console.warn("⚠️  OpenCode configuration directory not found");
    console.warn("   Install OpenCode: https://opencode.ai");
    return false;
  }
  console.log("✓ OpenCode detected");
  return true;
}

/**
 * Determine installation mode (global vs local)
 */
function getInstallMode() {
  const isGlobalInstall = process.env.npm_config_global === "true";
  return isGlobalInstall ? "global" : "local";
}

/**
 * Get target installation directory for OpenCode
 */
function getOpencodeTargetDirectory(mode) {
  if (mode === "global") {
    return OPENCODE_GLOBAL_DIR;
  } else {
    if (!fs.existsSync(OPENCODE_LOCAL_DIR)) {
      fs.mkdirSync(OPENCODE_LOCAL_DIR, { recursive: true });
    }
    return OPENCODE_LOCAL_DIR;
  }
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
 * Backup existing installations
 */
function backupExistingInstallation(targetDir) {
  if (fs.existsSync(targetDir)) {
    const backupDir = targetDir + BACKUP_SUFFIX;
    fs.renameSync(targetDir, backupDir);
    console.log(`✓ Backed up existing installation to: ${backupDir}`);
    return backupDir;
  }
  return null;
}

/**
 * Install agents and skills
 */
function installAgentsAndSkills(mode) {
  console.log(`\n📦 Installing agents and skills (${mode} mode)...`);

  // Get target directory
  const targetDir = getOpencodeTargetDirectory(mode);

  // Backup existing installation
  backupExistingInstallation(targetDir);

  // Create necessary directories
  const agentsDir = path.join(targetDir, "agents");
  const skillsDir = path.join(targetDir, "skills");

  // Copy agents
  if (fs.existsSync(SOURCE_DIRS.agents)) {
    console.log("  → Installing agents...");
    copyDirectory(SOURCE_DIRS.agents, agentsDir);
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    console.log(`    ✓ Installed ${agentFiles.length} agents`);
  }

  // Copy skills
  if (fs.existsSync(SOURCE_DIRS.skills)) {
    console.log("  → Installing skills...");
    copyDirectory(SOURCE_DIRS.skills, skillsDir);
    const skillFiles = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
    console.log(`    ✓ Installed ${skillFiles.length} skills`);
  }

  console.log(`\n✓ Installation complete to: ${targetDir}`);
  return targetDir;
}

/**
 * Install Copilot plugins
 */
function installCopilotPlugins() {
  console.log("\n🔌 Installing Copilot plugins...");

  const plugins = [
    "awesome-copilot@awesome-copilot",
    "azure@awesome-copilot",
    "doublecheck@awesome-copilot",
    "dotnet@awesome-copilot",
    "dotnet-diag@awesome-copilot",
    "context-engineering@awesome-copilot",
    "csharp-dotnet-development@awesome-copilot",
    "csharp-mcp-development@awesome-copilot",
    "devops-oncall@awesome-copilot",
    "technical-spike@awesome-copilot",
    "microsoft-docs@awesome-copilot",
    "openapi-to-application-csharp-dotnet@awesome-copilot",
    "polyglot-test-agent@awesome-copilot",
    "roundup@awesome-copilot",
    "project-planning@awesome-copilot",
    "security-best-practices@awesome-copilot"
  ];

  // Check if copilot CLI is available
  try {
    execSync("copilot --version", { stdio: "ignore" });
  } catch (error) {
    console.warn("⚠️  Copilot CLI not found");
    console.warn("   Install Copilot CLI: https://github.com/github/copilot-cli");
    return;
  }

  let installed = 0;
  let failed = 0;

  for (const plugin of plugins) {
    try {
      execSync(`copilot plugin install ${plugin}`, { stdio: "ignore" });
      installed++;
    } catch (error) {
      // Plugin may already be installed, so we don't count as failure
      failed++;
    }
  }

  console.log(`  ✓ Plugin installation complete (${installed} successful)`);
}

/**
 * Display next steps
 */
function displayNextSteps(installDir) {
  console.log("\n📚 Next steps:");
  console.log(`\n1. Agents and skills are installed to: ${installDir}`);
  console.log("\n2. For OpenCode:");
  console.log("   - Agents and skills are ready to use");
  console.log("   - Check OpenCode documentation for agent configuration");
  console.log("\n3. For GitHub Copilot:");
  console.log("   - Run: npm run generate:copilot");
  console.log("   - This creates .github/agents and .github/skills");
  console.log("   - Configure in your .github/copilot/config.yml");
  console.log("\n4. To restore from backup:");
  console.log("   - npm run restore");
}

/**
 * Main installation function
 */
async function main() {
  try {
    console.log("🚀 @johnludlow/agents Installation");
    console.log("=====================================\n");

    const mode = getInstallMode();
    const openCodeAvailable = checkOpenCodeInstalled();

    // Install agents and skills
    const installDir = installAgentsAndSkills(mode);

    // Try to install Copilot plugins if global install
    if (mode === "global") {
      installCopilotPlugins();
    }

    // Display next steps
    displayNextSteps(installDir);

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

module.exports = { installAgentsAndSkills, installCopilotPlugins };
