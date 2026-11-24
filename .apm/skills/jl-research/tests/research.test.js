"use strict";

// Focused workflow checks for jl-research (JohnLudlow/agents#212 AC2).

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");

const research = readFileSync(resolve(__dirname, "../references/RESEARCH.md"), "utf8");
const flat = (text) => text.replace(/\s+/g, " ");

test("AC2: Research records evidence-backed findings", () => {
  const doc = flat(research);
  assert.match(doc, /evidence-backed findings/iu, "evidence-backed findings");
  assert.match(doc, /source/iu, "each finding records its source");
});

test("AC2: Research states a trade-off-aware recommendation", () => {
  const doc = flat(research);
  assert.match(doc, /trade-off/iu, "trade-offs presented");
  assert.match(doc, /recommendation/iu, "recommendation stated");
});

test("AC2: Research requires user acceptance before resolution", () => {
  const doc = flat(research);
  assert.match(doc, /User acceptance before resolution/iu, "acceptance gate");
  assert.match(doc, /accept or override/iu, "the stop-and-ask");
  assert.match(doc, /consider this resolved/iu, "records resolution state");
});

test("AC2: AFK execution requires explicit per-ticket permission", () => {
  const doc = flat(research);
  assert.match(doc, /AFK execution/iu, "AFK rule");
  assert.match(doc, /explicit per-ticket permission/iu, "per-ticket permission");
  assert.match(doc, /refuses to run AFK/iu, "refusal when permission is missing");
});
