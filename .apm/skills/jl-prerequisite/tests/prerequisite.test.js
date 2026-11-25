"use strict";

// Focused workflow checks for jl-prerequisite (JohnLudlow/agents#212 AC3).

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");

const prerequisite = readFileSync(resolve(__dirname, "../references/PREREQUISITE.md"), "utf8");
const flat = (text) => text.replace(/\s+/g, " ");

test("AC3: Prerequisite work is limited to external/manual unblockers with verifiable evidence", () => {
  const doc = flat(prerequisite);
  assert.match(doc, /external\/manual unblocker/iu, "external/manual unblocker scope");
  assert.match(doc, /verifiable evidence/iu, "verifiable evidence recorded");
});

test("AC3: source, documentation, and configuration edits are routed to Implementation instead", () => {
  const doc = flat(prerequisite);
  assert.match(doc, /routed to Implementation/iu, "routed to Implementation");
  assert.match(doc, /source, documentation or configuration edit/iu, "the three edit kinds listed");
});
