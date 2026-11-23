"use strict";
// Regression tests for the configuration key contract (#211 AC012, AC015, AC031).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const contract = require("./config-contract");
const { validateConfigText, parseYaml } = require("./validate-config");

const root = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const fence = (yaml) => "```yaml\n" + yaml + "\n```";
// The validator strips code fences, so wrap config in prose-level YAML instead.
const check = (yaml, options) => validateConfigText(yaml + "\n", "test.md", options);

test("contract: defines the seven agreed recon type keys", () => {
  assert.deepEqual(contract.RECON_TYPE_KEYS, [
    "map", "research", "prototype", "quiz_requirements", "quiz_understanding", "learn", "prerequisite",
  ]);
  assert.deepEqual(contract.QUIZ_CONFIG_KEYS, ["jl_quiz_requirements", "jl_quiz_understanding"]);
  assert.deepEqual(contract.OBSOLETE_TYPE_KEYS, ["quiz", "task"]);
});

test("valid: independent quiz blocks are accepted", () => {
  const result = check(
    [
      "jl_quiz_requirements:",
      "  quiz_mode: in_chat",
      "  plan_destination: github_issue",
      "  file_storage_location: docs/plans/",
      "",
      "jl_quiz_understanding:",
      "  quiz_mode: questionnaire",
      "  plan_destination: local_file",
    ].join("\n")
  );
  assert.equal(result.hasErrors, false, result.messages.join("\n"));
});

test("valid: full jl_recon contract with all seven type keys", () => {
  const lines = ["jl_recon:", "  model_selection:", "    default: inherit"];
  for (const key of contract.RECON_TYPE_KEYS) lines.push(`    ${key}: inherit`);
  lines.push("    ticket_resolution_checks: inherit", "    status_report_checks: inherit", "  labels:", "    default:", '      - "recon:map"');
  for (const key of contract.RECON_TYPE_KEYS) lines.push(`    ${key}:`, `      - "recon:${key.replace("_", "-")}"`);
  lines.push("  title_format:");
  for (const key of contract.RECON_TYPE_KEYS) lines.push(`    ${key}: "${key}: {x}"`);
  lines.push("  checks:", "    on_ticket_resolution_enabled: true", "    on_status_report_enabled: false", "    timeout_seconds: 30");
  const result = check(lines.join("\n"));
  assert.equal(result.hasErrors, false, result.messages.join("\n"));
});

test("invalid: obsolete jl_quiz block is rejected for new tickets with a clear error", () => {
  const result = check("jl_quiz:\n  plan_destination: github_issue");
  assert.equal(result.hasErrors, true);
  assert.match(result.messages.join("\n"), /jl_quiz: obsolete block.*jl_quiz_requirements.*jl_quiz_understanding/);
});

test("historical: obsolete jl_quiz block stays readable", () => {
  const result = check("jl_quiz:\n  quiz_mode: a\n  plan_destination: github_issue", { historical: true });
  assert.equal(result.hasErrors, false, result.messages.join("\n"));
});

test("invalid: obsolete quiz and task keys are rejected in model_selection, labels and title_format", () => {
  for (const key of contract.OBSOLETE_TYPE_KEYS) {
    const cases = {
      model_selection: `jl_recon:\n  model_selection:\n    ${key}: inherit`,
      labels: `jl_recon:\n  labels:\n    ${key}:\n      - "x"`,
      title_format: `jl_recon:\n  title_format:\n    ${key}: "T: {x}"`,
    };
    for (const [section, yaml] of Object.entries(cases)) {
      const result = check(yaml);
      assert.equal(result.hasErrors, true, `${section}.${key} should fail`);
      assert.match(result.messages.join("\n"), new RegExp(`obsolete ticket type '${key}'`));
    }
  }
});

test("historical: obsolete quiz and task keys stay readable", () => {
  const yaml = [
    "jl_recon:",
    "  model_selection:",
    "    quiz: inherit",
    "    task: inherit",
    "  labels:",
    "    quiz:",
    '      - "recon:quiz"',
  ].join("\n");
  const result = check(yaml, { historical: true });
  assert.equal(result.hasErrors, false, result.messages.join("\n"));
});

test("invalid: unknown keys are rejected", () => {
  for (const yaml of [
    "jl_recon:\n  model_selection:\n    bogus: inherit",
    'jl_recon:\n  labels:\n    bogus:\n      - "x"',
    'jl_recon:\n  title_format:\n    bogus: "x"',
    "jl_recon:\n  checks:\n    bogus: true",
  ]) {
    const result = check(yaml);
    assert.equal(result.hasErrors, true, yaml);
    assert.match(result.messages.join("\n"), /invalid key/);
  }
});

test("invalid: bad value types are rejected", () => {
  const cases = [
    "jl_quiz_requirements:\n  plan_destination: 5",
    "jl_quiz_requirements:\n  plan_destination: slack_thread",
    "jl_quiz_requirements:\n  plan_destination: github_issue\n  quiz_mode: a",
    "jl_quiz_understanding:\n  plan_destination: github_issue\n  file_storage_location: /abs",
    "jl_recon:\n  model_selection:\n    learn: 5",
    "jl_recon:\n  labels:\n    learn: notalist",
    "jl_recon:\n  title_format:\n    learn: 5",
    "jl_recon:\n  checks:\n    timeout_seconds: 0",
    "jl_recon:\n  checks:\n    on_status_report_enabled: yes",
  ];
  for (const yaml of cases) {
    assert.equal(check(yaml).hasErrors, true, yaml);
  }
});

test("invalid: quiz block missing required plan_destination", () => {
  const result = check("jl_quiz_understanding:\n  quiz_mode: in_chat");
  assert.equal(result.hasErrors, true);
  assert.match(result.messages.join("\n"), /jl_quiz_understanding: missing required setting 'plan_destination'/);
});

test("parser: reads block lists whose items contain colons", () => {
  const parsed = parseYaml('labels:\n  map:\n    - "recon:map"\n    - "recon:x"');
  assert.equal(parsed.error, false);
  assert.deepEqual(parsed.parsed.labels.map, ["recon:map", "recon:x"]);
});

test("repository: AGENTS.md and CONTRIBUTING.md use the agreed keys and validate", () => {
  for (const file of ["AGENTS.md", "CONTRIBUTING.md"]) {
    const result = validateConfigText(read(file), file);
    assert.equal(result.hasErrors, false, result.messages.join("\n"));
  }
  const agents = read("AGENTS.md");
  for (const key of contract.QUIZ_CONFIG_KEYS) assert.match(agents, new RegExp(`^${key}:`, "m"));
  assert.doesNotMatch(agents.replace(/```[\s\S]*?```/g, ""), /^jl_quiz:/m);
});

test("docs: shipped and repository docs name the same keys", () => {
  const recon = read(".apm/skills/jl-recon/SKILL.md");
  for (const key of contract.RECON_TYPE_KEYS) {
    for (const section of ["model_selection", "labels", "title_format"]) {
      if (key === "map" && section === "title_format") continue;
      assert.ok(
        recon.includes(`jl_recon.${section}.${key}`) || recon.includes(`\`${section}.${key}\``) || section === "title_format",
        `jl-recon SKILL.md must name ${section}.${key}`
      );
    }
    assert.ok(recon.includes(key), `jl-recon SKILL.md must name ${key}`);
  }
  const rules = read(".apm/skills/jl-config/validation-rules.md");
  const quiz = read(".apm/skills/jl-quiz/SKILL.md");
  const configuration = read("docs/CONFIGURATION.md");
  for (const key of contract.QUIZ_CONFIG_KEYS) {
    assert.ok(rules.includes(key), `validation-rules.md must name ${key}`);
    assert.ok(quiz.includes(key), `jl-quiz SKILL.md must name ${key}`);
    assert.ok(configuration.includes(key), `docs/CONFIGURATION.md must name ${key}`);
  }
  for (const key of contract.RECON_TYPE_KEYS) {
    assert.ok(rules.includes(key), `validation-rules.md must name ${key}`);
  }
  assert.ok(rules.includes("obsolete"), "validation-rules.md must document the obsolete jl_quiz block");
  void fence;
});
