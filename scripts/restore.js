#!/usr/bin/env node

/**
 * @johnludlow/agents Restore Script
 *
 * Restores agents and skills from the latest backup.
 * Uses unified platform logic shared with install.js and uninstall.js.
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
    // Only restore these subdirs in local mode to avoid wiping other .github content
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
 * Find and list all available backups for a platform
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
    timestamp: b.replace(dirName + ".johnludlow-backup-", "")
  }));
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
