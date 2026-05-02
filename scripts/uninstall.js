#!/usr/bin/env node

/**
 * @johnludlow/agents Uninstallation Script
 *
 * Removes agents and skills from both OpenCode and GitHub Copilot configurations.
 * Uses platform helpers shared with install.js and restore.js via platform-utils.js.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const {
  BACKUP_SUFFIX,
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
  const isCopilot = platform === "copilot";
  const managedSubDirs = isCopilot ? config.localManagedSubDirs : null;

  console.log(`\n${config.emoji} Uninstalling from ${config.name}...`);

  if (isCopilot && managedSubDirs) {
    // For Copilot (local and global): only remove managed subdirs to avoid deleting other platform content
    let anyRemoved = false;
    for (const subDirName of managedSubDirs) {
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
 * Uninstall MCP servers (best-effort) and remove .mcps.json.
 *
 * - Always removes .mcps.json (with backup).
 * - Only removes globally installed packages when --purge is passed,
 *   to avoid clobbering shared developer environments.
 */
function uninstallMcps(mode, { purge = false } = {}) {
  console.log("\n🧩 Uninstalling MCP servers...");

  const targetDir = getTargetDirectory("opencode", mode);
  const mcpsConfigPath = path.join(targetDir, ".mcps.json");

  if (!fs.existsSync(mcpsConfigPath)) {
    console.log("   ℹ️  No .mcps.json found");
    return;
  }

  // Backup .mcps.json before removing
  const backup = mcpsConfigPath + BACKUP_SUFFIX;
  try {
    fs.copyFileSync(mcpsConfigPath, backup);
    console.log(`   → Backed up .mcps.json to ${path.basename(backup)}`);
  } catch (error) {
    console.warn(`   ⚠️  Failed to back up .mcps.json: ${error.message}`);
  }

  if (purge) {
    let mcps = [];
    try {
      mcps = JSON.parse(fs.readFileSync(mcpsConfigPath, "utf8")).mcps || [];
    } catch { /* ignore parse errors on uninstall */ }

    for (const mcp of mcps) {
      // Remote MCPs have no package to remove.
      if (mcp.type === "remote") {
        process.stdout.write(`   → ${mcp.name}: remote — no package to remove, skipping\n`);
        continue;
      }
      // npx MCPs: only remove if a global install was done at install time.
      if (mcp.type === "local-npx" && !mcp.requiresGlobalInstall) {
        process.stdout.write(`   → ${mcp.name}: npx on-demand — no global package to remove, skipping\n`);
        continue;
      }
      process.stdout.write(`   → Removing ${mcp.name}... `);
      // Best-effort; ignore failures (user may have removed manually)
      // npm vs dotnet detection: try npm first then dotnet.
      const pkgName = mcp.package || mcp.name;
      let result = spawnSync("npm", ["uninstall", "-g", pkgName], { stdio: "pipe" });
      if (result.status !== 0) {
        result = spawnSync("dotnet", ["tool", "uninstall", "--global", pkgName], { stdio: "pipe" });
      }
      process.stdout.write(result.status === 0 ? "✓\n" : "skipped\n");
    }
  } else {
    console.log("   ℹ️  Skipping global package removal (use --purge to remove)");
  }

  try {
    fs.unlinkSync(mcpsConfigPath);
    console.log("   ✓ Removed .mcps.json");
  } catch (err) {
    console.log(`   ℹ️  Could not remove .mcps.json: ${err.message}`);
  }

  // Remove Copilot CLI MCP config entries written by writeCopilotMcpConfig.
  // Global: ~/.copilot/mcp-config.json (same dir as agents/skills)
  // Local:  .mcp.json at the project root
  const copilotMcpConfigPath = mode === "local"
    ? path.join(process.cwd(), ".mcp.json")
    : path.join(PLATFORMS.copilot.globalDir, "mcp-config.json");

  if (!fs.existsSync(copilotMcpConfigPath)) {
    console.log("   ℹ️  No Copilot MCP config file found");
    return;
  }

  try {
    const copilotConfig = JSON.parse(fs.readFileSync(copilotMcpConfigPath, "utf8"));
    const servers = copilotConfig.mcpServers || {};
    const installedKeys = ["context7", "gamedev"];
    const removedKeys = installedKeys.filter(k => k in servers);

    if (removedKeys.length === 0) {
      console.log("   ℹ️  No installer-managed entries in Copilot MCP config");
    } else {
      // Backup before modifying
      fs.copyFileSync(copilotMcpConfigPath, copilotMcpConfigPath + BACKUP_SUFFIX);
      removedKeys.forEach(k => delete servers[k]);
      copilotConfig.mcpServers = servers;
      fs.writeFileSync(copilotMcpConfigPath, JSON.stringify(copilotConfig, null, 2));
      console.log(`   ✓ Removed ${removedKeys.length} entry/entries from Copilot MCP config: ${removedKeys.join(", ")}`);
    }
  } catch (err) {
    console.warn(`   ⚠️  Could not clean Copilot MCP config: ${err.message}`);
  }

  // Remove MCP entries from OpenCode config.json written by writeOpenCodeMcpConfig.
  const opencodeCfgDir = mode === "local"
    ? path.join(process.cwd(), ".opencode")
    : path.join(os.homedir(), ".config", "opencode");
  const opencodeCfgPath = path.join(opencodeCfgDir, "config.json");

  if (!fs.existsSync(opencodeCfgPath)) {
    console.log("   ℹ️  No OpenCode config.json found");
    return;
  }

  try {
    const ocConfig = JSON.parse(fs.readFileSync(opencodeCfgPath, "utf8"));
    const mcp = ocConfig.mcp || {};
    const installedOcKeys = ["context7", "github-mcp", "gamecodex"];
    const removedOcKeys = installedOcKeys.filter(k => k in mcp);

    if (removedOcKeys.length === 0) {
      console.log("   ℹ️  No installer-managed entries in OpenCode config.json");
      return;
    }

    fs.copyFileSync(opencodeCfgPath, opencodeCfgPath + BACKUP_SUFFIX);
    removedOcKeys.forEach(k => delete mcp[k]);
    if (Object.keys(mcp).length === 0) {
      delete ocConfig.mcp;
    } else {
      ocConfig.mcp = mcp;
    }
    fs.writeFileSync(opencodeCfgPath, JSON.stringify(ocConfig, null, 2));
    console.log(`   ✓ Removed ${removedOcKeys.length} entry/entries from OpenCode MCP config: ${removedOcKeys.join(", ")}`);
  } catch (err) {
    console.warn(`   ⚠️  Could not clean OpenCode MCP config: ${err.message}`);
  }
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

    const purge = process.argv.includes("--purge");
    uninstallMcps(mode, { purge });

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
