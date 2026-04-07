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
 * Install Copilot agents and skills
 */
function installCopilotAgents(mode, sourceAgentsDir, sourceSkillsDir) {
  console.log("\n🔌 Installing GitHub Copilot format...");

  // Determine target directory
  const copilotDir = mode === "global" 
    ? COPILOT_GLOBAL_DIR 
    : COPILOT_LOCAL_DIR;

  // Create target directories
  const copilotAgentsDir = path.join(copilotDir, "agents");
  const copilotSkillsDir = path.join(copilotDir, "skills");

  // Copy agents to Copilot format
  if (fs.existsSync(sourceAgentsDir)) {
    console.log("  → Installing agents to Copilot format...");
    copyDirectory(sourceAgentsDir, copilotAgentsDir);
    const agentFiles = fs.readdirSync(copilotAgentsDir).filter(f => f.endsWith('.md'));
    console.log(`    ✓ Installed ${agentFiles.length} agents to Copilot`);
  }

  // Copy skills to Copilot format
  if (fs.existsSync(sourceSkillsDir)) {
    console.log("  → Installing skills to Copilot format...");
    copyDirectory(sourceSkillsDir, copilotSkillsDir);
    const skillFiles = fs.readdirSync(copilotSkillsDir).filter(f => f.endsWith('.md'));
    console.log(`    ✓ Installed ${skillFiles.length} skills to Copilot`);
  }

  console.log(`\n✓ Copilot format installation complete to: ${copilotDir}`);
  return copilotDir;
}



/**
 * Display next steps
 */
function displayNextSteps(opencodeDir, copilotDir, mode) {
  console.log("\n📚 Next steps:");
  console.log("\n1. Agents and skills installed successfully!");
  
  console.log("\n2. For OpenCode:");
  if (mode === "global") {
    console.log(`   - Global installation: ${opencodeDir}`);
  } else {
    console.log(`   - Local installation: ${opencodeDir}`);
  }
  console.log("   - Agents and skills are ready to use immediately");
  console.log("   - See: https://opencode.ai/docs for documentation");
  
  console.log("\n3. For GitHub Copilot:");
  if (mode === "global") {
    console.log(`   - Global installation: ${copilotDir}`);
  } else {
    console.log(`   - Local installation: ${copilotDir}`);
  }
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

/**
 * Main installation function
 */
async function main() {
  try {
    console.log("🚀 @johnludlow/agents Installation");
    console.log("=====================================\n");

    const mode = getInstallMode();
    
    console.log(`📍 Installation mode: ${mode}`);
    
    // Check if OpenCode is available
    const openCodeAvailable = checkOpenCodeInstalled();
    if (!openCodeAvailable && mode === "local") {
      console.log("   Note: Installing to local .opencode directory");
    }

    // Install agents and skills to OpenCode format
    const opencodeDir = installAgentsAndSkills(mode);

    // Install agents and skills to GitHub Copilot format
    const copilotDir = installCopilotAgents(mode, SOURCE_DIRS.agents, SOURCE_DIRS.skills);

    // Display next steps
    displayNextSteps(opencodeDir, copilotDir, mode);

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

module.exports = { installAgentsAndSkills, installCopilotAgents };
