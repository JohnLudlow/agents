#!/usr/bin/env node

/**
 * @johnludlow/agents GitHub Copilot Config Generator
 *
 * Generates a Copilot path mapping file from APM-native agent/skill sources.
 */

const fs = require("fs");
const path = require("path");

const APM_DIRS = {
  agents: path.join(__dirname, "..", ".apm", "agents"),
  skills: path.join(__dirname, "..", ".apm", "skills")
};
const OUTPUT_DIR = path.join(__dirname, "..", ".github");

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getApmAgents() {
  if (!fs.existsSync(APM_DIRS.agents)) {
    return [];
  }

  return fs.readdirSync(APM_DIRS.agents)
    .filter(file => file.endsWith(".agent.md"))
    .sort()
    .map(file => ({
      name: file.replace(".agent.md", ""),
      path: `./.apm/agents/${file}`
    }));
}

function getApmSkills() {
  if (!fs.existsSync(APM_DIRS.skills)) {
    return [];
  }

  return fs.readdirSync(APM_DIRS.skills)
    .filter(entry => {
      const skillPath = path.join(APM_DIRS.skills, entry, "SKILL.md");
      return fs.existsSync(skillPath);
    })
    .sort()
    .map(skillName => ({
      name: skillName,
      path: `./.apm/skills/${skillName}/SKILL.md`
    }));
}

/**
 * Generate Copilot configuration
 */
function generateCopilotConfig() {
  console.log("\n  → Generating Copilot configuration file...");

  const agents = getApmAgents();
  const skills = getApmSkills();

  if (agents.length === 0 && skills.length === 0) {
    console.log("    ℹ️  No agents or skills found to configure");
    return;
  }

  // Create configuration comment for .github/copilot-config.yml or similar
  const configTemplate = `# GitHub Copilot Configuration for @johnludlow/agents
# 
# This file should be copied to your repository's .github/copilot/config.yml
# and configured according to GitHub Copilot documentation.
#
# Agents:
${agents.map(a => `#   - ${a.name}: ${a.path}`).join("\n")}
#
# Skills:
${skills.map(s => `#   - ${s.name}: ${s.path}`).join("\n")}
#
# See https://github.com/github/copilot-cli for more information.
`;

  const configPath = path.join(OUTPUT_DIR, "copilot-agents.txt");
  fs.writeFileSync(configPath, configTemplate);

  console.log(`    ✓ Generated: ${configPath}`);
  console.log(`      - ${agents.length} agent(s) referenced`);
  console.log(`      - ${skills.length} skill(s) referenced`);
}

/**
 * Main generation function
 */
function generate() {
  try {
    console.log("🔄 @johnludlow/agents Copilot Config Generator");
    console.log("==============================================\n");
    ensureDir(OUTPUT_DIR);
    generateCopilotConfig();

    console.log("\n✨ Generation complete!");
    console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
    console.log("\n📚 Next steps:");
    console.log("   1. Review .github/copilot-agents.txt");
    console.log("   2. Configure agents and skills in your GitHub Copilot settings");
    console.log("   3. See: https://github.com/features/copilot for documentation");

  } catch (error) {
    console.error("\n❌ Generation failed:");
    console.error(error.message);
    process.exit(1);
  }
}

// Run generation if this is being executed directly
if (require.main === module) {
  generate();
}

module.exports = { generate, generateCopilotConfig };
