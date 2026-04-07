#!/usr/bin/env node

/**
 * @johnludlow/agents Restore Script
 *
 * Restores agents and skills from the latest backup.
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
 * Find and list all available backups
 */
function listBackups(targetDir) {
  const parentDir = path.dirname(targetDir);
  if (!fs.existsSync(parentDir)) {
    return [];
  }

  const files = fs.readdirSync(parentDir);
  const backups = files
    .filter(f => f.startsWith(path.basename(targetDir) + ".johnludlow-backup-"))
    .sort()
    .reverse();

  return backups.map(b => ({
    name: b,
    path: path.join(parentDir, b),
    timestamp: b.replace(path.basename(targetDir) + ".johnludlow-backup-", "").replace(/-/g, ":")
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
 * Restore from backup
 */
function restore() {
  try {
    console.log("📦 @johnludlow/agents Restore");
    console.log("=============================\n");

    const mode = getInstallMode();
    console.log(`📍 Installation mode: ${mode}\n`);
    
    const targetDir = getOpencodeTargetDirectory(mode);
    const backups = listBackups(targetDir);

    if (backups.length === 0) {
      console.log("ℹ️  No backups found for restoration");
      console.log(`   Looking in: ${path.dirname(targetDir)}`);
      return;
    }

    console.log("📋 Available backups:\n");
    backups.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.timestamp}`);
    });

    // Restore the latest backup
    const latestBackup = backups[0];
    console.log(`\n🔄 Restoring from latest backup: ${latestBackup.timestamp}`);

    // Remove current installation if it exists
    if (fs.existsSync(targetDir)) {
      console.log("   → Removing current installation...");
      removeDirectory(targetDir);
      console.log("   ✓ Removed current installation");
    } else {
      console.log("   → No current installation to replace");
    }

    // Restore from backup
    console.log("   → Restoring from backup...");
    fs.renameSync(latestBackup.path, targetDir);
    console.log("   ✓ Restored from backup");

    console.log(`\n✨ Restore complete!`);
    console.log(`\n📍 Installation location: ${targetDir}`);
    console.log("\n📚 Next steps:");
    console.log("   - Agents and skills are ready to use");
    console.log("   - OpenCode: https://opencode.ai/docs");
    console.log("   - GitHub Copilot: https://github.com/features/copilot");
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

module.exports = { restore };
