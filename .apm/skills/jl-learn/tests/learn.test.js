"use strict";

// Focused workflow checks for jl-learn (JohnLudlow/agents#212 AC1).

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");

const learn = readFileSync(resolve(__dirname, "../references/LEARN.md"), "utf8");
const flat = (text) => text.replace(/\s+/g, " ");

test("AC1: Learn provides explanations, resources, and takeaways", () => {
  const doc = flat(learn);
  assert.match(doc, /## Explain/iu, "explain the goal/concept");
  assert.match(doc, /resources/iu, "list of resources");
  assert.match(doc, /takeaway/iu, "key takeaways");
});

test("AC1: Learn asks whether a knowledge check is useful", () => {
  assert.ok(learn.includes("Would you like me to run a quick knowledge check on this?"), "the check offer");
});

test("AC1: completed and user-skipped check outcomes remain distinct", () => {
  const doc = flat(learn);
  assert.match(doc, /\*\*Completed\*\*/iu, "completed state");
  assert.match(doc, /\*\*Skipped\*\*/iu, "skipped state");
  assert.match(doc, /never recorded as completed or verified/iu, "skip is distinct");
});
