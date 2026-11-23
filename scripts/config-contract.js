// Single definition of the agreed configuration key contract (#211 AC012,
// AC015, AC031). The validator and its tests import these values. The shipped
// documentation (jl-recon SKILL.md, jl-quiz SKILL.md, jl-config
// validation-rules.md) must name the same keys; tests check this.

// New-ticket Recon ticket types (the seven agreed types).
const RECON_TYPE_KEYS = [
  "map",
  "research",
  "prototype",
  "quiz_requirements",
  "quiz_understanding",
  "learn",
  "prerequisite",
];

// Independent quiz configuration blocks. They replace the obsolete jl_quiz block.
const QUIZ_CONFIG_KEYS = ["jl_quiz_requirements", "jl_quiz_understanding"];

// Obsolete for new tickets. Still readable for historical content.
const OBSOLETE_QUIZ_BLOCK = "jl_quiz";
const OBSOLETE_TYPE_KEYS = ["quiz", "task"];

// Settings of the quiz blocks.
const QUIZ_MODES = ["in_chat", "questionnaire"];
const PLAN_DESTINATIONS = [
  "github_issue",
  "azure_devops_work_item",
  "local_file",
  "inline_message",
];

// jl_recon.model_selection keys: type keys + default + check keys.
const MODEL_SELECTION_CHECK_KEYS = ["ticket_resolution_checks", "status_report_checks"];
const MODEL_SELECTION_LEGACY_ALIASES = ["mode2_checks", "mode3_checks"];
const MODEL_SELECTION_KEYS = [
  "default",
  ...RECON_TYPE_KEYS,
  ...MODEL_SELECTION_CHECK_KEYS,
  ...MODEL_SELECTION_LEGACY_ALIASES,
];

// jl_recon.labels keys and jl_recon.title_format keys.
const LABEL_KEYS = ["default", ...RECON_TYPE_KEYS];
const TITLE_FORMAT_KEYS = [...RECON_TYPE_KEYS];

// jl_recon.checks settings.
const CHECKS_BOOLEAN_KEYS = ["on_ticket_resolution_enabled", "on_status_report_enabled"];
const CHECKS_NUMERIC_KEY = "timeout_seconds";

module.exports = {
  RECON_TYPE_KEYS,
  QUIZ_CONFIG_KEYS,
  OBSOLETE_QUIZ_BLOCK,
  OBSOLETE_TYPE_KEYS,
  QUIZ_MODES,
  PLAN_DESTINATIONS,
  MODEL_SELECTION_CHECK_KEYS,
  MODEL_SELECTION_LEGACY_ALIASES,
  MODEL_SELECTION_KEYS,
  LABEL_KEYS,
  TITLE_FORMAT_KEYS,
  CHECKS_BOOLEAN_KEYS,
  CHECKS_NUMERIC_KEY,
};
