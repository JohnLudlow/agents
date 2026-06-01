#!/usr/bin/env node

/**
 * @johnludlow/agents List Script
 *
 * Lists all installed agents and skills in OpenCode, GitHub Copilot, and Kiro formats.
 */

const fs = require("fs");
const path = require("path");

const { PLATFORMS, getInstallMode, getTargetDirectory } = require("./platform-utils.js");

/**
 * List agents and skills in a directory
 */
function listAgentsAndSkills(baseDir) {
  const agents = [];
  const agentsDir = path.join(baseDir, "agents");
  const skillsDir = path.join(baseDir, "skills");

  if (fs.existsSync(agentsDir)) {
    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith(".md"));
    agents.push({
      type: "agents",
      count: files.length,
      files: files.sort()
    });
  }

  if (fs.existsSync(skillsDir)) {
    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith(".md"));
    agents.push({
      type: "skills",
      count: files.length,
      files: files.sort()
    });
  }

  return agents;
}

/**
 * List installed components for a platform
 */
function listPlatform(platform, mode) {
  const config = PLATFORMS[platform];
  const targetDir = getTargetDirectory(platform, mode);

  console.log(`${config.emoji} ${config.name}:`);
  if (fs.existsSync(targetDir)) {
    const items = listAgentsAndSkills(targetDir);
    if (items.length > 0) {
      items.forEach(item => {
        console.log(`   📦 ${item.type.toUpperCase()} (${item.count})`);
        item.files.forEach(file => {
          console.log(`      • ${path.basename(file, ".md")}`);
        });
      });
      console.log(`   📁 Location: ${targetDir}\n`);
    } else {
      console.log(`   ℹ️  No agents or skills installed\n`);
    }
  } else {
    console.log(`   ℹ️  ${config.name} directory not found: ${targetDir}\n`);
  }
}

/**
 * Main list function
 */
function list() {
  try {
    console.log("📋 @johnludlow/agents Installed Components");
    console.log("==========================================\n");

    const mode = getInstallMode();
    console.log(`📍 Installation mode: ${mode}\n`);

    listPlatform("opencode", mode);
    listPlatform("copilot", mode);
    listPlatform("kiro", mode);

    // Summary and next steps
    console.log("📚 Management Commands:");
    console.log("   npm run install:local    : Install to local directories");
    console.log("   npm run restore          : Restore from backup");
    console.log("   npm run uninstall        : Remove installations");
    console.log("   npm run generate:copilot : Regenerate Copilot format");

  } catch (error) {
    console.error("\n❌ List command failed:");
    console.error(error.message);
    process.exit(1);
  }
}

// Run list if this is being executed directly
if (require.main === module) {
  list();
}

module.exports = { list };
