#!/usr/bin/env node

/**
 * @johnludlow/agents List Script
 *
 * Lists all installed agents and skills in both OpenCode and GitHub Copilot formats.
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
 * List agents and skills in a directory
 */
function listAgentsAndSkills(baseDir, agentType) {
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
 * Main list function
 */
function list() {
  try {
    console.log("📋 @johnludlow/agents Installed Components");
    console.log("==========================================\n");

    const mode = getInstallMode();
    console.log(`📍 Installation mode: ${mode}\n`);

    // List OpenCode installation
    console.log("🎯 OpenCode Format:");
    const opencodeDir = mode === "global" ? OPENCODE_GLOBAL_DIR : OPENCODE_LOCAL_DIR;
    if (fs.existsSync(opencodeDir)) {
      const opencodeItems = listAgentsAndSkills(opencodeDir);
      if (opencodeItems.length > 0) {
        opencodeItems.forEach(item => {
          console.log(`   📦 ${item.type.toUpperCase()} (${item.count})`);
          item.files.forEach(file => {
            console.log(`      • ${path.basename(file, ".md")}`);
          });
        });
        console.log(`   📁 Location: ${opencodeDir}\n`);
      } else {
        console.log(`   ℹ️  No agents or skills installed\n`);
      }
    } else {
      console.log(`   ℹ️  OpenCode directory not found: ${opencodeDir}\n`);
    }

    // List Copilot installation
    console.log("🔌 GitHub Copilot Format:");
    const copilotDir = mode === "global" ? COPILOT_GLOBAL_DIR : COPILOT_LOCAL_DIR;
    if (fs.existsSync(copilotDir)) {
      const copilotItems = listAgentsAndSkills(copilotDir);
      if (copilotItems.length > 0) {
        copilotItems.forEach(item => {
          console.log(`   📦 ${item.type.toUpperCase()} (${item.count})`);
          item.files.forEach(file => {
            console.log(`      • ${path.basename(file, ".md")}`);
          });
        });
        console.log(`   📁 Location: ${copilotDir}\n`);
      } else {
        console.log(`   ℹ️  No agents or skills installed\n`);
      }
    } else {
      console.log(`   ℹ️  Copilot directory not found: ${copilotDir}\n`);
    }

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
