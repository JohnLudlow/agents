#!/usr/bin/env node

/**
 * @johnludlow/agents Build Script
 *
 * Generates format-specific agent and skill definitions from canonical sources:
 * - agents/*.md (canonical source) → opencode/agents/*.md (with OpenCode YAML frontmatter)
 * - agents/*.md (canonical source) → .github/agents/*.md (with Copilot YAML frontmatter)
 * - skills/*.md (canonical source) → opencode/skills/*.md (plain markdown)
 * - skills/*.md (canonical source) → .github/skills/*.md (with Copilot YAML frontmatter)
 *
 * Per-agent/skill configuration lives in JSON sidecar files next to each markdown:
 *   agents/johnludlow-planner.json  ← description, mode, temperature, permissions
 *   skills/johnludlow-code-quality.json ← description
 */

const fs = require("fs");
const path = require("path");

// ============================================================================
// SIDECAR LOADING
// ============================================================================

/**
 * Load the JSON sidecar config for an agent or skill.
 * Returns null (with a warning) if the sidecar is missing or unparseable.
 */
/**
 * Load and validate the JSON sidecar config for an agent or skill.
 * Returns null (with warnings) if the sidecar is missing, unparseable, or has invalid fields.
 * @param {string} name - file base name (without extension)
 * @param {string} sourceDir - directory containing the sidecar
 * @param {"agent"|"skill"} type - used to determine which fields are required
 */
function loadConfig(name, sourceDir, type = "agent") {
  const jsonPath = path.join(sourceDir, `${name}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn(`⚠️  No JSON sidecar found for ${name} (expected ${jsonPath})`);
    return null;
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (err) {
    console.warn(`⚠️  Could not parse ${jsonPath}: ${err.message}`);
    return null;
  }

  const errors = [];
  if (typeof config.description !== "string" || !config.description.trim()) {
    errors.push('"description" must be a non-empty string');
  }
  if (type === "agent") {
    if (typeof config.mode !== "string") errors.push('"mode" must be a string');
    if (typeof config.temperature !== "number") errors.push('"temperature" must be a number');
    if (typeof config.permission !== "object" || config.permission === null || Array.isArray(config.permission)) {
      errors.push('"permission" must be an object');
    }
  }
  if (errors.length > 0) {
    errors.forEach((e) => console.warn(`⚠️  ${jsonPath}: ${e}`));
    return null;
  }

  return config;
}

// ============================================================================
// TEMPERATURE TEXT INJECTION
// ============================================================================

/**
 * Generate a human-readable temperature guidance block.
 * Injected into generated output so agents behave correctly on platforms
 * that do not honour the frontmatter temperature field natively.
 */
function temperatureGuidance(temperature) {
  if (temperature <= 0.1) {
    return (
      `Your temperature setting is ${temperature}. Be extremely precise and deterministic. ` +
      `Follow instructions exactly as given. Do not improvise, infer intent beyond what is ` +
      `stated, or fill in gaps. If the instructions are incomplete, stop and ask for clarification.`
    );
  }
  if (temperature <= 0.25) {
    return (
      `Your temperature setting is ${temperature}. Be precise and conservative. ` +
      `Stick closely to the provided instructions and established patterns in the codebase. ` +
      `Prefer safe, well-understood approaches over creative ones. ` +
      `If there is a gap in the instructions, report it and ask rather than guessing.`
    );
  }
  if (temperature <= 0.4) {
    return (
      `Your temperature setting is ${temperature}. Apply measured judgement. ` +
      `Follow instructions faithfully while using reasonable discretion to fill small gaps. ` +
      `Prefer conventional, well-tested solutions. ` +
      `Flag significant ambiguities rather than resolving them silently.`
    );
  }
  return (
    `Your temperature setting is ${temperature}. You may apply broader judgement and ` +
    `consider multiple approaches before choosing one. Be thoughtful and thorough, ` +
    `but still ground your reasoning in the provided instructions and codebase context.`
  );
}

// ============================================================================
// FRONTMATTER GENERATORS
// ============================================================================

/**
 * Escape a string for use as a YAML double-quoted scalar value.
 */
function yamlQuote(str) {
  return `"${String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Generate YAML frontmatter for OpenCode format.
 */
function generateOpenCodeFrontmatter(config) {
  if (!config.permission) {
    console.warn(`⚠️  Config for ${config.description ?? "unknown"} has no 'permission' field; using empty permissions`);
  }

  const yamlLines = [
    "---",
    `description: ${yamlQuote(config.description)}`,
    `mode: ${config.mode}`,
    `temperature: ${config.temperature}`,
    "permission:",
  ];

  for (const [key, value] of Object.entries(config.permission ?? {})) {
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
 * Generate YAML frontmatter for Copilot CLI format.
 *
 * Copilot CLI uses a simplified frontmatter with description and temperature.
 * Permissions and mode are not supported natively; temperature guidance is
 * injected as text into the body instead.
 */
function generateCopilotFrontmatter(config) {
  const yamlLines = [
    "---",
    `description: ${yamlQuote(config.description)}`,
    `temperature: ${config.temperature}`,
    "---",
  ];
  return yamlLines.join("\n");
}

/**
 * Generate YAML frontmatter for a Copilot skill.
 */
function generateCopilotSkillFrontmatter(config, skillName) {
  return ["---", `description: ${yamlQuote(config.description)}`, "---"].join("\n");
}

// ============================================================================
// BUILD FUNCTIONS
// ============================================================================

/**
 * Build OpenCode agent definitions from canonical source.
 * Reads config from each agent's JSON sidecar and prepends OpenCode frontmatter.
 */
function buildOpenCodeAgents() {
  console.log("📦 Building OpenCode agent definitions...");

  const sourceDir = path.join(__dirname, "..", "agents");
  const targetDir = path.join(__dirname, "..", "opencode", "agents");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const agentFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));

  agentFiles.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    const agentName = path.basename(file, ".md");

    const config = loadConfig(agentName, sourceDir, "agent");
    if (!config) throw new Error(`Missing or invalid sidecar for agent: ${agentName}`);

    const content = fs.readFileSync(sourcePath, "utf8");
    const frontmatter = generateOpenCodeFrontmatter(config);
    const guidance = temperatureGuidance(config.temperature);
    fs.writeFileSync(targetPath, `${frontmatter}\n\n${content}\n\n## Temperature Guidance\n\n${guidance}\n`);
    console.log(`  ✓ Generated ${file}`);
  });

  console.log(`✓ OpenCode agent definitions built to ${targetDir}\n`);
}

/**
 * Build Copilot agent definitions from canonical source.
 * Reads config from each agent's JSON sidecar and prepends Copilot frontmatter.
 * Temperature guidance is injected as a text block in the body.
 */
function buildCopilotAgents() {
  console.log("🔌 Building GitHub Copilot agent definitions...");

  const sourceDir = path.join(__dirname, "..", "agents");
  const targetDir = path.join(__dirname, "..", ".github", "agents");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const agentFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));

  agentFiles.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    const agentName = path.basename(file, ".md");

    const config = loadConfig(agentName, sourceDir, "agent");
    if (!config) throw new Error(`Missing or invalid sidecar for agent: ${agentName}`);

    const content = fs.readFileSync(sourcePath, "utf8");
    const frontmatter = generateCopilotFrontmatter(config);
    const guidance = temperatureGuidance(config.temperature);
    fs.writeFileSync(targetPath, `${frontmatter}\n\n${content}\n\n## Temperature Guidance\n\n${guidance}\n`);
    console.log(`  ✓ Generated ${file}`);
  });

  console.log(`✓ Copilot agent definitions built to ${targetDir}\n`);
}

/**
 * Build OpenCode skill definitions from canonical source.
 * Skills are plain markdown for OpenCode — no frontmatter added.
 */
function buildOpenCodeSkills() {
  console.log("📚 Building OpenCode skill definitions...");

  const sourceDir = path.join(__dirname, "..", "skills");
  const targetDir = path.join(__dirname, "..", "opencode", "skills");

  if (!fs.existsSync(sourceDir)) {
    console.log(`  ℹ️  No skills directory found at ${sourceDir}`);
    return;
  }

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

    const content = fs.readFileSync(sourcePath, "utf8");
    fs.writeFileSync(targetPath, content);
    console.log(`  ✓ Generated ${file}`);
  });

  console.log(`✓ OpenCode skill definitions built to ${targetDir}\n`);
}

/**
 * Build Copilot skill definitions from canonical source.
 * Reads description from each skill's JSON sidecar and prepends Copilot frontmatter.
 */
function buildCopilotSkills() {
  console.log("🔌 Building GitHub Copilot skill definitions...");

  const sourceDir = path.join(__dirname, "..", "skills");
  const targetDir = path.join(__dirname, "..", ".github", "skills");

  if (!fs.existsSync(sourceDir)) {
    console.log(`  ℹ️  No skills directory found at ${sourceDir}`);
    return;
  }

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

    const config = loadConfig(skillName, sourceDir, "skill");
    if (!config) throw new Error(`Missing or invalid sidecar for skill: ${skillName}`);

    const content = fs.readFileSync(sourcePath, "utf8");
    const frontmatter = generateCopilotSkillFrontmatter(config, skillName);
    fs.writeFileSync(targetPath, `${frontmatter}\n\n${content}`);
    console.log(`  ✓ Generated ${file}`);
  });

  console.log(`✓ Copilot skill definitions built to ${targetDir}\n`);
}

// ============================================================================
// MAIN
// ============================================================================

/**
 * Main build function
 */
function build() {
  try {
    console.log("🔨 Building @johnludlow/agents agent and skill definitions\n");

    // Pre-validate all sidecars before writing any output files.
    // This ensures a missing/invalid sidecar fails fast with a clear list of
    // problems rather than silently skipping or double-counting across outputs.
    const agentsDir = path.join(__dirname, "..", "agents");
    const skillsDir = path.join(__dirname, "..", "skills");

    const invalid = [];

    fs.readdirSync(agentsDir)
      .filter((f) => f.endsWith(".md"))
      .forEach((file) => {
        const name = path.basename(file, ".md");
        if (!loadConfig(name, agentsDir, "agent")) invalid.push(`agents/${file}`);
      });

    if (fs.existsSync(skillsDir)) {
      fs.readdirSync(skillsDir)
        .filter((f) => f.endsWith(".md"))
        .forEach((file) => {
          const name = path.basename(file, ".md");
          if (!loadConfig(name, skillsDir, "skill")) invalid.push(`skills/${file}`);
        });
    }

    if (invalid.length > 0) {
      console.error(`\n❌ Build aborted: missing or invalid JSON sidecar(s):`);
      invalid.forEach((f) => console.error(`   - ${f}`));
      console.error("\n   Add the missing .json sidecar file(s) and re-run the build.");
      process.exit(1);
    }

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
