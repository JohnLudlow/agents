#!/usr/bin/env node

/**
 * @johnludlow/agents Build Script
 *
 * Generates format-specific agent and skill definitions from canonical sources:
 * - agents/*.md (canonical source) → opencode/agents/*.md (with OpenCode YAML frontmatter)
 * - agents/*.md (canonical source) → .github/agents/*.md (with Copilot YAML frontmatter)
 * - agents/*.md (canonical source) → kiro/agents/*.json + kiro/agents/*.md (Kiro CLI JSON config + IDE markdown prompt)
 * - skills/*.md (canonical source) → opencode/skills/*.md (plain markdown)
 * - skills/*.md (canonical source) → .github/skills/*.md (with Copilot YAML frontmatter)
 * - skills/*.md (canonical source) → kiro/skills/*.md (Kiro skills)
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
// KIRO BUILD FUNCTIONS
// ============================================================================

// (No tool-name mapping table needed here; the Kiro tool names are emitted directly below.)

/**
 * Map our permission object to Kiro toolsSettings.
 * @param {object} permission - the permission object from the sidecar
 * @returns {object} toolsSettings for Kiro
 */
function mapPermissionToToolsSettings(permission) {
  const toolsSettings = {};

  // Map read permission → fs_read allowedPaths
  // Map read permission → fs_read allowedPaths
  if (permission.read) {
    const allowedPaths = [];
    const deniedPaths = [];
    let allowAll = false;

    for (const [pattern, action] of Object.entries(permission.read)) {
      if (pattern === "*" && action === "allow") {
        allowAll = true;
        continue;
      }

      const converted = convertGlobToPath(pattern);
      if (!converted) continue;

      if (action === "deny") {
        deniedPaths.push(converted);
      } else if (action === "allow" && !allowAll) {
        allowedPaths.push(converted);
      }
    }

    if (allowAll) {
      allowedPaths.length = 0;
      allowedPaths.push("**");
    }

    if (allowedPaths.length > 0 || deniedPaths.length > 0) {
      toolsSettings.fs_read = {};
      if (allowedPaths.length > 0) toolsSettings.fs_read.allowedPaths = allowedPaths;
      if (deniedPaths.length > 0) toolsSettings.fs_read.deniedPaths = deniedPaths;
    }
  }
    if (allowedPaths.length > 0 || deniedPaths.length > 0) {
      toolsSettings.fs_read = {};
      if (allowedPaths.length > 0) toolsSettings.fs_read.allowedPaths = allowedPaths;
      if (deniedPaths.length > 0) toolsSettings.fs_read.deniedPaths = deniedPaths;
    }
  }

  // Map edit permission → fs_write allowedPaths
  if (permission.edit) {
    const allowedPaths = [];
    const deniedPaths = [];
    for (const [pattern, action] of Object.entries(permission.edit)) {
      if (pattern === "*" && action === "allow") {
        allowedPaths.length = 0;
        allowedPaths.push("**");
        break;
      } else if (action === "allow") {
        const converted = convertGlobToPath(pattern);
        if (converted) allowedPaths.push(converted);
      } else if (action === "deny") {
        const converted = convertGlobToPath(pattern);
        if (converted) deniedPaths.push(converted);
      }
    }
    if (allowedPaths.length > 0 || deniedPaths.length > 0) {
      toolsSettings.fs_write = {};
      if (allowedPaths.length > 0) toolsSettings.fs_write.allowedPaths = allowedPaths;
      if (deniedPaths.length > 0) toolsSettings.fs_write.deniedPaths = deniedPaths;
    }
  }

  // Map bash/shell permission → shell allowedCommands
  if (permission.bash) {
    const allowedCommands = [];
    const deniedCommands = [];
    for (const [cmd, action] of Object.entries(permission.bash)) {
      // Convert cmd pattern (e.g., "git log*" → "git log*")
      if (action === "allow") {
        allowedCommands.push(cmd);
      } else if (action === "deny") {
        deniedCommands.push(cmd);
      }
    }
    if (allowedCommands.length > 0 || deniedCommands.length > 0) {
      toolsSettings.shell = {};
      if (allowedCommands.length > 0) toolsSettings.shell.allowedCommands = allowedCommands;
      if (deniedCommands.length > 0) toolsSettings.shell.deniedCommands = deniedCommands;
    }
  }

  // Map grep permission → grep_search allowedPaths
  if (permission.grep) {
    const allowedPaths = [];
    for (const [pattern, action] of Object.entries(permission.grep)) {
      if (pattern === "*" && action === "allow") {
        allowedPaths.length = 0;
        allowedPaths.push("**");
        break;
      }
      if (action === "allow") {
        const converted = convertGlobToPath(pattern);
        if (converted) allowedPaths.push(converted);
      }
    }
    if (allowedPaths.length > 0) {
      toolsSettings.grep_search = { allowedPaths };
    }
  }

  // Map lsp permission
  if (permission.lsp) {
    toolsSettings.lsp = { enabled: permission.lsp === "allow" || permission.lsp === true };
  }

  // Map webfetch permission
  if (permission.webfetch) {
    const enabled = permission.webfetch !== "deny";
    toolsSettings.web_fetch = { enabled };
    toolsSettings.web_search = { enabled };
  }

  return toolsSettings;
}

/**
 * Convert glob patterns to path patterns for Kiro.
 * E.g., "docs/plans/*" → "docs/plans/**", "*.env" → "*.env"
 */
function convertGlobToPath(pattern) {
  if (!pattern) return null;
  // If it ends with /*, convert to /** for directory matching
  if (pattern.endsWith("/*")) {
    return pattern.slice(0, -1) + "**";
  }
  return pattern;
}

/**
 * Determine allowedTools based on permission keys present.
 * @param {object} permission - the permission object
 * @returns {string[]} array of tool names that don't require prompting
 */
function determineAllowedTools(permission) {
  const tools = [];
  
  // If read has "*": "allow", add fs_read
  if (permission.read && permission.read["*"] === "allow") {
    tools.push("fs_read");
  }
  
  // If edit has "*": "allow", add fs_write
  if (permission.edit && permission.edit["*"] === "allow") {
    tools.push("fs_write");
  }
  
  // If bash has "*": "allow", add shell
  if (permission.bash && permission.bash["*"] === "allow") {
    tools.push("shell");
  }
  
  // If grep has "*": "allow", add grep_search
  if (permission.grep && permission.grep["*"] === "allow") {
    tools.push("grep_search");
  }
  
  // If lsp is allow, add lsp
  if (permission.lsp === "allow") {
    tools.push("lsp");
  }
  
  // If webfetch is allow, add web tools
  if (permission.webfetch === "allow") {
    tools.push("web_fetch");
    tools.push("web_search");
    tools.push("remote_web_search");
  }
  
  // If task is present with any "*": "allow", add invoke_sub_agent
  if (permission.task && permission.task["*"] === "allow") {
    tools.push("invoke_sub_agent");
  }
  
  return tools;
}

/**
 * Determine all tools the agent can use (for tools array).
 * @param {object} permission - the permission object
 * @returns {string[]} array of tool names
 */
function determineTools(permission) {
  const tools = [];
  
  if (permission.read) tools.push("fs_read");
  if (permission.edit || permission.write) tools.push("fs_write");
  if (permission.bash) tools.push("shell");
  if (permission.grep || permission.search) tools.push("grep_search");
  if (permission.lsp) tools.push("lsp");
  if (permission.webfetch && permission.webfetch !== "deny") {
    tools.push("web_fetch");
    tools.push("web_search");
    tools.push("remote_web_search");
  }
  if (permission.task) tools.push("invoke_sub_agent");
  
  return tools;
}

/**
 * Build Kiro agent definitions (both CLI and IDE formats).
 * Generates into a single kiro/ directory:
 * - kiro/agents/{name}.json - Kiro CLI configuration
 * - kiro/agents/{name}.md - Agent prompt with YAML frontmatter (works for both CLI and IDE)
 * 
 * Kiro CLI reads the .json files, Kiro IDE reads .md files with frontmatter.
 */
function buildKiroAgents() {
  console.log("🧠 Building Kiro agent definitions (CLI + IDE)...\n");

  const sourceDir = path.join(__dirname, "..", "agents");
  const targetDir = path.join(__dirname, "..", "kiro", "agents");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const agentFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));

  let generated = 0;
  agentFiles.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const agentName = path.basename(file, ".md");

    // Load the standard config (contains permission, description, etc.)
    const config = loadConfig(agentName, sourceDir, "agent");
    if (!config) {
      console.warn(`  ⚠️  Skipping ${file} - missing or invalid config`);
      return;
    }

    // Read the canonical markdown content
    const content = fs.readFileSync(sourcePath, "utf8");

    // Auto-map permission to Kiro toolsSettings
    const toolsSettings = mapPermissionToToolsSettings(config.permission || {});
    
    // Determine allowedTools and all available tools
    const allowedTools = determineAllowedTools(config.permission || {});
    const tools = determineTools(config.permission || {});

    // === Generate JSON config file for Kiro CLI ===
    const jsonConfig = {
      name: agentName,
      description: config.description,
      prompt: `./${agentName}.md`,
      tools,
      allowedTools: allowedTools,
    };
    };

    // Add toolsSettings if there are any path/command restrictions
    if (Object.keys(toolsSettings).length > 0) {
      jsonConfig.toolsSettings = toolsSettings;
    }

    const jsonPath = path.join(targetDir, `${agentName}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonConfig, null, 2));

    // === Generate markdown file with YAML frontmatter for Kiro IDE ===
    const yamlLines = [
      "---",
      `name: ${yamlQuote(agentName)}`,
      `description: ${yamlQuote(config.description)}`,
    ];

    // Add tools
    if (tools.length > 0) {
      yamlLines.push("tools:");
      tools.forEach(t => yamlLines.push(`  - ${t}`));
    }

    // Add allowedTools
    if (allowedTools.length > 0) {
      yamlLines.push("allowedTools:");
      allowedTools.forEach(t => yamlLines.push(`  - ${t}`));
    }

    // Add toolsSettings as YAML
    if (Object.keys(toolsSettings).length > 0) {
      yamlLines.push("toolsSettings:");
      for (const [tool, settings] of Object.entries(toolsSettings)) {
        yamlLines.push(`  ${tool}:`);
        if (settings.allowedPaths) {
          yamlLines.push("    allowedPaths:");
          settings.allowedPaths.forEach(p => yamlLines.push(`      - ${yamlQuote(p)}`));
        }
        if (settings.deniedPaths) {
          yamlLines.push("    deniedPaths:");
          settings.deniedPaths.forEach(p => yamlLines.push(`      - ${yamlQuote(p)}`));
        }
        if (settings.allowedCommands) {
          yamlLines.push("    allowedCommands:");
          settings.allowedCommands.forEach(c => yamlLines.push(`      - ${yamlQuote(c)}`));
        }
        if (settings.deniedCommands) {
          yamlLines.push("    deniedCommands:");
          settings.deniedCommands.forEach(c => yamlLines.push(`      - ${yamlQuote(c)}`));
        }
        if (settings.enabled !== undefined) {
          yamlLines.push(`    enabled: ${settings.enabled}`);
        }
      }
    }

    yamlLines.push("---");

    const mdPath = path.join(targetDir, `${agentName}.md`);
    fs.writeFileSync(mdPath, `${yamlLines.join("\n")}\n\n${content}`);

    console.log(`  ✓ Generated ${agentName}.json + ${agentName}.md`);
    generated++;
  });

  console.log(`✓ Kiro agent definitions built to ${targetDir} (${generated} agents)\n`);
}

/**
 * Build Kiro IDE agent definitions from canonical source.
 * Generates:
 * - kiro-ide/agents/{name}.md - Kiro IDE format with YAML frontmatter
 */
function buildKiroIdeAgents() {
  console.log("🧠 Building Kiro IDE agent definitions...");

  const sourceDir = path.join(__dirname, "..", "agents");
  const targetDir = path.join(__dirname, "..", "kiro-ide", "agents");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const agentFiles = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));

  let generated = 0;
  agentFiles.forEach((file) => {
    const sourcePath = path.join(sourceDir, file);
    const agentName = path.basename(file, ".md");

    // Load the standard config
    const config = loadConfig(agentName, sourceDir, "agent");
    if (!config) {
      console.warn(`  ⚠️  Skipping ${file} - missing or invalid config`);
      return;
    }

    // Read the canonical markdown content
    const content = fs.readFileSync(sourcePath, "utf8");

    // Auto-map permission to Kiro toolsSettings
    const toolsSettings = mapPermissionToToolsSettings(config.permission || {});
    
    // Determine allowedTools and all available tools
    const allowedTools = determineAllowedTools(config.permission || {});
    const tools = determineTools(config.permission || {});

    // Generate YAML frontmatter for Kiro IDE
    const yamlLines = [
      "---",
      `name: ${yamlQuote(agentName)}`,
      `description: ${yamlQuote(config.description)}`,
    ];

    // Add tools (map our tool names to Kiro's tool names)
    if (tools.length > 0) {
      yamlLines.push("tools:");
      tools.forEach(t => yamlLines.push(`  - ${t}`));
    }

    // Add allowedTools
    if (allowedTools.length > 0) {
      yamlLines.push("allowedTools:");
      allowedTools.forEach(t => yamlLines.push(`  - ${t}`));
    }

    // Add toolsSettings as YAML
    if (Object.keys(toolsSettings).length > 0) {
      yamlLines.push("toolsSettings:");
      for (const [tool, settings] of Object.entries(toolsSettings)) {
        yamlLines.push(`  ${tool}:`);
        if (settings.allowedPaths) {
          yamlLines.push("    allowedPaths:");
          settings.allowedPaths.forEach(p => yamlLines.push(`      - ${yamlQuote(p)}`));
        }
        if (settings.deniedPaths) {
          yamlLines.push("    deniedPaths:");
          settings.deniedPaths.forEach(p => yamlLines.push(`      - ${yamlQuote(p)}`));
        }
        if (settings.allowedCommands) {
          yamlLines.push("    allowedCommands:");
          settings.allowedCommands.forEach(c => yamlLines.push(`      - ${yamlQuote(c)}`));
        }
        if (settings.deniedCommands) {
          yamlLines.push("    deniedCommands:");
          settings.deniedCommands.forEach(c => yamlLines.push(`      - ${yamlQuote(c)}`));
        }
        if (settings.enabled !== undefined) {
          yamlLines.push(`    enabled: ${settings.enabled}`);
        }
      }
    }

    yamlLines.push("---");

    const mdPath = path.join(targetDir, `${agentName}.md`);
    fs.writeFileSync(mdPath, `${yamlLines.join("\n")}\n\n${content}`);

    console.log(`  ✓ Generated ${agentName}.md`);
    generated++;
  });

  console.log(`✓ Kiro IDE agent definitions built to ${targetDir} (${generated} agents)\n`);
}

/**
 * Build Kiro skill definitions (for both CLI and IDE).
 * Generates into a single kiro/skills directory.
 * Kiro CLI and IDE both read plain markdown skills from the same location.
 */
function buildKiroSkills() {
  console.log("🧠 Building Kiro skill definitions...");

  const sourceDir = path.join(__dirname, "..", "skills");
  const targetDir = path.join(__dirname, "..", "kiro", "skills");

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

  console.log(`✓ Kiro skill definitions built to ${targetDir}\n`);
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

    // Kiro config is auto-generated from permission mapping, no validation needed

    buildOpenCodeAgents();
    buildCopilotAgents();
    buildKiroAgents();
    buildOpenCodeSkills();
    buildCopilotSkills();
    buildKiroSkills();

    console.log("✨ Build complete!");
    console.log("\n📁 Generated files:");
    console.log(`  - opencode/agents/*.md (with OpenCode YAML frontmatter)`);
    console.log(`  - opencode/skills/*.md (plain markdown)`);
    console.log(`  - .github/agents/*.md (with Copilot YAML frontmatter)`);
    console.log(`  - .github/skills/*.md (with Copilot YAML frontmatter)`);
    console.log(`  - kiro/agents/*.json + kiro/agents/*.md (Kiro CLI + IDE, same directory)`);
    console.log(`  - kiro/skills/*.md (Kiro skills)`);
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

module.exports = {
  buildOpenCodeAgents,
  buildCopilotAgents,
  buildOpenCodeSkills,
  buildCopilotSkills,
  buildKiroAgents,
  buildKiroSkills,
  loadConfig,
};
