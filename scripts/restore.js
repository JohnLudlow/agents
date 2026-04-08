#!/usr/bin/env node

/**
 * @johnludlow/agents Restore Script
 *
 * Restores agents and skills from the latest backup.
 * Uses platform helpers shared with install.js and uninstall.js via platform-utils.js.
 */

const fs = require("fs");
const path = require("path");

const {
  PLATFORMS,
  getInstallMode,
  getTargetDirectory,
  removeDirectory,
  listBackupsForPlatform,
} = require("./platform-utils.js");

/**
 * Restore from backup for a platform
 */
function restorePlatform(platform, mode) {
  const config = PLATFORMS[platform];
  const targetDir = getTargetDirectory(platform, mode);
  const isCopilotLocal = platform === "copilot" && mode === "local";
  const managedSubDirs = isCopilotLocal ? config.localManagedSubDirs : null;

  console.log(`\n${config.emoji} ${config.name}:`);

  if (isCopilotLocal && managedSubDirs) {
    // For local Copilot: handle subdirectories individually
    let anyRestored = false;

    for (const subDirName of managedSubDirs) {
      const subDirPath = path.join(targetDir, subDirName);
      const backups = listBackupsForPlatform(subDirPath);

      if (backups.length === 0) {
        console.log(`   ℹ️  No backups found for ${subDirName}/`);
        continue;
      }

      console.log(`   ${subDirName}: Available backups:`);
      backups.forEach((backup, index) => {
        console.log(`     ${index + 1}. ${backup.timestamp}`);
      });

      const latestBackup = backups[0];
      console.log(`   → ${subDirName}: Restoring from: ${latestBackup.timestamp}`);

      // Remove current installation if it exists
      if (fs.existsSync(subDirPath)) {
        removeDirectory(subDirPath);
      }

      // Restore from backup
      fs.renameSync(latestBackup.path, subDirPath);
      console.log(`   ✓ ${subDirName}: Restored from backup`);
      anyRestored = true;
    }

    if (!anyRestored) {
      console.log("   ℹ️  No backups found");
    }

    return anyRestored ? targetDir : null;
  }

  // For global mode or other platforms: handle entire directory

  const backups = listBackupsForPlatform(targetDir);

  if (backups.length === 0) {
    console.log("   ℹ️  No backups found");
    return null;
  }

  console.log("   Available backups:");
  backups.forEach((backup, index) => {
    console.log(`     ${index + 1}. ${backup.timestamp}`);
  });

  // Restore the latest backup
  const latestBackup = backups[0];
  console.log(`\n   → Restoring from: ${latestBackup.timestamp}`);

  // Remove current installation if it exists
  if (fs.existsSync(targetDir)) {
    console.log("   → Removing current installation...");
    removeDirectory(targetDir);
  }

  // Restore from backup
  fs.renameSync(latestBackup.path, targetDir);
  console.log("   ✓ Restored from backup");

  return targetDir;
}

// ============================================================================
// MAIN
// ============================================================================

/**
 * Main restore function
 */
function restore() {
  try {
    console.log("📦 @johnludlow/agents Restore");
    console.log("=============================");

    const mode = getInstallMode();
    console.log(`\n📍 Installation mode: ${mode}`);

    // Restore both platforms
    const opencodePath = restorePlatform("opencode", mode);
    const copilotPath = restorePlatform("copilot", mode);

    if (!opencodePath && !copilotPath) {
      console.log("\nℹ️  No backups found for any platform");
      return;
    }

    console.log("\n✨ Restore complete!");
    console.log("\n📚 Next steps:");
    console.log("   - Agents and skills are ready to use");
    if (opencodePath) {
      console.log("   - OpenCode: https://opencode.ai/docs");
    }
    if (copilotPath) {
      console.log("   - GitHub Copilot: https://github.com/features/copilot");
    }
  } catch (error) {
    console.error("\n❌ Restore failed:");
    console.error(error.message);
    process.exit(1);
  }
}

// Run restore
if (require.main === module) {
  restore();
}

module.exports = { restorePlatform, restore };
