#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// Minimal YAML parser - extracts agent config blocks from markdown
function extractYamlFromMarkdown(text, agentKey) {
  // Remove code blocks first (to avoid matching placeholders)
  let cleanText = text.replace(/```[\s\S]*?```/g, "");

  // Look for the agent key in the text, then extract the YAML block
  // Pattern: `agentKey:` followed by indented lines until next key or end
  const pattern = new RegExp(
    `^${agentKey}:\\s*(?:\\r?\\n)?((?:^  .+$(?:\\r?\\n)?)*)?`,
    "m"
  );

  const match = cleanText.match(pattern);
  if (!match) return null;

  const yamlBlock = `${agentKey}:\n${match[1] || ""}`;
  return yamlBlock;
}

// Model name recognition used by jl_subagent_models validation.
const recognizedModelPatterns = [
  /^claude-[a-z0-9.-]+$/i,
  /^gpt-[a-z0-9.-]+$/i,
  /^gemini-[a-z0-9.-]+$/i,
  /^grok-[a-z0-9.-]+$/i,
  /^kimi-[a-z0-9.-]+$/i,
  /^mai-[a-z0-9.-]+$/i,
];

const explicitRecognizedModels = new Set([
  "claude-sonnet-5",
  "claude-opus-4.5",
  "gpt-4-turbo",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
]);

function isRecognizedModelName(modelName) {
  if (typeof modelName !== "string" || modelName.trim() === "") {
    return false;
  }

  if (explicitRecognizedModels.has(modelName)) {
    return true;
  }

  return recognizedModelPatterns.some((pattern) => pattern.test(modelName));
}

function validateSubagentModels(config) {
  if (!("jl_subagent_models" in config)) {
    return { errors: [], warnings: [] };
  }

  const errors = [];
  const warnings = [];
  const cfg = config.jl_subagent_models;

  if (typeof cfg !== "object" || cfg === null || Array.isArray(cfg)) {
    errors.push("jl_subagent_models must be an object");
    return { errors, warnings };
  }

  const allowedTopLevelKeys = new Set([
    "default",
    "research",
    "implementation",
    "test_generation",
    "documentation",
    "overrides",
  ]);

  for (const key of Object.keys(cfg)) {
    if (!allowedTopLevelKeys.has(key)) {
      warnings.push(`jl_subagent_models.${key}: unrecognized top-level key`);
    }
  }

  for (const key of ["default", "research", "implementation", "test_generation", "documentation"]) {
    if (!(key in cfg)) continue;
    if (typeof cfg[key] !== "string") {
      errors.push(`jl_subagent_models.${key} must be a string`);
      continue;
    }

    if (!isRecognizedModelName(cfg[key])) {
      warnings.push(`jl_subagent_models.${key}: unknown model name '${cfg[key]}'`);
    }
  }

  if ("overrides" in cfg) {
    if (typeof cfg.overrides !== "object" || cfg.overrides === null || Array.isArray(cfg.overrides)) {
      errors.push("jl_subagent_models.overrides must be an object");
    } else {
      for (const [taskKey, modelName] of Object.entries(cfg.overrides)) {
        if (typeof modelName !== "string") {
          errors.push(`jl_subagent_models.overrides.${taskKey} must be a string`);
          continue;
        }

        if (!isRecognizedModelName(modelName)) {
          warnings.push(`jl_subagent_models.overrides.${taskKey}: unknown model name '${modelName}'`);
        }
      }
    }
  }

  return { errors, warnings };
}

function validateApprovalGates(config) {
  if (!("jl_approval_gates" in config)) {
    return { errors: [], warnings: [] };
  }

  const errors = [];
  const warnings = [];
  const cfg = config.jl_approval_gates;

  if (typeof cfg !== "object" || cfg === null || Array.isArray(cfg)) {
    errors.push("jl_approval_gates must be an object");
    return { errors, warnings };
  }

  // Recognized non-boolean exceptions to the unified boolean pattern.
  const numericKeys = new Set(["test_coverage_threshold"]);

  for (const [key, value] of Object.entries(cfg)) {
    if (numericKeys.has(key)) {
      if (typeof value !== "number" || value < 0 || value > 100) {
        errors.push(`jl_approval_gates.${key} must be a number between 0 and 100`);
      }
      continue;
    }

    if (!key.endsWith("_required")) {
      warnings.push(`jl_approval_gates.${key}: unrecognized key (expected a boolean '*_required' gate)`);
      continue;
    }

    if (typeof value !== "boolean") {
      errors.push(`jl_approval_gates.${key} must be a boolean, got ${typeof value}`);
    }
  }

  return { errors, warnings };
}

function validateSubagentDelegation(config) {
  if (!("jl_subagent_delegation" in config)) {
    return { errors: [], warnings: [] };
  }

  const errors = [];
  const warnings = [];
  const cfg = config.jl_subagent_delegation;

  if (typeof cfg !== "object" || cfg === null || Array.isArray(cfg)) {
    errors.push("jl_subagent_delegation must be an object");
    return { errors, warnings };
  }

  const allowedTopLevelKeys = new Set(["max_nesting_depth"]);

  for (const key of Object.keys(cfg)) {
    if (!allowedTopLevelKeys.has(key)) {
      warnings.push(`jl_subagent_delegation.${key}: unrecognized top-level key`);
    }
  }

  if ("max_nesting_depth" in cfg) {
    const value = cfg.max_nesting_depth;

    // Per CONTRIBUTING.md -> Subagent Delegation Depth: non-numeric or
    // non-positive values are warnings, not hard errors, because delegating
    // skills fall back to the documented default of 3 rather than failing.
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      warnings.push(
        `jl_subagent_delegation.max_nesting_depth must be a positive integer, got '${value}'; falling back to the documented default of 3`
      );
    }
  }

  return { errors, warnings };
}

// Simple YAML parser for config validation
function parseYaml(text) {
  const lines = text.split(/\r?\n/);
  const root = {};
  const stack = [{ obj: root, indent: -1 }];

  let lineNum = 0;
  for (const line of lines) {
    lineNum++;
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indentMatch = line.match(/^( *)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const trimmed = line.trim();

    // Check for invalid indentation (not multiples of 2)
    if (indent > 0 && indent % 2 !== 0) {
      return {
        error: true,
        message: `Indentation error: line ${lineNum} has ${indent} spaces (must be multiple of 2)`,
        lineNum,
      };
    }

    // Pop stack if we've decreased indentation
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    if (trimmed.includes(":")) {
      const [key, ...valueParts] = trimmed.split(":");
      const value = valueParts.join(":").trim();

      // Check for duplicate keys at this level
      if (stack[stack.length - 1].obj[key.trim()] !== undefined) {
        return {
          error: true,
          message: `Duplicate key '${key.trim()}' at line ${lineNum}`,
          lineNum,
        };
      }

      if (value === "") {
        // This is a mapping key - next indented lines are its value
        const newObj = {};
        stack[stack.length - 1].obj[key.trim()] = newObj;
        stack.push({ obj: newObj, indent });
      } else {
        // Parse the value
        let parsedValue = value;

        // Handle quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          parsedValue = value.slice(1, -1);
        } else if (value === "true") {
          parsedValue = true;
        } else if (value === "false") {
          parsedValue = false;
        } else if (!isNaN(value) && value !== "") {
          parsedValue = Number(value);
        }

        stack[stack.length - 1].obj[key.trim()] = parsedValue;
      }
    }
  }

  return { error: false, parsed: root };
}

// Validate Layer 2: Root shape (agent config key must be object)
function validateLayer2(config, agentKey) {
  if (!(agentKey in config)) {
    return { valid: true }; // Missing is not a layer 2 error
  }

  const value = config[agentKey];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      valid: false,
      error: `Config key '${agentKey}' must be an object, got ${
        Array.isArray(value) ? "array" : typeof value
      }`,
    };
  }

  return { valid: true };
}

// Validate Layer 3: Semantic validation per agent
function validateLayer3(config, agentKey) {
  if (!(agentKey in config)) {
    return { valid: true };
  }

  const cfg = config[agentKey];

  if (agentKey === "jl_quiz") {
    // Required: plan_destination
    if (!("plan_destination" in cfg)) {
      return {
        valid: false,
        error: `jl_quiz: missing required setting 'plan_destination'`,
      };
    }

    const pd = cfg.plan_destination;
    if (typeof pd !== "string") {
      return {
        valid: false,
        error: `jl_quiz.plan_destination: must be string, got ${typeof pd}`,
      };
    }

    const validPD = [
      "github_issue",
      "azure_devops_work_item",
      "local_file",
      "inline_message",
    ];
    if (!validPD.includes(pd)) {
      return {
        valid: false,
        error: `jl_quiz.plan_destination: '${pd}' is not valid. Allowed: ${validPD.join(", ")}`,
      };
    }

    // Recommended: quiz_mode
    if ("quiz_mode" in cfg) {
      const im = cfg.quiz_mode;
      if (typeof im !== "string") {
        return {
          valid: false,
          error: `jl_quiz.quiz_mode: must be string, got ${typeof im}`,
        };
      }

      if (!["a", "b"].includes(im)) {
        return {
          valid: false,
          error: `jl_quiz.quiz_mode: must be 'a' or 'b', got '${im}'`,
        };
      }
    }

    // Recommended: file_storage_location
    if ("file_storage_location" in cfg) {
      const fsl = cfg.file_storage_location;
      if (typeof fsl !== "string") {
        return {
          valid: false,
          error: `jl_quiz.file_storage_location: must be string, got ${typeof fsl}`,
        };
      }

      if (fsl === "") {
        return {
          valid: false,
          error: `jl_quiz.file_storage_location: cannot be empty string`,
        };
      }

      // Check for absolute paths
      if (fsl.startsWith("/") || /^[a-zA-Z]:/.test(fsl)) {
        return {
          valid: false,
          error: `jl_quiz.file_storage_location: cannot be absolute path (got '${fsl}')`,
        };
      }

      // Check for parent directory traversal
      if (fsl.includes("..")) {
        return {
          valid: false,
          error: `jl_quiz.file_storage_location: cannot contain '..' (got '${fsl}')`,
        };
      }
    }
  } else if (agentKey === "jl_recon") {
    // All settings are optional
    if ("decision_gates" in cfg) {
      const dg = cfg.decision_gates;
      if (typeof dg !== "object" || dg === null || Array.isArray(dg)) {
        return {
          valid: false,
          error: `jl_recon.decision_gates: must be object, got ${
            Array.isArray(dg) ? "array" : typeof dg
          }`,
        };
      }

      for (const key of ["destination_confirmation", "inciting_issue_confirmation", "research_afk"]) {
        if (key in dg) {
          if (typeof dg[key] !== "boolean") {
            return {
              valid: false,
              error: `jl_recon.decision_gates.${key}: must be boolean, got ${typeof dg[key]}`,
            };
          }
        }
      }
    }

    if ("uncertainty_tracking" in cfg) {
      const ut = cfg.uncertainty_tracking;
      if (typeof ut !== "object" || ut === null || Array.isArray(ut)) {
        return {
          valid: false,
          error: `jl_recon.uncertainty_tracking: must be object, got ${
            Array.isArray(ut) ? "array" : typeof ut
          }`,
        };
      }

      if ("pattern" in ut) {
        const pattern = ut.pattern;
        if (typeof pattern !== "string") {
          return {
            valid: false,
            error: `jl_recon.uncertainty_tracking.pattern: must be string, got ${typeof pattern}`,
          };
        }

        if (pattern === "") {
          return {
            valid: false,
            error: `jl_recon.uncertainty_tracking.pattern: cannot be empty string`,
          };
        }

        if (!pattern.match(/^#+\s/)) {
          return {
            valid: false,
            error: `jl_recon.uncertainty_tracking.pattern: must start with '#' (markdown heading), got '${pattern}'`,
          };
        }
      }
    }

    if ("model_selection" in cfg) {
      const modelSelection = cfg.model_selection;
      if (typeof modelSelection !== "object" || modelSelection === null || Array.isArray(modelSelection)) {
        return {
          valid: false,
          error: `jl_recon.model_selection: must be object, got ${
            Array.isArray(modelSelection) ? "array" : typeof modelSelection
          }`,
        };
      }

      const validModelSelectionKeys = new Set([
        "default",
        "quiz",
        "research",
        "prototype",
        "task",
        "mode2_checks",
        "mode3_checks",
      ]);

      for (const [key, value] of Object.entries(modelSelection)) {
        if (!validModelSelectionKeys.has(key)) {
          return {
            valid: false,
            error: `jl_recon.model_selection.${key}: invalid key. Allowed: ${Array.from(validModelSelectionKeys).join(", ")}`,
          };
        }

        if (typeof value !== "string") {
          return {
            valid: false,
            error: `jl_recon.model_selection.${key}: must be string, got ${typeof value}`,
          };
        }

        if (value.trim() === "") {
          return {
            valid: false,
            error: `jl_recon.model_selection.${key}: cannot be empty string`,
          };
        }

        if (value !== "inherit" && !isRecognizedModelName(value)) {
          return {
            valid: false,
            error: `jl_recon.model_selection.${key}: unknown model name '${value}' (use a recognized model or 'inherit')`,
          };
        }
      }
    }
  } else if (agentKey === "jl_issue_management") {
    // Required: plan_destination
    if (!("plan_destination" in cfg)) {
      return {
        valid: false,
        error: `jl_issue_management: missing required setting 'plan_destination'`,
      };
    }

    const pd = cfg.plan_destination;
    if (typeof pd !== "string") {
      return {
        valid: false,
        error: `jl_issue_management.plan_destination: must be string, got ${typeof pd}`,
      };
    }

    const validPD = [
      "github_issue",
      "azure_devops_work_item",
      "local_file",
      "inline_message",
    ];
    if (!validPD.includes(pd)) {
      return {
        valid: false,
        error: `jl_issue_management.plan_destination: '${pd}' is not valid. Allowed: ${validPD.join(", ")}`,
      };
    }

    // Recommended: file_storage_location
    if ("file_storage_location" in cfg) {
      const fsl = cfg.file_storage_location;
      if (typeof fsl !== "string") {
        return {
          valid: false,
          error: `jl_issue_management.file_storage_location: must be string, got ${typeof fsl}`,
        };
      }

      if (fsl === "") {
        return {
          valid: false,
          error: `jl_issue_management.file_storage_location: cannot be empty string`,
        };
      }

      if (fsl.startsWith("/") || /^[a-zA-Z]:/.test(fsl)) {
        return {
          valid: false,
          error: `jl_issue_management.file_storage_location: cannot be absolute path (got '${fsl}')`,
        };
      }

      if (fsl.includes("..")) {
        return {
          valid: false,
          error: `jl_issue_management.file_storage_location: cannot contain '..' (got '${fsl}')`,
        };
      }
    }

    // Optional: decision_gates
    if ("decision_gates" in cfg) {
      const dg = cfg.decision_gates;
      if (typeof dg !== "object" || dg === null || Array.isArray(dg)) {
        return {
          valid: false,
          error: `jl_issue_management.decision_gates: must be object, got ${
            Array.isArray(dg) ? "array" : typeof dg
          }`,
        };
      }

      for (const key of ["destination_confirmation", "inciting_issue_confirmation", "research_afk"]) {
        if (key in dg) {
          if (typeof dg[key] !== "boolean") {
            return {
              valid: false,
              error: `jl_issue_management.decision_gates.${key}: must be boolean, got ${typeof dg[key]}`,
            };
          }
        }
      }
    }
  }

  return { valid: true };
}

// Main validation function
function validateConfigFile(filePath, fileName) {
  const content = fs.readFileSync(filePath, "utf8");
  const agentKeys = [
    "jl_quiz",
    "jl_recon",
    "jl_issue_management",
    "jl_subagent_models",
    "jl_approval_gates",
    "jl_subagent_delegation",
  ];
  let hasErrors = false;
  let message = [];

  const wholeText = content.replace(/```[\s\S]*?```/g, "");
  const subagentMatch = wholeText.match(/^jl_subagent_models:\s*(?:\r?\n)((?:^  .+$(?:\r?\n)?)*)/m);
  if (subagentMatch) {
    const parseResult = parseYaml(`jl_subagent_models:\n${subagentMatch[1] || ""}`);
    if (parseResult.error) {
      hasErrors = true;
      message.push(
        `${fileName}: ${parseResult.message}\n  Fix: Check jl_subagent_models indentation and YAML syntax.`
      );
    } else {
      const subagentValidation = validateSubagentModels(parseResult.parsed);
      for (const error of subagentValidation.errors) {
        hasErrors = true;
        message.push(`${fileName}: [WARN] ${error}\n  Fix: Check jl_subagent_models schema and value types.`);
      }
      for (const warning of subagentValidation.warnings) {
        message.push(`${fileName}: [WARN] ${warning}\n  Fix: Verify the model name or key spelling.`);
      }
    }
  }

  const approvalMatch = wholeText.match(/^jl_approval_gates:\s*(?:\r?\n)((?:^  .+$(?:\r?\n)?)*)/m);
  if (approvalMatch) {
    const parseResult = parseYaml(`jl_approval_gates:\n${approvalMatch[1] || ""}`);
    if (parseResult.error) {
      hasErrors = true;
      message.push(
        `${fileName}: ${parseResult.message}\n  Fix: Check jl_approval_gates indentation and YAML syntax.`
      );
    } else {
      const approvalValidation = validateApprovalGates(parseResult.parsed);
      for (const error of approvalValidation.errors) {
        hasErrors = true;
        message.push(`${fileName}: [WARN] ${error}\n  Fix: Use a boolean true/false value for approval gates.`);
      }
      for (const warning of approvalValidation.warnings) {
        message.push(`${fileName}: [WARN] ${warning}\n  Fix: Verify the gate key spelling and naming convention.`);
      }
    }
  }

  const subagentDelegationMatch = wholeText.match(/^jl_subagent_delegation:\s*(?:\r?\n)((?:^  .+$(?:\r?\n)?)*)/m);
  if (subagentDelegationMatch) {
    const parseResult = parseYaml(`jl_subagent_delegation:\n${subagentDelegationMatch[1] || ""}`);
    if (parseResult.error) {
      hasErrors = true;
      message.push(
        `${fileName}: ${parseResult.message}\n  Fix: Check jl_subagent_delegation indentation and YAML syntax.`
      );
    } else {
      const delegationValidation = validateSubagentDelegation(parseResult.parsed);
      for (const error of delegationValidation.errors) {
        hasErrors = true;
        message.push(`${fileName}: [WARN] ${error}\n  Fix: Check jl_subagent_delegation schema and value types.`);
      }
      for (const warning of delegationValidation.warnings) {
        message.push(
          `${fileName}: [WARN] ${warning}\n  Fix: Use a positive integer for max_nesting_depth, or omit it to use the default.`
        );
      }
    }
  }

  for (const agentKey of agentKeys) {
    if (agentKey === "jl_subagent_models" || agentKey === "jl_approval_gates" || agentKey === "jl_subagent_delegation")
      continue;
    const yamlBlock = extractYamlFromMarkdown(content, agentKey);
    if (!yamlBlock) continue;

    // Layer 1: Parse YAML
    const parseResult = parseYaml(yamlBlock);
    if (parseResult.error) {
      hasErrors = true;
      message.push(
        `${fileName}: ${parseResult.message}\n  Fix: Check indentation and YAML syntax. See .apm/skills/jl-config/validation-rules.md`
      );
      continue;
    }

    const config = parseResult.parsed;

    // Layer 2: Validate shape
    const layer2Result = validateLayer2(config, agentKey);
    if (!layer2Result.valid) {
      hasErrors = true;
      message.push(
        `${fileName}: [WARN] ${agentKey}: ${layer2Result.error}\n  Fix: Ensure '${agentKey}' is an object (mapping). See .apm/skills/jl-config/validation-rules.md Layer 2`
      );
      continue;
    }

    // Layer 3: Semantic validation
    const layer3Result = validateLayer3(config, agentKey);
    if (!layer3Result.valid) {
      hasErrors = true;
      message.push(
        `${fileName}: [WARN] ${layer3Result.error}\n  Fix: Check value types and allowed values. See .apm/skills/jl-config/validation-rules.md Layer 3`
      );
    }
  }

  return { hasErrors, messages: message };
}

// Main script
const root = path.join(__dirname, "..");
const contributingPath = path.join(root, "CONTRIBUTING.md");
const agentsPath = path.join(root, "AGENTS.md");

let failed = false;

if (fs.existsSync(contributingPath)) {
  const result = validateConfigFile(contributingPath, "CONTRIBUTING.md");
  if (result.hasErrors) {
    failed = true;
    result.messages.forEach((msg) => console.error("✗", msg));
  } else {
    console.log("✓ CONTRIBUTING.md agent config is valid");
  }
} else {
  console.log("ℹ CONTRIBUTING.md not found (optional)");
}

if (fs.existsSync(agentsPath)) {
  const result = validateConfigFile(agentsPath, "AGENTS.md");
  if (result.hasErrors) {
    failed = true;
    result.messages.forEach((msg) => console.error("✗", msg));
  } else {
    console.log("✓ AGENTS.md agent config is valid");
  }
} else {
  console.log("ℹ AGENTS.md not found (optional)");
}

process.exit(failed ? 1 : 0);
