#!/usr/bin/env node

/**
 * @johnludlow/agents Uninstallation Script
 *
 * Removes agents and skills from both OpenCode and GitHub Copilot configurations.
 * Restores from backup if available.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// Configuration
const OPENCODE_GLOBAL_DIR = path.join(os.homedir(), ".config", "opencode");
const OPENCODE_LOCAL_DIR = path.join(process.cwd(), ".opencode");
const COPILOT_GLOBAL_DIR = path.join(os.homedir(), ".copilot");
const COPILOT_LOCAL_DIR = path.join(process.cwd(), ".github");

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
  return mode === "global" ? OPENCODE_GLOBAL_DIR : OPENCODE_LOCAL_DIR;
}

/**
 * Get target installation directory for Copilot
 */
function getCopilotTargetDirectory(mode) {
  return mode === "global" ? COPILOT_GLOBAL_DIR : COPILOT_LOCAL_DIR;
}

/**
 * Remove directory recursively
 */
function removeDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      removeDirectory(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  }

  fs.rmdirSync(dir);
}

/**
 * Find and restore latest backup
 */
function restoreLatestBackup(targetDir) {
  const parentDir = path.dirname(targetDir);
  if (!fs.existsSync(parentDir)) {
    return null;
  }

  const files = fs.readdirSync(parentDir);
  const backups = files
    .filter(f => f.startsWith(path.basename(targetDir) + ".johnludlow-backup-"))
    .sort()
    .reverse();

  if (backups.length === 0) {
    return null;
  }

  const latestBackup = path.join(parentDir, backups[0]);
  return latestBackup;
}

/**
 * Uninstall agents and skills from OpenCode
 */
function uninstallOpenCode(mode) {
  console.log("\n📍 Uninstalling from OpenCode...");
  
  const targetDir = getOpencodeTargetDirectory(mode);

  if (!fs.existsSync(targetDir)) {
    console.log("   ℹ️  No OpenCode installation found");
    return null;
  }

  // Check for backups
  const latestBackup = restoreLatestBackup(targetDir);

  if (latestBackup && fs.existsSync(latestBackup)) {
    console.log("   → Backup found, restoring from: " + path.basename(latestBackup));
    
    // Remove current installation
    removeDirectory(targetDir);
    
    // Restore backup
    fs.renameSync(latestBackup, targetDir);
    console.log("   ✓ Restored from backup");
  } else {
    // Just remove the installation
    console.log(`   → Removing installation from: ${targetDir}`);
    removeDirectory(targetDir);
    console.log("   ✓ Removed OpenCode installation");
  }

  // Remove empty parent directories if they exist
  try {
    const parentDir = path.dirname(targetDir);
    if (fs.readdirSync(parentDir).length === 0) {
      fs.rmdirSync(parentDir);
    }
  } catch (error) {
    // Parent directory might not be empty or doesn't exist, that's okay
  }

  return targetDir;
}

/**
 * Uninstall agents and skills from GitHub Copilot
 */
function uninstallCopilot(mode) {
  console.log("\n🔌 Uninstalling from GitHub Copilot...");
  
  const targetDir = getCopilotTargetDirectory(mode);
  const agentsDir = path.join(targetDir, "agents");
  const skillsDir = path.join(targetDir, "skills");

  let removed = false;

  if (fs.existsSync(agentsDir)) {
    console.log("   → Removing agents...");
    removeDirectory(agentsDir);
    removed = true;
  }

  if (fs.existsSync(skillsDir)) {
    console.log("   → Removing skills...");
    removeDirectory(skillsDir);
    removed = true;
  }

  if (removed) {
    console.log("   ✓ Removed Copilot installation");
  } else {
    console.log("   ℹ️  No Copilot installation found");
  }

  return targetDir;
}

/**
 * Uninstall agents and skills
 */
function uninstall() {
  try {
    console.log("🗑️  @johnludlow/agents Uninstallation");
    console.log("======================================");

    const mode = getInstallMode();
    console.log(`\n📍 Installation mode: ${mode}`);

    const opencodeDir = uninstallOpenCode(mode);
    const copilotDir = uninstallCopilot(mode);

    console.log("\n✨ Uninstallation complete!");
    console.log("\n📚 Note:");
    console.log("   - Use 'npm run restore' to restore from backups");
    console.log("   - Use 'npm install' to reinstall");
  } catch (error) {
    console.error("\n❌ Uninstallation failed:");
    console.error(error.message);
    process.exit(1);
  }
}

// Run uninstallation
if (require.main === module) {
  uninstall();
}

module.exports = { uninstall };
