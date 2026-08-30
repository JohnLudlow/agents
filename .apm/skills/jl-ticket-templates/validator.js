"use strict";

/**
 * Validation result for a ticket template.
 *
 * @typedef {Object} ValidationResult
 * @property {boolean} valid True when no blocking validation errors were found.
 * @property {string[]} errors Blocking validation issues that must be fixed.
 * @property {string[]} warnings Non-blocking validation issues that should be reviewed.
 */

/**
 * Platform validation configuration keyed by stable platform identifier.
 *
 * Adding a new platform should only require a new configuration entry.
 *
 * @type {Record<string, { requiredFields: string[], fieldRules: Record<string, {
 *   type: "string",
 *   required?: boolean,
 *   minLength?: number,
 *   maxLength?: number,
 *   enum?: string[]
 * }> }>}
 */
const PLATFORM_RULES = {
  github: {
    requiredFields: ["title", "body"],
    fieldRules: {
      title: {
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 255,
      },
      body: {
        type: "string",
        required: true,
        minLength: 10,
      },
    },
  },
  "azure-devops": {
    requiredFields: ["title", "description", "type"],
    fieldRules: {
      title: {
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 255,
      },
      description: {
        type: "string",
        required: true,
        minLength: 10,
      },
      type: {
        type: "string",
        required: true,
        enum: ["Bug", "Feature", "Task"],
      },
    },
  },
};

/**
 * Validate a ticket template for a target platform.
 *
 * Example: Validate a GitHub issue template
 * const result = validateTemplate({
 *   title: "Bug: Cannot login",
 *   body: "Steps to reproduce..."
 * }, "github");
 * // returns { valid: true, errors: [], warnings: [] }
 *
 * @param {unknown} template Template object to validate.
 * @param {string} platform Stable platform identifier such as `github` or `azure-devops`.
 * @returns {ValidationResult} Validation result with errors and warnings.
 */
function validateTemplate(template, platform) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (typeof platform !== "string" || platform.trim() === "") {
    errors.push("Platform must be a non-empty string.");
    return buildResult(errors, warnings);
  }

  const normalizedPlatform = platform.trim().toLowerCase();
  const platformRules = PLATFORM_RULES[normalizedPlatform];

  if (!platformRules) {
    errors.push(
      `Unsupported platform '${platform}'. Supported platforms: ${Object.keys(PLATFORM_RULES).join(", ")}.`
    );
    return buildResult(errors, warnings);
  }

  if (!isPlainObject(template)) {
    errors.push(`Template for platform '${normalizedPlatform}' must be an object.`);
    return buildResult(errors, warnings);
  }

  for (const fieldName of platformRules.requiredFields) {
    if (!(fieldName in template)) {
      errors.push(`Missing required field '${fieldName}' for platform '${normalizedPlatform}'.`);
    }
  }

  for (const [fieldName, rule] of Object.entries(platformRules.fieldRules)) {
    validateField(template, fieldName, rule, normalizedPlatform, errors, warnings);
  }

  return buildResult(errors, warnings);
}

/**
 * @param {string[]} errors
 * @param {string[]} warnings
 * @returns {ValidationResult}
 */
function buildResult(errors, warnings) {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * @param {Record<string, unknown>} template
 * @param {string} fieldName
 * @param {{ type: "string", required?: boolean, minLength?: number, maxLength?: number, enum?: string[] }} rule
 * @param {string} platform
 * @param {string[]} errors
 * @param {string[]} warnings
 * @returns {void}
 */
function validateField(template, fieldName, rule, platform, errors, warnings) {
  const value = template[fieldName];

  if (value === undefined || value === null) {
    return;
  }

  if (typeof value !== rule.type) {
    errors.push(
      `Field '${fieldName}' for platform '${platform}' must be a ${rule.type}, got ${typeof value}.`
    );
    return;
  }

  const trimmedValue = value.trim();

  if (rule.required && trimmedValue.length === 0) {
    errors.push(`Field '${fieldName}' for platform '${platform}' must not be empty.`);
    return;
  }

  if (rule.minLength !== undefined && trimmedValue.length < rule.minLength) {
    errors.push(
      `Field '${fieldName}' for platform '${platform}' must be at least ${rule.minLength} characters long.`
    );
  }

  if (rule.maxLength !== undefined && trimmedValue.length > rule.maxLength) {
    errors.push(
      `Field '${fieldName}' for platform '${platform}' must be no more than ${rule.maxLength} characters long.`
    );
  }

  if (rule.enum && !rule.enum.includes(trimmedValue)) {
    errors.push(
      `Field '${fieldName}' for platform '${platform}' must be one of: ${rule.enum.join(", ")}.`
    );
  }

  if (typeof value === "string" && value !== trimmedValue) {
    warnings.push(
      `Field '${fieldName}' for platform '${platform}' has leading or trailing whitespace; consider trimming it.`
    );
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

module.exports = {
  validateTemplate,
  PLATFORM_RULES,
};
