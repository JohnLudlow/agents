#!/usr/bin/env node

/**
 * @johnludlow/agents Uninstallation Script
 *
 * Removes agents and skills from both OpenCode and GitHub Copilot configurations.
 * Uses platform helpers shared with install.js and restore.js via platform-utils.js.
 */

const fs = require("fs");
const path = require("path");

const {
  PLATFORMS,
  getInstallMode,
  getTargetDirectory,
  removeDirectory,
  listBackupsForPlatform,
  findLatestBackup,
} = require("./platform-utils.js");

// ============================================================================
// UTILITIES
// ============================================================================

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
