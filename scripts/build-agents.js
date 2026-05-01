#!/usr/bin/env node

/**
 * @johnludlow/agents Build Script
 *
 * Generates format-specific agent and skill definitions from canonical sources:
 * - agents/*.md (canonical source) → opencode/agents/*.md (with OpenCode YAML frontmatter)
 * - agents/*.md (canonical source) → .github/agents/*.md (with Copilot YAML frontmatter)
 * - skills/*.md (canonical source) → opencode/skills/*.md (plain markdown)
 * - skills/*.md (canonical source) → .github/skills/*.md (with Copilot YAML frontmatter)
 */

const fs = require("fs");
const path = require("path");

// Permissions mapping - extracted from config.json
const AGENT_PERMISSIONS = {
  // Top-level agents (mode: agent) - user-facing, intent-locked
  "johnludlow-planner": {
    description: "Top-level planning agent. Plans only, never implements.",
    mode: "agent",
    temperature: 0.3,
    permission: {
      read: { "*": "allow" },
      edit: { "*": "deny", "docs/plans/*": "allow" },
      bash: {
        "*": "deny",
        "gh issue*": "ask",
        "gh issue view*": "allow",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
      },
      grep: { "*": "allow" },
      webfetch: "ask",
      task: {
        "*": "deny",
        "johnludlow-feature-planner": "allow",
        "johnludlow-feature-documenter": "allow",
        "johnludlow-feature-reviewer": "allow",
      },
    },
  },
  "johnludlow-implementer": {
    description: "Top-level implementation agent. Implements approved plans.",
    mode: "agent",
    temperature: 0.2,
    permission: {
      read: { "*": "allow", "*.env": "deny" },
      edit: { "*": "deny" },
      bash: {
        "*": "deny",
        "gh issue view*": "allow",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
      },
      grep: { "*": "allow" },
      webfetch: "ask",
      task: {
        "*": "deny",
        "johnludlow-feature-implementer": "allow",
        "johnludlow-feature-tester": "allow",
        "johnludlow-feature-reviewer": "allow",
      },
    },
  },
  "johnludlow-tdd-implementer": {
    description: "Top-level TDD agent. Enforces red-green-refactor cycle.",
    mode: "agent",
    temperature: 0.2,
    permission: {
      read: { "*": "allow", "*.env": "deny" },
      edit: { "*": "deny" },
      bash: {
        "*": "deny",
        "gh issue view*": "allow",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
      },
      grep: { "*": "allow" },
      webfetch: "ask",
      task: {
        "*": "deny",
        "johnludlow-feature-tester": "allow",
        "johnludlow-feature-implementer": "allow",
        "johnludlow-feature-reviewer": "allow",
      },
    },
  },
  "johnludlow-documenter": {
    description: "Top-level documentation agent. Documents only, never implements.",
    mode: "agent",
    temperature: 0.2,
    permission: {
      read: { "*": "allow" },
      edit: { "*": "deny" },
      bash: {
        "*": "deny",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
      },
      grep: { "*": "allow" },
      webfetch: "ask",
      task: {
        "*": "deny",
        "johnludlow-feature-documenter": "allow",
        "johnludlow-feature-reviewer": "allow",
      },
    },
  },
  "johnludlow-tester": {
    description: "Top-level testing agent. Runs tests and reports results.",
    mode: "agent",
    temperature: 0.2,
    permission: {
      read: { "*": "allow", "*.env": "deny" },
      edit: { "*": "deny" },
      bash: {
        "*": "deny",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
      },
      grep: { "*": "allow" },
      webfetch: "ask",
      task: {
        "*": "deny",
        "johnludlow-feature-tester": "allow",
        "johnludlow-feature-reviewer": "allow",
      },
    },
  },
  // Sub-agents (mode: subagent) - delegated to by top-level agents
  "johnludlow-feature-planner": {
    description: "Plans features and creates detailed implementation plans",
    mode: "subagent",
    temperature: 0.3,
    permission: {
      read: { "*": "allow" },
      edit: { "*": "deny", "docs/plans/*": "allow" },
      bash: {
        "*": "deny",
        "gh issue*": "ask",
        "gh issue view*": "allow",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
        "rumdl check*": "allow",
      },
      grep: { "*": "allow" },
      webfetch: "ask",
      task: { "*": "deny" },
    },
  },
  "johnludlow-feature-implementer": {
    description: "Implements features and makes code changes",
    mode: "subagent",
    temperature: 0.2,
    permission: {
      read: { "*": "allow", "*.env": "deny" },
      edit: {
        "*": "deny",
        "src/**": "allow",
        "lib/**": "allow",
        "components/**": "allow",
        "*.ts": "allow",
        "*.tsx": "allow",
        "*.cs": "allow",
        "*.cpp": "allow",
        "*.h": "allow",
      },
      bash: {
        "*": "deny",
        "gh issue view*": "allow",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
        "npm run build*": "allow",
        "npm run test*": "allow",
        "npm run lint*": "allow",
        "dotnet build*": "allow",
        "dotnet test*": "allow",
        "cargo build*": "allow",
        "cargo test*": "allow",
      },
      grep: { "*": "allow" },
      lsp: "allow",
      webfetch: "ask",
    },
  },
  "johnludlow-feature-documenter": {
    description: "Writes and maintains project documentation",
    mode: "subagent",
    temperature: 0.2,
    permission: {
      read: { "*": "allow" },
      edit: {
        "*": "deny",
        "docs/**": "allow",
        "docs/plans/*": "allow",
        "README.md": "allow",
        "*.md": "ask",
      },
      bash: {
        "*": "deny",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
        "rumdl check*": "allow",
      },
      grep: { "*": "allow" },
      webfetch: "ask",
      task: { "*": "deny" },
    },
  },
  "johnludlow-feature-tester": {
    description: "Tests features and reports results",
    mode: "subagent",
    temperature: 0.2,
    permission: {
      read: { "*": "allow", "*.env": "deny" },
      edit: { "*": "deny" },
      bash: {
        "*": "deny",
        "npm test*": "allow",
        "npm run test*": "allow",
        "dotnet test*": "allow",
        "cargo test*": "allow",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
      },
      grep: { "*": "allow" },
      webfetch: "ask",
    },
  },
  "johnludlow-feature-reviewer": {
    description: "Adversarial reviewer. Read-only quality gate for all agents.",
    mode: "subagent",
    temperature: 0.4,
    permission: {
      read: { "*": "allow" },
      edit: { "*": "deny" },
      bash: {
        "*": "deny",
        "git log*": "allow",
        "git status*": "allow",
        "git branch*": "allow",
        "git diff*": "allow",
        "rumdl check*": "allow",
      },
      grep: { "*": "allow" },
      webfetch: "deny",
      task: { "*": "deny" },
    },
  },
};

/**
 * Generate YAML frontmatter for OpenCode format
 */
function generateOpenCodeFrontmatter(agentName) {
  const config = AGENT_PERMISSIONS[agentName];
  if (!config) {
    console.warn(`⚠️  No permission config found for ${agentName}`);
    return "";
  }

  const yamlLines = [
    "---",
    `description: ${config.description}`,
    `mode: ${config.mode}`,
    `temperature: ${config.temperature}`,
    "permission:",
  ];

  // Add permissions
  for (const [key, value] of Object.entries(config.permission)) {
    if (typeof value === "string") {
      yamlLines.push(`  ${key}: ${value}`);
    } else if (typeof value === "object") {
      yamlLines.push(`  ${key}:`);
      for (const [k, v] of Object.entries(value)) {
        if (k === "*") {
          yamlLines.push(`    "*": ${v}`);
        } else {
          yamlLines.push(`    "${k}": ${v}`);
        }
      }
    }
  }

  yamlLines.push("---");
  return yamlLines.join("\n");
}

/**
 * Generate YAML frontmatter for Copilot CLI format
 * 
 * Copilot CLI uses a simplified frontmatter format with:
 * - description: brief description of the agent
 * - temperature: model temperature (0-1)
 */
function generateCopilotFrontmatter(agentName) {
  const config = AGENT_PERMISSIONS[agentName];
  if (!config) {
    console.warn(`⚠️  No permission config found for ${agentName}`);
    return "";
  }

  const yamlLines = [
    "---",
    `description: ${config.description}`,
    `temperature: ${config.temperature}`,
    "---",
  ];

  return yamlLines.join("\n");
}

const COPILOT_SKILL_DESCRIPTIONS = {
  "johnludlow-markdown-standards": "Markdown and documentation standards (rumdl, structure, links, code blocks)",
  "johnludlow-code-quality": "Code quality standards across C#, TypeScript, and C++ (SOLID, testing, performance)",
};

function generateCopilotSkillFrontmatter(skillName) {
  let description = COPILOT_SKILL_DESCRIPTIONS[skillName];
  if (!description) {
    console.warn(`⚠️  No Copilot skill description found for ${skillName}; using fallback`);
    description = `Skill: ${skillName}`;
  }

  const yamlLines = ["---", `description: ${description}`, "---"];
  return yamlLines.join("\n");
}

/**
 * Build OpenCode agent definitions from canonical source
 */
function buildOpenCodeAgents() {
  console.log("📦 Building OpenCode agent definitions...");

  const sourceDir = path.join(__dirname, "..", "agents");
  const targetDir = path.join(__dirname, "..", "opencode", "agents");

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const agentFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));

  agentFiles.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    const agentName = path.basename(file, ".md");

    // Read canonical source
    const content = fs.readFileSync(sourcePath, "utf8");

    // Generate OpenCode version with frontmatter
    const frontmatter = generateOpenCodeFrontmatter(agentName);
    const opencodeContent = `${frontmatter}\n\n${content}`;

    // Write to OpenCode directory
    fs.writeFileSync(targetPath, opencodeContent);
    console.log(`  ✓ Generated ${file}`);
  });

  console.log(`✓ OpenCode agent definitions built to ${targetDir}\n`);
}

/**
 * Build Copilot agent definitions from canonical source
 * 
 * Generates agents with Copilot CLI-compatible YAML frontmatter
 * containing description and temperature settings
 */
function buildCopilotAgents() {
  console.log("🔌 Building GitHub Copilot agent definitions...");

  const sourceDir = path.join(__dirname, "..", "agents");
  const targetDir = path.join(__dirname, "..", ".github", "agents");

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const agentFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));

  agentFiles.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    const agentName = path.basename(file, ".md");

    // Read canonical source
    const content = fs.readFileSync(sourcePath, "utf8");

    // Generate Copilot version with frontmatter
    const frontmatter = generateCopilotFrontmatter(agentName);
    const copilotContent = `${frontmatter}\n\n${content}`;

    // Write to Copilot directory
    fs.writeFileSync(targetPath, copilotContent);
    console.log(`  ✓ Generated ${file}`);
  });

  console.log(`✓ Copilot agent definitions built to ${targetDir}\n`);
}

/**
 * Build OpenCode skill definitions from canonical source
 */
function buildOpenCodeSkills() {
  console.log("📚 Building OpenCode skill definitions...");

  const sourceDir = path.join(__dirname, "..", "skills");
  const targetDir = path.join(__dirname, "..", "opencode", "skills");

  // Ensure source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.log(`  ℹ️  No skills directory found at ${sourceDir}`);
    return;
  }

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const skillFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));

  if (skillFiles.length === 0) {
    console.log("  ℹ️  No skill files found");
    return;
  }

  skillFiles.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);

    // Read canonical source
    const content = fs.readFileSync(sourcePath, "utf8");

    // Copy as-is for OpenCode (plain markdown)
    fs.writeFileSync(targetPath, content);
    console.log(`  ✓ Generated ${file}`);
  });

  console.log(`✓ OpenCode skill definitions built to ${targetDir}\n`);
}

/**
 * Build Copilot skill definitions from canonical source
 */
function buildCopilotSkills() {
  console.log("🔌 Building GitHub Copilot skill definitions...");

  const sourceDir = path.join(__dirname, "..", "skills");
  const targetDir = path.join(__dirname, "..", ".github", "skills");

  // Ensure source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.log(`  ℹ️  No skills directory found at ${sourceDir}`);
    return;
  }

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const skillFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));

  if (skillFiles.length === 0) {
    console.log("  ℹ️  No skill files found");
    return;
  }

  skillFiles.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    const skillName = path.basename(file, ".md");

    // Read canonical source
    const content = fs.readFileSync(sourcePath, "utf8");

    // Generate Copilot version with simplified frontmatter
    const frontmatter = generateCopilotSkillFrontmatter(skillName);
    const copilotContent = `${frontmatter}\n\n${content}`;

    fs.writeFileSync(targetPath, copilotContent);
    console.log(`  ✓ Generated ${file}`);
  });

  console.log(`✓ Copilot skill definitions built to ${targetDir}\n`);
}

/**
 * Main build function
 */
function build() {
  try {
    console.log("🔨 Building @johnludlow/agents agent and skill definitions\n");

    buildOpenCodeAgents();
    buildCopilotAgents();
    buildOpenCodeSkills();
    buildCopilotSkills();

    console.log("✨ Build complete!");
    console.log("\n📁 Generated files:");
    console.log(`  - opencode/agents/*.md (with OpenCode YAML frontmatter)`);
    console.log(`  - opencode/skills/*.md (plain markdown)`);
    console.log(`  - .github/agents/*.md (with Copilot YAML frontmatter)`);
    console.log(`  - .github/skills/*.md (with Copilot YAML frontmatter)`);
  } catch (error) {
    console.error("\n❌ Build failed:");
    console.error(error.message);
    process.exit(1);
  }
}

// Run build if this is being executed directly
if (require.main === module) {
  build();
}

module.exports = { buildOpenCodeAgents, buildCopilotAgents, buildOpenCodeSkills, buildCopilotSkills };
