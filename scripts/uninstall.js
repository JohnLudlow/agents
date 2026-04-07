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
 * Uninstall agents and skills
 */
function uninstall() {
  console.log("🗑️  @johnludlow/agents Uninstallation");
  console.log("======================================\n");

  const mode = getInstallMode();
  const targetDir = getOpencodeTargetDirectory(mode);

  if (!fs.existsSync(targetDir)) {
    console.log("ℹ️  No installation found to remove");
    return;
  }

  // Check for backups
  const latestBackup = restoreLatestBackup(targetDir);

  if (latestBackup && fs.existsSync(latestBackup)) {
    console.log("📦 Backup found, restoring from: " + path.basename(latestBackup));
    
    // Remove current installation
    removeDirectory(targetDir);
    
    // Restore backup
    fs.renameSync(latestBackup, targetDir);
    console.log("✓ Restored from backup");
  } else {
    // Just remove the installation
    console.log(`Removing installation from: ${targetDir}`);
    removeDirectory(targetDir);
    console.log("✓ Removed");
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

  console.log("\n✨ Uninstallation complete!");
}

// Run uninstallation
if (require.main === module) {
  uninstall();
}

module.exports = { uninstall };
