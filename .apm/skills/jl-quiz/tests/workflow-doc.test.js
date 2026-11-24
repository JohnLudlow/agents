"use strict";

// Focused workflow checks for jl-quiz (JohnLudlow/agents#210 AC021–AC029).

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");

const skillDir = resolve(__dirname, "..");
const requirements = readFileSync(resolve(skillDir, "references/REQUIREMENTS_QUIZ.md"), "utf8");
const understanding = readFileSync(resolve(skillDir, "references/UNDERSTANDING_QUIZ.md"), "utf8");

const flat = (text) => text.replace(/\s+/g, " ");

test("AC021: Requirements Quiz covers goal-model corrections", () => {
  const section = flat(
    requirements.slice(
      requirements.indexOf("## State the goal model"),
      requirements.indexOf("## Confirmed requirements"),
    ),
  );
  assert.ok(section.includes("The user can confirm or correct the agent's goal model"), "user can correct the goal model");
  assert.ok(section.includes("records the corrected model as the opening of the record"), "corrected model recorded");
});

test("AC022: Understanding Quiz covers skip and defer outcomes", () => {
  assert.ok(understanding.includes("**Skipped** — the user chose to skip the check"), "skipped state recorded");
  assert.ok(understanding.includes("**Deferred** — the user deferred the check to a later time or context"), "deferred state recorded");
});

test("AC023: Understanding Quiz covers mismatch clarification and proceed decisions", () => {
  assert.ok(understanding.includes("Clarify mismatches by default (AC013)"), "mismatch clarified by default");
  assert.ok(understanding.includes("records the user's explicit decision to proceed"), "explicit proceed decision recorded");
});

test("AC024: Understanding Quiz covers issue-linking for its tickets", () => {
  const section = flat(understanding.slice(understanding.indexOf("## Understanding Quiz tickets")));
  assert.ok(section.includes("provider-native links"), "provider-native links");
  assert.ok(section.includes("AB#nnn"), "Azure DevOps link form");
  assert.ok(section.includes("floating path or number"), "no floating references");
});

test("AC025: Understanding Quiz requires user approval before ticket creation", () => {
  const section = flat(understanding.slice(understanding.indexOf("## Understanding Quiz tickets")));
  assert.ok(section.includes("The user approves ticket creation"), "user approval required");
  assert.ok(section.includes("validated against"), "ticket validated before creation");
});

test("AC026: both Quiz workflows cover the shared acceptance-criteria format", () => {
  for (const [name, doc] of [["Requirements", requirements], ["Understanding", understanding]]) {
    assert.match(doc, /AC001:/u, `${name} must mention the shared AC001: ID form (AC026)`);
    assert.match(doc, /sequential/u, `${name} must mention sequential numbering (AC026)`);
  }
});

test("AC027: both Quiz workflows cover sequential acceptance-criterion IDs", () => {
  for (const [name, doc] of [["Requirements", requirements], ["Understanding", understanding]]) {
    assert.match(doc, /sequential/iu, `${name} must reference sequential IDs (AC027)`);
  }
});

test("AC028: both Quiz workflows state one independently checkable outcome per criterion", () => {
  for (const [name, doc] of [["Requirements", requirements], ["Understanding", understanding]]) {
    assert.match(doc, /one independently checkable outcome per criterion/iu, `${name} must state the one-outcome-per-criterion format (AC028)`);
  }
});

test("AC029: both Quiz workflows use the unique sequential AC001: ID form", () => {
  for (const [name, doc] of [["Requirements", requirements], ["Understanding", understanding]]) {
    assert.match(doc, /AC001:/u, `${name} must use the AC001: ID form (AC029)`);
  }
});
