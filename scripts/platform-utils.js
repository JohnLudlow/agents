#!/usr/bin/env node

/**
 * @johnludlow/agents Platform Utilities
 *
 * Shared platform configuration and helper functions used by
 * install.js, restore.js, and uninstall.js.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// ============================================================================
// CONFIGURATION
// ============================================================================

// Backup suffix based on current time (computed once per process)
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
    // For local mode, only manage these subdirectories
    // to avoid affecting workflows, issue templates, and other .github metadata
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
 * Backup existing directory or subdirectories
 *
 * For Copilot (both local and global): backs up only managed subdirectories
 * individually to avoid affecting workflows, issue templates, and other
 * platform metadata.
 *
 * For other platforms: backs up by copying the entire directory.
 * Uses copy instead of move to preserve originals during backup.
 */
function backupExistingDirectory(targetDir, platform, mode) {
  const platformConfig = PLATFORMS[platform];
  const isCopilot = platform === "copilot";
  const managedSubDirs = isCopilot ? platformConfig.localManagedSubDirs : null;

  if (isCopilot && managedSubDirs) {
    // For Copilot (both local and global): backup only managed subdirectories
    // individually. This preserves other content like config.json, IDE settings,
    // plugins, etc.
    const backups = [];
    for (const subDir of managedSubDirs) {
      const subDirPath = path.join(targetDir, subDir);
      if (fs.existsSync(subDirPath)) {
        const backupDir = subDirPath + BACKUP_SUFFIX;
        copyDirectory(subDirPath, backupDir);
        backups.push(backupDir);
      }
    }
    return backups.length > 0 ? backups : null;
  }

  // For other platforms (OpenCode): backup entire directory by copying
  if (fs.existsSync(targetDir)) {
    const backupDir = targetDir + BACKUP_SUFFIX;
    copyDirectory(targetDir, backupDir);
    return [backupDir];
  }
  return null;
}

/**
 * Find and list all available backups for a given directory
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
 * Find the latest backup for a given directory (returns path or null)
 */
function findLatestBackup(targetDir) {
  const backups = listBackupsForPlatform(targetDir);
  if (backups.length === 0) {
    return null;
  }
  return backups[0].path;
}

module.exports = {
  BACKUP_SUFFIX,
  PLATFORMS,
  getInstallMode,
  getTargetDirectory,
  removeDirectory,
  copyDirectory,
  backupExistingDirectory,
  listBackupsForPlatform,
  findLatestBackup,
};
