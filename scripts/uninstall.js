#!/usr/bin/env node

/**
 * @johnludlow/agents Uninstallation Script
 *
 * Removes agents and skills from both OpenCode and GitHub Copilot configurations.
 * Uses unified platform logic shared with install.js and restore.js.
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
  },
  copilot: {
    name: "GitHub Copilot",
    emoji: "🔌",
    globalDir: path.join(os.homedir(), ".copilot"),
    localDir: (cwd) => path.join(cwd, ".github"),
    // For local mode, only manage these subdirectories
    // to avoid affecting workflows, issue templates, and other .github metadata
    // Only uninstall these subdirs in local mode to avoid removing other .github content
    localManagedSubDirs: ["agents", "skills"],
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Determine installation mode (global vs local)
 */
function getInstallMode() {
  const isGlobalInstall = process.env.npm_config_global === "true";
  return isGlobalInstall ? "global" : "local";
}

/**
 * Get target directory for a platform and mode
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
 * Find and restore latest backup for a platform
 */
function findLatestBackup(targetDir) {
  const parentDir = path.dirname(targetDir);
  if (!fs.existsSync(parentDir)) {
    return null;
  }

  const dirName = path.basename(targetDir);
  const files = fs.readdirSync(parentDir);
  const backups = files
    .filter(f => f.startsWith(dirName + ".johnludlow-backup-"))
    .sort()
    .reverse();

  if (backups.length === 0) {
    return null;
  }

  return path.join(parentDir, backups[0]);
}

/**
 * List all available backups for a platform
 */
function listBackupsForPlatform(targetDir) {
  const parentDir = path.dirname(targetDir);
  if (!fs.existsSync(parentDir)) {
    return [];
  }

  const dirName = path.basename(targetDir);
  const files = fs.readdirSync(parentDir);
  const backups = files
    .filter(f => f.startsWith(dirName + ".johnludlow-backup-"))
    .sort()
    .reverse();

  return backups.map(b => ({
    name: b,
    path: path.join(parentDir, b),
    timestamp: b.replace(dirName + ".johnludlow-backup-", "").replace(/-/g, ":")
  }));
}

/**
 * Remove empty parent directory if possible
 */
function removeEmptyParentDirectory(targetDir) {
  try {
    const parentDir = path.dirname(targetDir);
    if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
      fs.rmdirSync(parentDir);
    }
  } catch (error) {
    // Parent directory might not be empty or doesn't exist, that's okay
  }
}

// ============================================================================
// UNINSTALLATION
// ============================================================================

/**
 * Uninstall agents and skills from a platform
 */
function uninstallPlatform(platform, mode) {
  const config = PLATFORMS[platform];
  const targetDir = getTargetDirectory(platform, mode);
  const isCopilotLocal = platform === "copilot" && mode === "local";
  const managedSubDirs = isCopilotLocal ? config.localManagedSubDirs : null;

  console.log(`\n${config.emoji} Uninstalling from ${config.name}...`);

  if (mode === "local" && config.localManagedSubDirs) {
    // For Copilot local: only remove managed subdirs to avoid deleting other .github content
    let anyRemoved = false;
    for (const subDirName of config.localManagedSubDirs) {
      const subDir = path.join(targetDir, subDirName);
      if (!fs.existsSync(subDir)) {
        continue;
      }

      const latestBackup = findLatestBackup(subDir);
      if (latestBackup && fs.existsSync(latestBackup)) {
        console.log(`   → Backup found for ${subDirName}/, restoring from: ${path.basename(latestBackup)}`);
        removeDirectory(subDir);
        fs.renameSync(latestBackup, subDir);
        console.log(`   ✓ Restored ${subDirName}/ from backup`);
      } else {
        console.log(`   → Removing ${subDirName}/`);
        removeDirectory(subDir);
        console.log(`   ✓ Removed ${subDirName}/`);
      }
      anyRemoved = true;
    }
    if (!anyRemoved) {
      console.log("   ℹ️  No managed directories found");
      return null;
    }
    return targetDir;
  }

  // For global mode or other platforms: handle entire directory

  if (!fs.existsSync(targetDir)) {
    console.log("   ℹ️  No installation found");
    return null;
  }

  // Check for backups
  const latestBackup = findLatestBackup(targetDir);

  if (latestBackup && fs.existsSync(latestBackup)) {
    console.log(`   → Backup found, restoring from: ${path.basename(latestBackup)}`);

    // Remove current installation
    removeDirectory(targetDir);

    // Restore backup
    fs.renameSync(latestBackup, targetDir);
    console.log("   ✓ Restored from backup");
  } else {
    // Just remove the installation
    console.log(`   → Removing installation from: ${targetDir}`);
    removeDirectory(targetDir);
    console.log("   ✓ Removed installation");
  }

  // Remove empty parent directories if they exist
  removeEmptyParentDirectory(targetDir);

  return targetDir;
}

/**
 * Main uninstallation function
 */
function uninstall() {
  try {
    console.log("🗑️  @johnludlow/agents Uninstallation");
    console.log("======================================");

    const mode = getInstallMode();
    console.log(`\n📍 Installation mode: ${mode}`);

    // Uninstall both platforms
    uninstallPlatform("opencode", mode);
    uninstallPlatform("copilot", mode);

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

module.exports = { uninstallPlatform, uninstall };
