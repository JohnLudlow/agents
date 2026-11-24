"use strict";

const TICKET_TYPES = Object.freeze([
  "map",
  "research",
  "prototype",
  "quiz-requirements",
  "quiz-understanding",
  "learn",
  "prerequisite",
]);

const LEGACY_TYPES = Object.freeze(["quiz", "task"]);

/**
 * Default title patterns for new tickets, keyed by `jl_recon.title_format`
 * config key (underscore spelling). See references/SHARED_BASE_SCHEMA.md.
 */
const DEFAULT_TITLE_PATTERNS = Object.freeze({
  map: "Map: {destination}",
  research: "Research: {topic}",
  prototype: "Prototype: {concept}",
  quiz_requirements: "Quiz (Requirements): {question}",
  quiz_understanding: "Quiz (Understanding): {question}",
  learn: "Learn: {topic}",
  prerequisite: "Prerequisite: {work}",
});
const STATUSES = Object.freeze(["Draft", "Ready", "In Progress", "Done", "Blocked"]);
const MAP_STATUSES = Object.freeze(["Charting", "Walked", "Completed", "Stale"]);
/**
 * Routing targets for missing requirements identified during closure review:
 * `new_ac` (a new acceptance criterion added to this ticket), `new_ticket`
 * (a follow-up ticket), or `owner` (an existing linked owner ticket).
 * See references/SHARED_BASE_SCHEMA.md ("Missing Requirements").
 */
const MISSING_REQUIREMENT_ROUTES = Object.freeze(["new_ac", "new_ticket", "owner"]);
const OVERRIDABLE_MAP_ERRORS = Object.freeze([
  "map_destination_vague",
  "map_decisions_empty_note_missing",
  "map_decision_link_missing",
  "map_fog_empty_note_missing",
  "map_fog_tag_missing",
  "map_scope_empty_note_missing",
  "map_table_empty_note_missing",
  "map_table_columns",
  "map_table_row",
  "map_frontier_status_invalid",
  "map_blocker_missing",
  "map_block_reason_missing",
]);

const REQUIRED_SECTIONS = Object.freeze({
  map: [
    ["Destination"],
    ["Notes"],
    ["Decisions So Far"],
    ["Not Yet Specified (Fog of War)", "Fog of War"],
    ["Out of Scope"],
    ["Open Tickets (Frontier)", "Open Tickets"],
    ["Blocked Tickets"],
  ],
  research: [["Investigation Goal"], ["Research Scope"]],
  prototype: [
    ["Research Question"],
    ["Implementation Approach"],
    ["Verification"],
    ["Throwaway Plan"],
  ],
  "quiz-requirements": [["Objective"], ["Decision Statement"], ["Questions"]],
  "quiz-understanding": [["Goal Model"], ["Questions"]],
  learn: [["Topic"], ["Learning Goals"], ["Resources"], ["Check Preference"]],
  prerequisite: [["Work Scope"], ["Decision Unblocked"], ["Evidence Plan"]],
});

const PLATFORM_RULES = Object.freeze({
  github: {
    requiredFields: ["title", "body"],
    fieldRules: {
      title: { type: "string", required: true, minLength: 1, maxLength: 255 },
      body: { type: "string", required: true, minLength: 10 },
    },
  },
  "azure-devops": {
    requiredFields: ["title", "description", "type"],
    fieldRules: {
      title: { type: "string", required: true, minLength: 1, maxLength: 255 },
      description: { type: "string", required: true, minLength: 10 },
      type: { type: "string", required: true, enum: ["Bug", "Feature", "Task"] },
    },
  },
});

/**
 * Validate a provider payload used to create a ticket.
 *
 * @param {unknown} template Provider payload to validate.
 * @param {string} platform Stable provider identifier.
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
function validateTemplate(template, platform) {
  const errors = [];
  const warnings = [];

  if (typeof platform !== "string" || platform.trim() === "") {
    errors.push("Platform must be a non-empty string.");
    return buildLegacyResult(errors, warnings);
  }

  const normalizedPlatform = platform.trim().toLowerCase();
  const platformRules = PLATFORM_RULES[normalizedPlatform];
  if (!platformRules) {
    errors.push(
      `Unsupported platform '${platform}'. Supported platforms: ${Object.keys(PLATFORM_RULES).join(", ")}.`
    );
    return buildLegacyResult(errors, warnings);
  }

  if (!isPlainObject(template)) {
    errors.push(`Template for platform '${normalizedPlatform}' must be an object.`);
    return buildLegacyResult(errors, warnings);
  }

  for (const fieldName of platformRules.requiredFields) {
    if (!(fieldName in template)) {
      errors.push(`Missing required field '${fieldName}' for platform '${normalizedPlatform}'.`);
    }
  }

  for (const [fieldName, rule] of Object.entries(platformRules.fieldRules)) {
    validateLegacyField(template, fieldName, rule, normalizedPlatform, errors, warnings);
  }

  return buildLegacyResult(errors, warnings);
}

/**
 * Validate a canonical ticket at creation, resolution, or historical-read time.
 *
 * Markdown input uses `frontmatter` for shared fields. GitHub input uses
 * provider-native logical fields and a readable Details section in `body`.
 *
 * @param {unknown} ticket Ticket representation.
 * @param {{provider?: "github"|"markdown", stage?: "creation"|"resolution"|"read", titleFormat?: Record<string, string>}} options
 *   `titleFormat` is the optional `jl_recon.title_format` object; titles are checked at creation only.
 * @returns {{valid: boolean, errors: ValidationIssue[], warnings: ValidationIssue[]}}
 */
function validateTicket(ticket, options = {}) {
  const errors = [];
  const warnings = [];
  const provider = options.provider ?? "github";
  const stage = options.stage ?? "creation";

  if (!isPlainObject(ticket)) {
    addIssue(errors, "root_type", "$", "Ticket must be an object.");
    return buildResult(errors, warnings);
  }

  if (!["github", "markdown"].includes(provider)) {
    addIssue(errors, "invalid_provider", "provider", "Provider must be github or markdown.");
    return buildResult(errors, warnings);
  }

  if (!["creation", "resolution", "read"].includes(stage)) {
    addIssue(errors, "invalid_stage", "stage", "Stage must be creation, resolution, or read.");
    return buildResult(errors, warnings);
  }

  const fields = provider === "markdown" ? ticket.frontmatter : ticket;
  const body = typeof ticket.body === "string" ? ticket.body : "";
  if (!isPlainObject(fields)) {
    addIssue(errors, "frontmatter_required", "frontmatter", "Markdown tickets require YAML frontmatter fields.");
    return buildResult(errors, warnings);
  }

  if (
    stage === "read" &&
    (LEGACY_TYPES.includes(fields.type) ||
      (fields.type === "map" && MAP_STATUSES.includes(fields.status)))
  ) {
    if (LEGACY_TYPES.includes(fields.type)) {
      warnings.push(issue("legacy_type", "type", `Historical '${fields.type}' tickets are read-only.`));
    }
    if (fields.type === "map" && MAP_STATUSES.includes(fields.status)) {
      warnings.push(issue("legacy_map_status", "status", "Historical Map status is preserved without migration."));
    }
    return buildResult(errors, warnings);
  }

  validateSharedFields(fields, errors);
  const type = fields.type;
  if (!TICKET_TYPES.includes(type)) {
    addIssue(
      errors,
      "invalid_type",
      "type",
      `New tickets must use one of: ${TICKET_TYPES.join(", ")}.`
    );
  }

  if (!STATUSES.includes(fields.status)) {
    addIssue(errors, "invalid_status", "status", `Status must be one of: ${STATUSES.join(", ")}.`);
  }

  // Title contract applies to new tickets only; historical titles are never checked.
  if (stage === "creation" && TICKET_TYPES.includes(type) && typeof fields.title === "string" && fields.title.trim() !== "") {
    errors.push(...validateTitleFormat(type, fields.title, options.titleFormat).errors);
  }

  if (provider === "github") {
    validateGitHubRepresentation(ticket, type, fields.status, errors);
  }

  if (type in REQUIRED_SECTIONS) {
    validateTypeSections(type, body, errors);
  }

  const criteriaSection = getSection(body, "Acceptance Criteria");
  const criteria = validateAcceptanceCriteria(criteriaSection);
  errors.push(...criteria.errors);
  if (criteria.criteria.length < (type === "map" ? 5 : 3)) {
    addIssue(
      errors,
      "criteria_count",
      "body.Acceptance Criteria",
      `${type === "map" ? "Map" : "Ticket"} requires at least ${type === "map" ? 5 : 3} acceptance criteria.`
    );
  }

  if (type === "prerequisite") {
    validatePrerequisiteScope(body, errors);
  }

  if (type === "map") {
    validateMapContent(body, errors);
    validateMapCriterionOwners(criteria.criteria, body, stage, provider, options, errors, warnings);
  }

  if (stage === "resolution") {
    const labels = provider === "github" ? ticket.labels : fields.labels;
    validateResolution(type, fields, body, ticket.resolution, errors, labels);
    if (isPlainObject(ticket.resolution) && Array.isArray(ticket.resolution.criteria) &&
      ticket.resolution.criteria.length > 0) {
      errors.push(...validateClosureReadiness(
        ticket.resolution.criteria,
        Array.isArray(ticket.resolution.rescope) ? ticket.resolution.rescope : []
      ).errors);
    }
  }

  return { ...buildResult(errors, warnings), provider, stage, type };
}

/**
 * Validate a NEW ticket title against the default pattern for its type, or a
 * configured `jl_recon.title_format` override. Checks the literal prefix (and
 * any literal suffix) and that the variable part is non-empty. Never call this
 * for historical tickets.
 *
 * An override replaces the default for that type. An override that is not a
 * non-empty string with a `{variable}` placeholder is ignored (built-in used).
 *
 * @param {string} type Ticket type, hyphen (`quiz-requirements`) or underscore spelling.
 * @param {unknown} title Proposed title.
 * @param {Record<string, string>} [overrides] `jl_recon.title_format` object.
 * @returns {{valid: boolean, errors: ValidationIssue[], pattern?: string}}
 */
function validateTitleFormat(type, title, overrides) {
  const errors = [];
  const key = typeof type === "string" ? type.replace(/-/g, "_") : "";
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_TITLE_PATTERNS, key)) {
    addIssue(errors, "title_type_unknown", "title", `No title pattern for type '${String(type)}'.`);
    return { valid: false, errors };
  }

  let pattern = DEFAULT_TITLE_PATTERNS[key];
  const override = isPlainObject(overrides) && Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : undefined;
  if (typeof override === "string" && /\{[A-Za-z_]+\}/.test(override)) {
    pattern = override;
  }

  if (typeof title !== "string" || title.trim() === "") {
    addIssue(errors, "title_empty", "title", `Title must follow '${pattern}'.`);
    return { valid: false, errors, pattern };
  }

  const match = /^([^{]*)\{[A-Za-z_]+\}([^{]*)$/.exec(pattern);
  const prefix = match ? match[1] : pattern;
  const suffix = match ? match[2] : "";
  if (!title.startsWith(prefix) || !title.endsWith(suffix) && suffix !== "") {
    addIssue(errors, "title_prefix", "title", `Title must follow '${pattern}'.`);
  } else if (title.length < prefix.length + suffix.length || title.slice(prefix.length, title.length - suffix.length).trim() === "") {
    addIssue(errors, "title_variable_missing", "title", `Title needs a value after the prefix: '${pattern}'.`);
  }
  return { valid: errors.length === 0, errors, pattern };
}

/**
 * Allow Map-content exceptions only after explicit approval and an auditable
 * provider issue comment. Call before creation for authorization, then again
 * after posting the comment to check the audit trail.
 *
 * @param {{valid: boolean, errors: ValidationIssue[], provider: string, stage: string, type: string}} validation Creation validation.
 * @param {{userApproved?: boolean, reason?: string, approvedAt?: string}} decision
 * @param {{issueUrl?: string, createdAt?: string, sourceCommentUrl?: string, sourceCommentAt?: string, body?: string}} audit
 * @returns {{allowed: boolean, audited: boolean, errors: ValidationIssue[]}}
 */
function validateCreationOverride(validation, decision = {}, audit = null) {
  const errors = [];
  if (!isPlainObject(validation) || validation.provider !== "github" ||
    validation.stage !== "creation" || validation.type !== "map" || validation.valid !== false ||
    !Array.isArray(validation.errors) || validation.errors.length === 0 ||
    validation.errors.some((entry) => !OVERRIDABLE_MAP_ERRORS.includes(entry.code))) {
    addIssue(errors, "override_not_allowed", "validation", "Only Map-content errors may be overridden.");
  }
  if (!isPlainObject(decision) || decision.userApproved !== true || typeof decision.reason !== "string" ||
    decision.reason.trim() === "" || !Number.isFinite(Date.parse(decision.approvedAt))) {
    addIssue(errors, "override_approval_missing", "decision", "Record explicit user approval, a reason, and its time.");
  }
  const allowed = errors.length === 0;
  if (allowed && audit !== null) {
    if (!isPlainObject(audit) || !isCommentUrl(audit.sourceCommentUrl) ||
      !isHttpsUrl(audit.issueUrl) ||
      !audit.sourceCommentUrl.startsWith(`${audit.issueUrl}#issuecomment-`) ||
      typeof audit.body !== "string" || !audit.body.includes(decision.reason) ||
      !Number.isFinite(Date.parse(audit.createdAt)) ||
      !Number.isFinite(Date.parse(audit.sourceCommentAt)) ||
      Date.parse(audit.createdAt) < Date.parse(decision.approvedAt) ||
      Date.parse(audit.sourceCommentAt) < Date.parse(audit.createdAt)) {
      addIssue(errors, "override_audit_missing", "audit", "Post the approval, reason, and failed checks in a separate issue comment after creation.");
    } else if (validation.errors.some((entry) => !audit.body.includes(entry.code))) {
      addIssue(errors, "override_audit_incomplete", "audit.body", "Name every overridden validation error in the issue comment.");
    }
  }
  return { allowed, audited: allowed && audit !== null && errors.length === 0, errors };
}

/**
 * Parse and validate the checklist format used for new acceptance criteria.
 *
 * @param {string} section Markdown content from an Acceptance Criteria section.
 * @returns {{valid: boolean, errors: ValidationIssue[], criteria: Array<{id: string, text: string, checked: boolean}>}}
 */
function validateAcceptanceCriteria(section) {
  const errors = [];
  const criteria = [];
  const content = stripCodeFences(typeof section === "string" ? section : "");
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    addIssue(errors, "criteria_missing", "body.Acceptance Criteria", "Acceptance Criteria must contain checklist items.");
    return { valid: false, errors, criteria };
  }

  for (const [index, line] of lines.entries()) {
    const match = /^\s*[-*+]\s+\[([ xX])\]\s+(AC\d{3}):\s+(.+?)\s*$/.exec(line);
    if (!match) {
      addIssue(
        errors,
        "ac_format",
        `body.Acceptance Criteria.line${index + 1}`,
        "Each criterion must be one checklist item with a sequential ID such as AC001:."
      );
      continue;
    }

    criteria.push({
      id: match[2],
      text: match[3],
      checked: match[1].toLowerCase() === "x",
    });
  }

  criteria.forEach((criterion, index) => {
    const expectedId = `AC${String(index + 1).padStart(3, "0")}`;
    if (criterion.id !== expectedId) {
      addIssue(
        errors,
        "ac_sequence",
        `body.Acceptance Criteria.${criterion.id}`,
        `Expected ${expectedId}; IDs must be unique and sequential starting at AC001.`
      );
    }
  });

  return { valid: errors.length === 0, errors, criteria };
}

/**
 * Return the first unchecked criterion so callers review only one item at a time.
 *
 * @param {Array<{id: string, checked: boolean}>} criteria Parsed criteria.
 * @param {Array<{id: string, userConfirmed: boolean, reason: string, userConfirmedAt: string, sourceCommentUrl: string, sourceCommentAt: string}>} rescope Approved re-scopes.
 * @returns {{id: string, checked: boolean}|null}
 */
function getNextAcceptanceCriterion(criteria, rescope = []) {
  if (!Array.isArray(criteria)) {
    return null;
  }
  return criteria.find((criterion) => criterion && criterion.checked === false &&
    !(Array.isArray(rescope) && rescope.some((entry) => isPlainObject(entry) &&
      entry.id === criterion.id && entry.userConfirmed === true &&
      typeof entry.reason === "string" && entry.reason.trim() !== "" &&
      isCommentUrl(entry.sourceCommentUrl) &&
      Number.isFinite(Date.parse(entry.userConfirmedAt)) &&
      Number.isFinite(Date.parse(entry.sourceCommentAt)) &&
      Date.parse(entry.userConfirmedAt) <= Date.parse(entry.sourceCommentAt)))) ?? null;
}

/**
 * Check that every criterion has user approval and a source comment before checking.
 *
 * @param {Array<object>} criteria Reviewed criteria. A checked criterion with
 *   `missingRequirementsInvited: true` also needs the `missingRequirements` record
 *   (an array of `{ text, routedTo }` entries; see MISSING_REQUIREMENT_ROUTES).
 * @param {Array<{id: string, userConfirmed: boolean, reason: string, userConfirmedAt: string, sourceCommentUrl: string, sourceCommentAt: string}>} rescope Approved changes for specific unchecked criteria.
 * @returns {{valid: boolean, errors: ValidationIssue[], warnings: ValidationIssue[]}}
 */
function validateClosureReadiness(criteria, rescope = []) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(criteria) || criteria.length === 0) {
    addIssue(errors, "criteria_missing", "criteria", "Closure requires at least one acceptance criterion.");
    return buildResult(errors, warnings);
  }

  for (const [index, criterion] of criteria.entries()) {
    const expectedId = `AC${String(index + 1).padStart(3, "0")}`;
    if (!isPlainObject(criterion) || criterion.id !== expectedId) {
      addIssue(errors, "criterion_invalid", `criteria[${index}]`, `Expected criterion ${expectedId}.`);
    }
  }
  if (errors.length > 0) {
    return buildResult(errors, warnings);
  }

  if (!Array.isArray(rescope)) {
    addIssue(errors, "rescope_invalid", "rescope", "Identify each re-scoped criterion by ID.");
    return buildResult(errors, warnings);
  }

  const rescopeById = new Map();
  for (const entry of rescope) {
    if (!isPlainObject(entry) || !criteria.some((criterion) => criterion.id === entry.id) || rescopeById.has(entry.id)) {
      addIssue(errors, "rescope_invalid", "rescope", "Re-scoped IDs must be unique and belong to this ticket.");
    } else {
      rescopeById.set(entry.id, entry);
    }
  }

  let earlierUnmet = false;
  let previousReviewedAt = -Infinity;
  for (const criterion of criteria) {
    if (!criterion.checked) {
      const approval = rescopeById.get(criterion.id);
      if (!approval) {
        earlierUnmet = true;
        addIssue(errors, "criterion_unchecked", criterion.id, "An unmet criterion keeps the ticket open.");
        continue;
      }
      if (approval.userConfirmed !== true || typeof approval.reason !== "string" ||
        approval.reason.trim() === "" || !isCommentUrl(approval.sourceCommentUrl)) {
        addIssue(errors, "rescope_evidence_missing", criterion.id, "Re-scoping needs explicit user approval, a reason, and its own issue comment.");
      } else if (!Number.isFinite(Date.parse(approval.userConfirmedAt)) ||
        !Number.isFinite(Date.parse(approval.sourceCommentAt)) ||
        Date.parse(approval.userConfirmedAt) > Date.parse(approval.sourceCommentAt) ||
        Date.parse(approval.userConfirmedAt) < previousReviewedAt) {
        addIssue(errors, "rescope_order", criterion.id, "Review each criterion in order and record approval before its comment.");
      } else {
        previousReviewedAt = Date.parse(approval.sourceCommentAt);
      }
      continue;
    }

    if (rescopeById.has(criterion.id)) {
      addIssue(errors, "rescope_invalid", criterion.id, "A checked criterion cannot also be re-scoped.");
    }
    if (earlierUnmet) {
      addIssue(errors, "review_order", criterion.id, "Review each criterion in ticket order.");
    }

    if (
      criterion.userConfirmed !== true ||
      criterion.missingRequirementsInvited !== true ||
      typeof criterion.evidence !== "string" ||
      criterion.evidence.trim() === ""
    ) {
      addIssue(
        errors,
        "criterion_confirmation_missing",
        criterion.id,
        "A checked criterion requires explicit user confirmation, an invitation to add requirements, and evidence."
      );
    }

    if (criterion.missingRequirementsInvited === true && !Array.isArray(criterion.missingRequirements)) {
      addIssue(
        errors,
        "missing_requirements_record_missing",
        criterion.id,
        "Record the missing requirements with their routing before checking the criterion."
      );
    }

    if (Array.isArray(criterion.missingRequirements)) {
      for (const entry of criterion.missingRequirements) {
        if (!isPlainObject(entry) ||
          typeof entry.text !== "string" ||
          entry.text.trim() === "" ||
          typeof entry.routedTo !== "string" ||
          !MISSING_REQUIREMENT_ROUTES.includes(entry.routedTo)) {
          addIssue(
            errors,
            "missing_requirements_record_invalid",
            criterion.id,
            `Each missing requirement needs a non-empty text and routedTo of ${MISSING_REQUIREMENT_ROUTES.join(", ")}.`
          );
        }
      }
    }

    if (!isWorkOwnerLink(criterion.owner)) {
      addIssue(errors, "criterion_owner_missing", criterion.id, "Show the linked work item that owns this criterion.");
    }

    if (!isCommentUrl(criterion.sourceCommentUrl)) {
      addIssue(errors, "source_comment_missing", criterion.id, "Record the decision and source in a separate issue comment.");
      continue;
    }

    const confirmationTime = Date.parse(criterion.userConfirmedAt);
    const commentTime = Date.parse(criterion.sourceCommentAt);
    const checkedTime = Date.parse(criterion.checkedAt);
    if (
      !Number.isFinite(confirmationTime) ||
      !Number.isFinite(commentTime) ||
      !Number.isFinite(checkedTime) ||
      confirmationTime > commentTime ||
      commentTime > checkedTime ||
      confirmationTime < previousReviewedAt
    ) {
      addIssue(
        errors,
        "review_order",
        criterion.id,
        "Record explicit confirmation, then the source comment, then check the criterion."
      );
    } else {
      previousReviewedAt = checkedTime;
    }
  }

  return buildResult(errors, warnings);
}

/**
 * Validate one ticket lifecycle transition.
 *
 * @param {string} from Current status.
 * @param {string} to Requested status.
 * @param {{blocker?: string, reason?: string, blockerCleared?: boolean, criteria?: Array<object>, rescope?: Array<object>, deferredOptionalCheck?: boolean, userChosenSkip?: boolean, skipReason?: string}} details
 * @returns {{valid: boolean, errors: ValidationIssue[], warnings: ValidationIssue[]}}
 */
function validateStatusTransition(from, to, details = {}) {
  const errors = [];
  const allowed = {
    Draft: ["Ready"],
    Ready: ["In Progress", "Blocked"],
    "In Progress": ["Done", "Blocked"],
    Blocked: ["Ready"],
    Done: [],
  };

  if (!STATUSES.includes(from) || !STATUSES.includes(to)) {
    addIssue(errors, "invalid_status", "status", "Transition uses an unknown status.");
    return buildResult(errors, []);
  }

  if (!allowed[from].includes(to)) {
    addIssue(errors, "invalid_transition", "status", `Transition ${from} -> ${to} is not allowed.`);
  }

  if (to === "Blocked" && (!details.blocker || !details.reason)) {
    addIssue(errors, "blocker_required", "blocker", "A blocked ticket needs a named blocker and reason.");
  }

  if (from === "Blocked" && to === "Ready" && details.blockerCleared !== true) {
    addIssue(errors, "blocker_not_cleared", "blocker", "Confirm that the named blocker is clear before returning to Ready.");
  }

  if (to === "Done") {
    if (!validateClosureReadiness(details.criteria, details.rescope).valid) {
      addIssue(errors, "closure_not_ready", "closure", "Review all acceptance criteria before marking the ticket Done.");
    }
    if (details.deferredOptionalCheck === true) {
      addIssue(errors, "deferred_check_open", "status", "A deferred optional check stays open.");
    }
    if (details.userChosenSkip === true && !details.skipReason) {
      addIssue(errors, "skip_reason_missing", "skipReason", "A user-chosen skip needs a recorded reason.");
    }
  }

  return buildResult(errors, []);
}

function validateSharedFields(fields, errors) {
  const requiredStrings = ["title", "description", "type", "status", "author", "date"];
  for (const name of requiredStrings) {
    if (typeof fields[name] !== "string" || fields[name].trim() === "") {
      addIssue(errors, "field_required", name, `Field '${name}' must be a non-empty string.`);
    }
  }

  for (const name of ["related_links", "parent"]) {
    if (typeof fields[name] !== "string") {
      addIssue(errors, "field_type", name, `Field '${name}' must be a string or empty.`);
    }
  }

  if (typeof fields.date === "string" && !isIsoDate(fields.date)) {
    addIssue(errors, "date_format", "date", "Date must use the ISO format YYYY-MM-DD.");
  }
}

function validateGitHubRepresentation(ticket, type, status, errors) {
  const body = typeof ticket.body === "string" ? ticket.body : "";
  if (/^\s*---\s*$/m.test(body)) {
    addIssue(errors, "github_frontmatter", "body", "GitHub issue bodies use readable Details, not raw YAML frontmatter.");
  }
  if (!/^##\s+Details\s*$/im.test(body)) {
    addIssue(errors, "github_details_missing", "body", "GitHub issue bodies need a Details section for non-native fields.");
  }
  if (!/[-*]\s+\*\*Status:\*\*\s*.+/i.test(body)) {
    addIssue(errors, "github_status_missing", "body.Details", "Record the planning status in the Details list.");
  } else if (!new RegExp(`[-*]\\s+\\*\\*Status:\\*\\*\\s*${escapeRegExp(status)}(?:\\s|$)`, "i").test(body)) {
    addIssue(errors, "github_status_mismatch", "body.Details", "The Details status must match the logical ticket status.");
  }
  if (!Array.isArray(ticket.labels) || !ticket.labels.includes(`recon:${type}`)) {
    addIssue(errors, "type_label_missing", "labels", `GitHub tickets need the recon:${type} classification label.`);
  }
}

function validateTypeSections(type, body, errors) {
  for (const alternatives of REQUIRED_SECTIONS[type]) {
    const section = alternatives.map((name) => getSection(body, name)).find((value) => value !== null);
    if (section === undefined || section === null || section.trim() === "") {
      addIssue(
        errors,
        "section_required",
        `body.${alternatives[0]}`,
        `Ticket type '${type}' requires a non-empty ${alternatives[0]} section.`
      );
    }
  }
}

function validateMapContent(body, errors) {
  const destination = getSection(body, "Destination");
  if (destination && /^(?:improve|fix|enhance)\s+(?:the\s+|our\s+)?(?:system|product|software|things)\.?$/i.test(destination.trim())) {
    addIssue(errors, "map_destination_vague", "body.Destination", "Name a specific outcome, such as a delivered feature or decision, rather than a general improvement.");
  }

  const decisions = getSection(body, "Decisions So Far");
  if (decisions) {
    const items = decisions.split(/\r?\n/).filter((line) => /^\s*[-*+]\s+/.test(line));
    if (items.length === 0 && !isExplicitNone(decisions)) {
      addIssue(errors, "map_decisions_empty_note_missing", "body.Decisions So Far", "List linked decisions or explain why none are recorded yet.");
    }
    for (const item of items) {
      if (!/\[[^\]]+\]\([^)]+\)/.test(item)) {
        addIssue(errors, "map_decision_link_missing", "body.Decisions So Far", "Link each recorded decision to its ticket.");
      }
    }
  }

  const fog = getSection(body, "Not Yet Specified (Fog of War)") ?? getSection(body, "Fog of War");
  if (fog) {
    const items = fog.split(/\r?\n/).filter((line) => /^\s*[-*+]\s+/.test(line));
    if (items.length === 0 && !isExplicitNone(fog)) {
      addIssue(errors, "map_fog_empty_note_missing", "body.Fog of War", "List tagged unknowns or explain why there are none yet.");
    }
    for (const item of items) {
      if (!/\*\*(?:what|how)\*\*/i.test(item)) {
        addIssue(errors, "map_fog_tag_missing", "body.Fog of War", "Mark each fog item as **what** or **how**.");
      }
    }
  }

  const scope = getSection(body, "Out of Scope");
  if (scope && !/^\s*[-*+]\s+/m.test(scope) && !isExplicitNone(scope)) {
    addIssue(errors, "map_scope_empty_note_missing", "body.Out of Scope", "List exclusions or explain why none are known yet.");
  }

  validateMapTable(getSection(body, "Open Tickets (Frontier)") ?? getSection(body, "Open Tickets"),
    "Open Tickets", ["Ticket", "Type", "Assignee", "Status"], errors);
  validateMapTable(getSection(body, "Blocked Tickets"),
    "Blocked Tickets", ["Ticket", "Type", "Blocked by", "Reason"], errors);
}

const MAP_OWNER_LABEL = /\b(Implementation|Research|Prototype|Quiz \(Requirements\)|Quiz \(Understanding\)|Quiz-Requirements|Quiz-Understanding|Quiz|Learn|Prerequisite)\s*:\s*(\[[^\]]+\]\(([^)\s]+)\)|(?:AB)?#\d+)/i;

/**
 * Check that each Map criterion names a non-Implementation owner ticket in its
 * AC text (for example `Research: #12`). Historical Maps never reach this check.
 * Options: `ownerStates` maps an owner link target to "open", "closed", or
 * "deleted"; `ownerReviewOverrides` lists user-approved overrides by criterion ID.
 */
function validateMapCriterionOwners(criteria, body, stage, provider, options, errors, warnings) {
  const fog = getSection(body, "Not Yet Specified (Fog of War)") ?? getSection(body, "Fog of War") ?? "";
  const fogLines = fog.split(/\r?\n/).filter((line) => /^\s*[-*+]\s+/.test(line));
  const ownerStates = isPlainObject(options.ownerStates) ? options.ownerStates : {};
  const overrides = Array.isArray(options.ownerReviewOverrides) ? options.ownerReviewOverrides : [];

  for (const criterion of criteria) {
    const path = `body.Acceptance Criteria.${criterion.id}`;
    if (/\(\s*decision only\s*\)/i.test(criterion.text)) {
      continue;
    }
    const match = MAP_OWNER_LABEL.exec(criterion.text);
    if (!match) {
      const inFog = fogLines.some((line) => new RegExp(`\\b${criterion.id}\\b`).test(line));
      if (/(?:AB)?#\d+|\[[^\]]+\]\([^)\s]+\)/.test(criterion.text)) {
        addIssue(errors, "map_criterion_owner_type_missing", path, "Name the owner type before the link, such as 'Research: #12'.");
      } else if (stage === "resolution") {
        addIssue(errors, "map_criterion_owner_missing", path, "Link an owner ticket (or mark the criterion 'decision only') before the Map is resolved.");
      } else if (inFog) {
        warnings.push(issue("map_criterion_owner_pending", path, "No owner yet; the criterion is listed in Fog of War. Add an owner link before resolution."));
      } else {
        addIssue(errors, "map_criterion_owner_missing", path, "Link an owner ticket, mark the criterion 'decision only', or list it in Not Yet Specified (Fog of War).");
      }
      continue;
    }

    const [, label, link, url] = match;
    if (/^implementation$/i.test(label)) {
      addIssue(errors, "map_criterion_owner_implementation", path, "An Implementation ticket cannot own a Map criterion. Use Research, Prototype, Quiz, Learn, or Prerequisite.");
      continue;
    }
    if (provider === "markdown" && !url) {
      addIssue(errors, "map_criterion_owner_link_invalid", path, "Local Markdown Maps need a Markdown link to the owner ticket.");
      continue;
    }

    const state = ownerStates[url ?? link];
    if (!criterion.checked && (state === "closed" || state === "deleted")) {
      const approved = overrides.some((entry) => isPlainObject(entry) && entry.id === criterion.id &&
        entry.userApproved === true && typeof entry.reason === "string" && entry.reason.trim() !== "" &&
        Number.isFinite(Date.parse(entry.approvedAt)));
      const message = `Owner ticket is ${state} but the criterion is unchecked. Re-review the criterion.`;
      if (approved) {
        warnings.push(issue("map_owner_review_overridden", path, `${message} The user approved an override.`));
      } else if (stage === "resolution") {
        addIssue(errors, "map_owner_review_required", path, message);
      } else {
        warnings.push(issue("map_owner_review_required", path, message));
      }
    }
  }
}

function isExplicitNone(section) {
  return /^(?:none yet\b|no\b[^\r\n]*\b(?:yet|because|while|during|charting|draft)\b)/im.test(section.trim());
}

function validateMapTable(section, name, columns, errors) {
  if (!section) {
    return;
  }
  const path = `body.${name}`;
  const lines = section.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tableStart = lines.findIndex((line) => line.startsWith("|"));
  if (tableStart < 0) {
    if (!isExplicitNone(section)) {
      addIssue(errors, "map_table_empty_note_missing", path, "Provide the ticket table or explain why it has no entries.");
    }
    return;
  }

  const cells = (line) => line.split("|").slice(1, -1).map((cell) => cell.trim());
  const headers = cells(lines[tableStart]).map((header) => header.toLowerCase());
  const divider = lines[tableStart + 1] ? cells(lines[tableStart + 1]) : [];
  if (!columns.every((column) => headers.includes(column.toLowerCase())) ||
    divider.length !== headers.length || divider.some((cell) => !/^:?-{3,}:?$/.test(cell))) {
    addIssue(errors, "map_table_columns", path, `Use a Markdown table with ${columns.join(", ")} columns.`);
    return;
  }

  const rows = lines.slice(tableStart + 2).filter((line) => line.startsWith("|"));
  if (rows.length === 0 && !isExplicitNone(lines.slice(tableStart + 2).join("\n"))) {
    addIssue(errors, "map_table_empty_note_missing", path, "Explain why this table has no entries yet.");
  }
  for (const row of rows) {
    const values = cells(row);
    if (values.length !== headers.length) {
      addIssue(errors, "map_table_row", path, "Each ticket row must have a value for every column.");
      continue;
    }
    if (/^none(?: yet)?$/i.test(values[headers.indexOf("ticket")])) {
      continue;
    }
    const field = (column) => values[headers.indexOf(column.toLowerCase())];
    if (!field("Ticket") || !field("Type")) {
      addIssue(errors, "map_table_row", path, "Name each ticket and its type.");
    }
    if (name === "Open Tickets") {
      if (!["Draft", "Ready", "In Progress"].includes(field("Status"))) {
        addIssue(errors, "map_frontier_status_invalid", path, "An open, unblocked ticket needs a Draft, Ready, or In Progress status.");
      }
    } else {
      if (!field("Blocked by") || /^(?:-|—|\[.*\])$/.test(field("Blocked by"))) {
        addIssue(errors, "map_blocker_missing", path, "Name the blocking ticket.");
      }
      if (!field("Reason") || /^(?:-|—|\[.*\])$/.test(field("Reason"))) {
        addIssue(errors, "map_block_reason_missing", path, "State why the ticket is blocked.");
      }
    }
  }
}

function validatePrerequisiteScope(body, errors) {
  const scope = getSection(body, "Work Scope") ?? "";
  const willDo = scope.split(/will not do/i)[0] ?? "";
  if (/\b(edit|change|update|modify|write)\b.{0,50}\b(repository|source|documentation|configuration|code|file)\b/i.test(willDo)) {
    addIssue(
      errors,
      "prerequisite_repository_work",
      "body.Work Scope",
      "Prerequisite work is external or manual; repository edits belong in an Implementation ticket."
    );
  }
  if (!/will\s+not\s+do/i.test(scope)) {
    addIssue(errors, "prerequisite_scope_boundary", "body.Work Scope", "State what the prerequisite will not do.");
  }
}

function validateResolution(type, fields, body, resolution, errors, labels) {
  if (!isPlainObject(resolution)) {
    addIssue(errors, "resolution_required", "resolution", "Resolution data is required at the resolution stage.");
    return;
  }

  const requireSection = (name) => {
    const content = getSection(body, name);
    if (content === null || content.trim() === "") {
      addIssue(errors, "missing_resolution_section", `body.${name}`, `Resolution requires a non-empty ${name} section.`);
    }
  };

  if (type === "research") {
    requireSection("Findings");
    requireSection("Recommendation");
    if (resolution.userAccepted !== true) {
      addIssue(errors, "resolution_not_accepted", "resolution.userAccepted", "The user must review and accept Research findings.");
    }
  } else if (type === "prototype") {
    requireSection("Findings");
    if (resolution.userAccepted !== true) {
      addIssue(errors, "resolution_not_accepted", "resolution.userAccepted", "The user must review Prototype findings.");
    }
  } else if (type === "quiz-requirements") {
    requireSection("Confirmed Requirements");
    requireSection("Open Questions");
    if (resolution.requirementsConfirmed !== true) {
      addIssue(errors, "requirements_not_confirmed", "resolution.requirementsConfirmed", "The user must confirm the captured requirements.");
    }
    if (resolution.openQuestionsAcknowledged !== true) {
      addIssue(errors, "open_questions_unacknowledged", "resolution.openQuestionsAcknowledged", "The user must acknowledge the open-question list.");
    }
    validateOpenQuestions(resolution.openQuestions, labels, body, errors);
  } else if (type === "quiz-understanding") {
    validateOptionalCheckResolution(fields.status, resolution, errors);
    if (resolution.outcome === "completed") {
      requireSection("Responses");
      if (resolution.userAccepted !== true) {
        addIssue(errors, "resolution_not_accepted", "resolution.userAccepted", "The user must review the Understanding Quiz result.");
      }
    }
  } else if (type === "learn") {
    requireSection("Takeaways");
    validateOptionalCheckResolution(fields.status, resolution, errors);
  } else if (type === "prerequisite") {
    if (resolution.blockerRemoved !== true || resolution.decisionUnblocked !== true || !resolution.evidence) {
      addIssue(errors, "prerequisite_not_verified", "resolution", "Record evidence that the blocker is removed and the decision is unblocked.");
    }
  } else if (type === "map" && resolution.userAccepted !== true) {
    addIssue(errors, "resolution_not_accepted", "resolution.userAccepted", "The user must accept the completed Map.");
  }
}

function validateOpenQuestions(openQuestions, labels, body, errors) {
  if (!Array.isArray(openQuestions)) {
    addIssue(errors, "open_questions_invalid", "resolution.openQuestions", "Record open questions as an array, including an empty array when none remain.");
    return;
  }

  const section = getSection(body, "Open Questions") ?? "";
  openQuestions.forEach((question, index) => {
    const expectedId = `Q${index + 1}`;
    if (!isPlainObject(question)) {
      addIssue(errors, "open_question_id_invalid", `resolution.openQuestions[${index}]`, `Each open question needs the sequential ID ${expectedId}.`);
      return;
    }
    if (question.id !== expectedId) {
      addIssue(errors, "open_question_id_invalid", `resolution.openQuestions[${index}]`, `Each open question needs the sequential ID ${expectedId}.`);
    }
    if (typeof question.text !== "string" || question.text.trim() === "") {
      addIssue(errors, "open_question_text_missing", question.id, "Record the full unanswered question text.");
    }
    if (!isHttpsUrl(question.mapFogUrl)) {
      addIssue(errors, "open_question_map_link_missing", question.id, "Link each open question to its Map Fog of War item.");
    }
    if (
      typeof question.text === "string" &&
      (!section.includes(question.id) ||
        !section.includes(question.text) ||
        typeof question.mapFogUrl !== "string" ||
        !section.includes(question.mapFogUrl))
    ) {
      addIssue(errors, "open_question_body_mismatch", question.id, "Include the ID, full question, and Map Fog of War link in the ticket body.");
    }
    if (question.acknowledged !== true) {
      addIssue(errors, "open_question_unacknowledged", question.id, "The user must acknowledge each open question.");
    }
  });

  const hasOpenQuestionsLabel = Array.isArray(labels) && labels.includes("recon:open-questions");
  if (openQuestions.length > 0 && !hasOpenQuestionsLabel) {
    addIssue(errors, "open_questions_label_missing", "labels", "Unanswered Requirements Quiz questions need the recon:open-questions label.");
  } else if (openQuestions.length === 0 && hasOpenQuestionsLabel) {
    addIssue(errors, "open_questions_label_stale", "labels", "Remove recon:open-questions when no unanswered questions remain.");
  }
}

function validateOptionalCheckResolution(status, resolution, errors) {
  if (resolution.userChosen !== true) {
    addIssue(errors, "check_choice_missing", "resolution.userChosen", "Record the user's choice for the optional check.");
  }

  if (resolution.outcome === "defer") {
    if (!resolution.userChosen || !resolution.reason) {
      addIssue(errors, "defer_evidence_missing", "resolution", "A deferred check needs the user's choice and a reason.");
    }
    if (status === "Done") {
      addIssue(errors, "defer_must_remain_open", "status", "A deferred check stays open in Ready or In Progress.");
    }
    return;
  }

  if (["skip", "not-selected"].includes(resolution.outcome) && !resolution.reason) {
    addIssue(errors, "skip_evidence_missing", "resolution", "A skipped check needs the user's choice and a reason.");
  }

  if (!["completed", "skip", "not-selected"].includes(resolution.outcome)) {
    addIssue(errors, "check_outcome_required", "resolution.outcome", "Record whether the check was completed, skipped, or not selected.");
  }

  if (resolution.outcome === "completed" && resolution.userAccepted !== true) {
    addIssue(errors, "resolution_not_accepted", "resolution.userAccepted", "The user must review the completed check.");
  }
}

/**
 * @typedef {{code: string, path: string, message: string}} ValidationIssue
 */

function addIssue(target, code, path, message) {
  target.push(issue(code, path, message));
}

function issue(code, path, message) {
  return { code, path, message };
}

function buildResult(errors, warnings) {
  return { valid: errors.length === 0, errors, warnings };
}

function buildLegacyResult(errors, warnings) {
  return { valid: errors.length === 0, errors, warnings };
}

function validateLegacyField(template, fieldName, rule, platform, errors, warnings) {
  const value = template[fieldName];
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== rule.type) {
    errors.push(`Field '${fieldName}' for platform '${platform}' must be a ${rule.type}, got ${typeof value}.`);
    return;
  }

  const trimmedValue = value.trim();
  if (rule.required && trimmedValue.length === 0) {
    errors.push(`Field '${fieldName}' for platform '${platform}' must not be empty.`);
    return;
  }
  if (rule.minLength !== undefined && trimmedValue.length < rule.minLength) {
    errors.push(`Field '${fieldName}' for platform '${platform}' must be at least ${rule.minLength} characters long.`);
  }
  if (rule.maxLength !== undefined && trimmedValue.length > rule.maxLength) {
    errors.push(`Field '${fieldName}' for platform '${platform}' must be no more than ${rule.maxLength} characters long.`);
  }
  if (rule.enum && !rule.enum.includes(trimmedValue)) {
    errors.push(`Field '${fieldName}' for platform '${platform}' must be one of: ${rule.enum.join(", ")}.`);
  }
  if (value !== trimmedValue) {
    warnings.push(`Field '${fieldName}' for platform '${platform}' has leading or trailing whitespace; consider trimming it.`);
  }
}

function getSection(body, heading) {
  const source = stripCodeFences(typeof body === "string" ? body : "");
  const lines = source.split(/\r?\n/);
  const target = normalizeHeading(heading);
  const start = lines.findIndex((line) => {
    const match = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    return match && normalizeHeading(match[1]) === target;
  });
  if (start < 0) {
    return null;
  }
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{1,6}\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

function normalizeHeading(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripCodeFences(value) {
  return value.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "");
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isCommentUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /#issuecomment-\d+$/.test(url.hash);
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isWorkOwnerLink(value) {
  if (typeof value !== "string") {
    return false;
  }
  const markdownLink = /^\[[^\]]+\]\((https:\/\/[^)\s]+)\)$/.exec(value.trim());
  const candidate = markdownLink ? markdownLink[1] : value.trim();
  try {
    return new URL(candidate).protocol === "https:";
  } catch {
    return false;
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

module.exports = {
  DEFAULT_TITLE_PATTERNS,
  LEGACY_TYPES,
  MAP_STATUSES,
  MISSING_REQUIREMENT_ROUTES,
  PLATFORM_RULES,
  STATUSES,
  TICKET_TYPES,
  getNextAcceptanceCriterion,
  validateCreationOverride,
  validateAcceptanceCriteria,
  validateClosureReadiness,
  validateStatusTransition,
  validateTemplate,
  validateTicket,
  validateTitleFormat,
};
