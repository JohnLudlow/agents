#!/usr/bin/env node

/**
 * @johnludlow/agents GitHub Copilot Format Generator
 *
 * Converts OpenCode format (agents, skills) to GitHub Copilot format.
 * This ensures both environments stay in sync from a single source of truth.
 */

const fs = require("fs");
const path = require("path");

// Configuration
const SOURCE_DIRS = {
  agents: path.join(__dirname, "..", "agents"),
  skills: path.join(__dirname, "..", "skills"),
};

const OUTPUT_DIRS = {
  agents: path.join(__dirname, "..", ".github", "agents"),
  skills: path.join(__dirname, "..", ".github", "skills"),
  root: path.join(__dirname, "..", ".github"),
};

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Copy files from source to target
 */
function copyFiles(sourceDir, targetDir, filePattern = "*.md") {
  if (!fs.existsSync(sourceDir)) {
    return 0;
  }

  ensureDir(targetDir);

  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith(".md"));
  let copied = 0;

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    fs.copyFileSync(sourcePath, targetPath);
    copied++;
  }

  return copied;
}

/**
 * Generate Copilot configuration
 */
function generateCopilotConfig() {
  console.log("  → Generating Copilot configuration...");

  const agentsDir = OUTPUT_DIRS.agents;
  const skillsDir = OUTPUT_DIRS.skills;

  if (!fs.existsSync(agentsDir) && !fs.existsSync(skillsDir)) {
    console.log("    ℹ️  No agents or skills found to configure");
    return;
  }

  // Read agent definitions
  const agents = [];
  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith(".md"));
    for (const file of agentFiles) {
      agents.push({
        name: path.basename(file, ".md"),
        path: `./agents/${file}`
      });
    }
  }

  // Read skill definitions
  const skills = [];
  if (fs.existsSync(skillsDir)) {
    const skillFiles = fs.readdirSync(skillsDir).filter(f => f.endsWith(".md"));
    for (const file of skillFiles) {
      skills.push({
        name: path.basename(file, ".md"),
        path: `./skills/${file}`
      });
    }
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

  const configPath = path.join(OUTPUT_DIRS.root, "copilot-agents.txt");
  fs.writeFileSync(configPath, configTemplate);

  console.log(`    ✓ Generated Copilot configuration reference`);
}

/**
 * Main generation function
 */
function generate() {
  console.log("🔄 @johnludlow/agents Copilot Format Generator");
  console.log("==============================================\n");

  try {
    // Ensure output directories exist
    ensureDir(OUTPUT_DIRS.root);

    // Copy agents
    console.log("📋 Converting agents to Copilot format...");
    const agentsCopied = copyFiles(SOURCE_DIRS.agents, OUTPUT_DIRS.agents);
    console.log(`  ✓ Copied ${agentsCopied} agent(s)`);

    // Copy skills
    console.log("📚 Converting skills to Copilot format...");
    const skillsCopied = copyFiles(SOURCE_DIRS.skills, OUTPUT_DIRS.skills);
    console.log(`  ✓ Copied ${skillsCopied} skill(s)`);

    // Generate configuration
    generateCopilotConfig();

    console.log("\n✓ Conversion complete!");
    console.log(`\n📁 Generated files are in: ${OUTPUT_DIRS.root}`);
    console.log("\nNext steps:");
    console.log("1. Review the generated agents and skills");
    console.log("2. Configure in your GitHub Copilot settings");
    console.log("3. Test the agents and skills with Copilot CLI");

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
