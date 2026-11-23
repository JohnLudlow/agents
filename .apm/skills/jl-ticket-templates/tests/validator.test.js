"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");
const {
  getNextAcceptanceCriterion,
  validateAcceptanceCriteria,
  validateClosureReadiness,
  validateCreationOverride,
  validateStatusTransition,
  validateTicket,
  validateTitleFormat,
  DEFAULT_TITLE_PATTERNS,
} = require("../validator");

function criteria(count = 3) {
  return Array.from({ length: count }, (_, index) => {
    const id = `AC${String(index + 1).padStart(3, "0")}`;
    return `- [ ] ${id}: Record outcome ${index + 1}`;
  }).join("\n");
}

function requirementsBody(acceptanceCriteria = criteria()) {
  return `## Details

- **Status:** Draft

## Objective

Capture requirements for the feature.

## Decision Statement

What does the user need?

## Questions

- What is the expected outcome?

## Acceptance Criteria

${acceptanceCriteria}
`;
}

function requirementsTicket(overrides = {}) {
  return {
    title: "Quiz (Requirements): User requirements",
    description: "Capture user requirements",
    type: "quiz-requirements",
    status: "Draft",
    author: "jl-recon",
    date: "2026-11-21",
    related_links: "",
    parent: "",
    labels: ["recon:quiz-requirements"],
    body: requirementsBody(),
    ...overrides,
  };
}

function mapBody() {
  return `## Details

- **Status:** Draft

## Destination

Deliver a supported import flow.

## Notes

This Map covers the import design.

## Decisions So Far

No decisions yet; charting is in progress.

## Not Yet Specified (Fog of War)

No fog yet; charting is in progress.

## Out of Scope

No exclusions yet; charting is in progress.

## Open Tickets (Frontier)

No open tickets yet; charting is in progress.

## Blocked Tickets

No blocked tickets yet; charting is in progress.

## Acceptance Criteria

${criteria(5).replace(/$/gm, " (decision only)")}
`;
}

function mapTicket(overrides = {}) {
  return requirementsTicket({
    title: "Map: Import",
    type: "map",
    labels: ["recon:map"],
    body: mapBody(),
    ...overrides,
  });
}

test("validates a GitHub Requirements Quiz using native metadata and Details", () => {
  const result = validateTicket(requirementsTicket(), {
    provider: "github",
    stage: "creation",
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validates Markdown tickets from shared YAML frontmatter", () => {
  const result = validateTicket(
    {
      frontmatter: {
        title: "Quiz (Requirements): User requirements",
        description: "Capture user requirements",
        type: "quiz-requirements",
        status: "Draft",
        author: "jl-recon",
        date: "2026-11-21",
        related_links: "",
        parent: "",
      },
      body: requirementsBody(),
    },
    { provider: "markdown", stage: "creation" }
  );

  assert.equal(result.valid, true);
});

test("validates Map, Prototype, and Learn ticket creation contracts", () => {
  const prototypeBody = `## Details

- **Status:** Draft

## Research Question

Which interaction is clearer?

## Implementation Approach

**Will build:** Two disposable mockups.

**Will not build:** Production code.

## Verification

Compare both mockups with users.

## Throwaway Plan

Discard the mockups and keep the findings.

## Acceptance Criteria

${criteria()}
`;
  const learnBody = `## Details

- **Status:** Draft

## Topic

Ticket lifecycle.

## Learning Goals

- Explain ticket status transitions.

## Resources

- Shared ticket contract.

## Check Preference

Ask whether the user wants a knowledge check.

## Acceptance Criteria

${criteria()}
`;
  const scenarios = [
    { type: "map", body: mapBody(), labels: ["recon:map"] },
    { type: "prototype", body: prototypeBody, labels: ["recon:prototype"] },
    { type: "learn", body: learnBody, labels: ["recon:learn"] },
  ];

  for (const scenario of scenarios) {
    const result = validateTicket(
      requirementsTicket({
        ...scenario,
        title: `${scenario.type[0].toUpperCase()}${scenario.type.slice(1)}: Example`,
      }),
      { provider: "github", stage: "creation" }
    );
    assert.equal(result.valid, true, `${scenario.type}: ${JSON.stringify(result.errors)}`);
  }
});

test("validates populated Map tables and decisions for GitHub and Markdown", () => {
  const body = mapBody()
    .replace("No decisions yet; charting is in progress.", "- Import strategy — [Import decision](https://github.com/example/repo/issues/2) — Use batches.")
    .replace("No fog yet; charting is in progress.", "- Authentication strategy — **what** (requirements unclear).")
    .replace("No open tickets yet; charting is in progress.", "| Ticket | Type | Assignee | Status |\n| --- | --- | --- | --- |\n| [Schema](https://github.com/example/repo/issues/3) | Research | @alice | Ready |")
    .replace("No blocked tickets yet; charting is in progress.", "| Ticket | Type | Blocked by | Reason |\n| --- | --- | --- | --- |\n| [Testing](https://github.com/example/repo/issues/4) | Research | [Schema](https://github.com/example/repo/issues/3) | Waiting for schema. |");
  const ticket = mapTicket({ body });
  assert.equal(validateTicket(ticket, { provider: "github" }).valid, true);
  const { labels, body: markdownBody, ...frontmatter } = ticket;
  assert.equal(
    validateTicket({ frontmatter: { ...frontmatter, labels }, body: markdownBody }, { provider: "markdown" }).valid,
    true
  );
});

test("validates a filled Map template for GitHub and Markdown", () => {
  const template = readFileSync(resolve(__dirname, "../assets/map-ticket-template.md"), "utf8");
  const body = template.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .replace("[State the specific outcome this Map will deliver.]", "Deliver an import flow with documented errors.")
    .replace("[Record the context and constraints for this Map.]", "The existing API handles imports.");
  const markdown = mapTicket({ body });
  const { labels, body: markdownBody, ...frontmatter } = markdown;
  assert.equal(validateTicket({
    frontmatter: { ...frontmatter, labels }, body: markdownBody,
  }, { provider: "markdown" }).valid, true);
  const github = mapTicket({ body: `## Details\n\n- **Status:** Draft\n\n${body}` });
  assert.equal(validateTicket(github, { provider: "github" }).valid, true);
});

test("requires explicit Map acceptance at resolution", () => {
  const body = mapBody().replace("- **Status:** Draft", "- **Status:** Done");
  const ticket = mapTicket({ status: "Done", body, resolution: { userAccepted: false } });
  assert.ok(validateTicket(ticket, { stage: "resolution" }).errors.some(
    (error) => error.code === "resolution_not_accepted"
  ));
  assert.equal(validateTicket({
    ...ticket, resolution: { userAccepted: true },
  }, { stage: "resolution" }).valid, true);
});

test("rejects vague Map destinations and missing Notes", () => {
  const vague = validateTicket(mapTicket({
    body: mapBody().replace("Deliver a supported import flow.", "Improve the system."),
  }));
  const missingNotes = validateTicket(mapTicket({
    body: mapBody().replace("## Notes\n\nThis Map covers the import design.\n\n", ""),
  }));
  assert.ok(vague.errors.some((error) => error.code === "map_destination_vague"));
  assert.ok(missingNotes.errors.some((error) => error.code === "section_required" && error.path === "body.Notes"));
  const legacyStatus = validateTicket(mapTicket({ status: "Charting" }));
  assert.ok(legacyStatus.errors.some((error) => error.code === "invalid_status"));
});

test("requires linked decisions or an explicit explanation of an empty Map", () => {
  for (const [replacement, code] of [
    ["None.", "map_decisions_empty_note_missing"],
    ["- Use batches for import.", "map_decision_link_missing"],
  ]) {
    const result = validateTicket(mapTicket({
      body: mapBody().replace("No decisions yet; charting is in progress.", replacement),
    }));
    assert.ok(result.errors.some((error) => error.code === code), replacement);
  }
});

test("requires tagged fog items or an explicit empty note", () => {
  for (const [replacement, code] of [
    ["None.", "map_fog_empty_note_missing"],
    ["- Authentication strategy.", "map_fog_tag_missing"],
  ]) {
    const result = validateTicket(mapTicket({
      body: mapBody().replace("No fog yet; charting is in progress.", replacement),
    }));
    assert.ok(result.errors.some((error) => error.code === code), replacement);
  }
});

test("requires an explanation when a Map has no exclusions", () => {
  const result = validateTicket(mapTicket({
    body: mapBody().replace("No exclusions yet; charting is in progress.", "None."),
  }));
  assert.ok(result.errors.some((error) => error.code === "map_scope_empty_note_missing"));
});

test("rejects Map tables with missing columns, invalid status, or missing blocker details", () => {
  const changes = [
    ["No open tickets yet; charting is in progress.", "| Ticket | Type |\n| --- | --- |\n| Schema | Research |", "map_table_columns"],
    ["No open tickets yet; charting is in progress.", "| Ticket | Type | Assignee | Status |\n| --- | --- | --- | --- |\n| Schema | Research | @alice | Blocked |", "map_frontier_status_invalid"],
    ["No blocked tickets yet; charting is in progress.", "| Ticket | Type | Reason |\n| --- | --- | --- |\n| Testing | Research | Waiting |", "map_table_columns"],
    ["No blocked tickets yet; charting is in progress.", "| Ticket | Type | Blocked by | Reason |\n| --- | --- | --- | --- |\n| Testing | Research |  | Waiting |", "map_blocker_missing"],
    ["No blocked tickets yet; charting is in progress.", "| Ticket | Type | Blocked by | Reason |\n| --- | --- | --- | --- |\n| Testing | Research | Schema |  |", "map_block_reason_missing"],
    ["No blocked tickets yet; charting is in progress.", "None.", "map_table_empty_note_missing"],
    ["No blocked tickets yet; charting is in progress.", "| Ticket | Type | Blocked by | Reason |\n| --- | --- | --- | --- |\n| Testing | Research | Schema | Waiting | Extra |", "map_table_row"],
  ];
  for (const [before, after, code] of changes) {
    const result = validateTicket(mapTicket({ body: mapBody().replace(before, after) }));
    assert.ok(result.errors.some((error) => error.code === code), `${code}: ${JSON.stringify(result.errors)}`);
  }
});

test("allows only approved Map-content overrides with a confirmed issue comment", () => {
  const validation = validateTicket(mapTicket({
    body: mapBody().replace("Deliver a supported import flow.", "Improve the system."),
  }));
  const decision = { userApproved: true, reason: "Charting will refine the destination.", approvedAt: "2026-11-21T10:00:00Z" };
  const audit = {
    issueUrl: "https://github.com/example/repo/issues/5",
    createdAt: "2026-11-21T10:00:30Z",
    sourceCommentUrl: "https://github.com/example/repo/issues/5#issuecomment-6",
    sourceCommentAt: "2026-11-21T10:01:00Z",
    body: "Override map_destination_vague: Charting will refine the destination.",
  };
  assert.equal(validateCreationOverride(validation, decision).allowed, true);
  assert.equal(validateCreationOverride(validation, decision).audited, false);
  assert.equal(validateCreationOverride(validation, decision, audit).audited, true);
  assert.equal(validateCreationOverride(validation, { ...decision, userApproved: false }).allowed, false);
  assert.equal(validateCreationOverride(validation, decision, { ...audit, sourceCommentUrl: "" }).audited, false);
  assert.equal(validateCreationOverride(validation, decision, {
    ...audit, sourceCommentUrl: "https://github.com/example/repo/issues/7#issuecomment-6",
  }).audited, false);
  assert.equal(validateCreationOverride(validation, decision, { ...audit, body: decision.reason }).audited, false);
  const mixed = validateTicket(mapTicket({
    date: "bad-date",
    body: mapBody().replace("Deliver a supported import flow.", "Improve the system."),
  }));
  assert.equal(validateCreationOverride(mixed, decision).allowed, false);
  const { body, labels, ...frontmatter } = mapTicket({
    body: mapBody().replace("Deliver a supported import flow.", "Improve the system."),
  });
  const markdown = validateTicket({ frontmatter: { ...frontmatter, labels }, body }, { provider: "markdown" });
  assert.equal(validateCreationOverride(markdown, decision).allowed, false);
  assert.equal(validateCreationOverride(validateTicket(mapTicket()), decision).allowed, false);
  assert.equal(validateCreationOverride(validation, null).allowed, false);
});

test("rejects raw YAML frontmatter in GitHub issue bodies", () => {
  const result = validateTicket(
    requirementsTicket({ body: `---\ntype: quiz-requirements\n---\n${requirementsBody()}` }),
    { provider: "github", stage: "creation" }
  );

  assert.ok(result.errors.some((error) => error.code === "github_frontmatter"));
});

test("permits historical Quiz and Task records for read-only validation", () => {
  const result = validateTicket(
    {
      frontmatter: { type: "quiz", status: "Ready" },
      body: "Historical record",
    },
    { provider: "markdown", stage: "read" }
  );

  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((warning) => warning.code === "legacy_type"));
});

test("preserves historical Map lifecycle values for read-only validation", () => {
  const result = validateTicket(
    {
      frontmatter: { type: "map", status: "Completed" },
      body: "Historical Map record",
    },
    { provider: "markdown", stage: "read" }
  );

  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((warning) => warning.code === "legacy_map_status"));
});

function ownedMap(acLines, fog = "No fog yet; charting is in progress.") {
  const lines = acLines.map((text, index) => `- [ ] AC${String(index + 1).padStart(3, "0")}: ${text}`);
  while (lines.length < 5) {
    lines.push(`- [ ] AC${String(lines.length + 1).padStart(3, "0")}: Record outcome (decision only)`);
  }
  const body = mapBody()
    .replace("No fog yet; charting is in progress.", fog)
    .replace(/## Acceptance Criteria[\s\S]*$/, `## Acceptance Criteria\n\n${lines.join("\n")}\n`);
  return mapTicket({ body });
}

function doneMap(ticket) {
  return { ...ticket, status: "Done", body: ticket.body.replace("- **Status:** Draft", "- **Status:** Done"), resolution: { userAccepted: true } };
}

const codes = (issues) => issues.map((entry) => entry.code);

test("AC023: Map criterion without owner warns at creation when listed in Fog of War", () => {
  const ticket = ownedMap(["Resolve the import format."],
    "- AC001: import format — **what** (owner not yet chosen).");
  const result = validateTicket(ticket, { stage: "creation" });
  assert.equal(result.valid, true);
  assert.ok(codes(result.warnings).includes("map_criterion_owner_pending"));
});

test("AC023: Map criterion without owner errors at creation when not in Fog of War", () => {
  const result = validateTicket(ownedMap(["Resolve the import format."]));
  assert.ok(codes(result.errors).includes("map_criterion_owner_missing"));
});

test("AC023: Map criterion without owner errors at resolution even when in Fog of War", () => {
  const ticket = {
    ...doneMap(ownedMap(["Resolve the import format."], "- AC001: import format — **what** (pending).")),
  };
  const result = validateTicket(ticket, { stage: "resolution" });
  assert.ok(codes(result.errors).includes("map_criterion_owner_missing"));
});

test("AC023: accepts provider-supported owner links in AC text", () => {
  const hash = ownedMap(["Resolve the format. Research: #12", "Try it. Prototype: AB#34"]);
  assert.equal(validateTicket(hash, { provider: "github" }).valid, true);
  const link = ownedMap(["Resolve the format. Research: [Format](https://github.com/example/repo/issues/12)"]);
  assert.equal(validateTicket(link, { provider: "github" }).valid, true);
  const { labels, body, ...frontmatter } = link;
  assert.equal(validateTicket({ frontmatter: { ...frontmatter, labels }, body }, { provider: "markdown" }).valid, true);
  const hashMd = ownedMap(["Resolve the format. Research: #12"]);
  const md = { labels: hashMd.labels, body: hashMd.body };
  const { labels: l2, body: b2, ...fm2 } = hashMd;
  assert.ok(codes(validateTicket({ frontmatter: { ...fm2, labels: l2 }, body: b2 }, { provider: "markdown" }).errors)
    .includes("map_criterion_owner_link_invalid"));
  assert.ok(md.body);
});

test("AC023: rejects a link without an owner type", () => {
  const result = validateTicket(ownedMap(["Resolve the format. See #12"]));
  assert.ok(codes(result.errors).includes("map_criterion_owner_type_missing"));
});

test("AC023: decision-only criteria need no owner", () => {
  const result = validateTicket(doneMap(ownedMap(["Choose the name (decision only)"])), { stage: "resolution" });
  assert.equal(result.valid, true);
});

test("AC023: Implementation tickets cannot own Map criteria", () => {
  const result = validateTicket(ownedMap(["Build the importer. Implementation: #12"]));
  assert.ok(codes(result.errors).includes("map_criterion_owner_implementation"));
});

test("AC023: closed or deleted owner flags an unchecked criterion for re-review, user may override", () => {
  const ticket = doneMap(ownedMap(["Resolve the format. Research: #12"]));
  const flagged = validateTicket(ticket, { stage: "resolution", ownerStates: { "#12": "closed" } });
  assert.ok(codes(flagged.errors).includes("map_owner_review_required"));
  const deleted = validateTicket(ticket, { stage: "resolution", ownerStates: { "#12": "deleted" } });
  assert.ok(codes(deleted.errors).includes("map_owner_review_required"));
  const creation = validateTicket(ticket, { stage: "creation", ownerStates: { "#12": "closed" } });
  assert.ok(codes(creation.warnings).includes("map_owner_review_required"));
  const overridden = validateTicket(ticket, {
    stage: "resolution",
    ownerStates: { "#12": "closed" },
    ownerReviewOverrides: [{ id: "AC001", userApproved: true, reason: "Owner finished.", approvedAt: "2026-11-23T10:00:00Z" }],
  });
  assert.equal(overridden.valid, true);
  assert.ok(codes(overridden.warnings).includes("map_owner_review_overridden"));
  const incomplete = validateTicket(ticket, {
    stage: "resolution",
    ownerStates: { "#12": "closed" },
    ownerReviewOverrides: [{ id: "AC001", userApproved: true, reason: "", approvedAt: "2026-11-23T10:00:00Z" }],
  });
  assert.ok(codes(incomplete.errors).includes("map_owner_review_required"));
});

test("AC023: historical Maps are not checked for owner links", () => {
  const body = `## Acceptance Criteria\n\n- [ ] AC001: Resolve the format.\n`;
  const result = validateTicket({ frontmatter: { type: "map", status: "Charting" }, body }, { provider: "markdown", stage: "read" });
  assert.equal(result.valid, true);
  assert.ok(!codes(result.errors).some((code) => code.startsWith("map_criterion_owner")));
});

test("read-only validation of historical records mutates nothing and sets no labels", () => {
  const records = [
    ...["quiz", "task"].map((type) => ({ type, status: "Ready" })),
    ...["Charting", "Walked", "Completed", "Stale"].map((status) => ({ type: "map", status })),
  ];

  for (const fields of records) {
    for (const provider of ["markdown", "github"]) {
      const ticket =
        provider === "markdown"
          ? { frontmatter: { ...fields, labels: ["legacy"] }, body: "Historical record" }
          : { ...fields, labels: ["legacy"], body: "Historical record" };
      const before = JSON.stringify(ticket);
      const deepFreeze = (value) => {
        if (value && typeof value === "object" && !Object.isFrozen(value)) {
          Object.freeze(value);
          Object.values(value).forEach(deepFreeze);
        }
        return value;
      };
      deepFreeze(ticket);

      const result = validateTicket(ticket, { provider, stage: "read" });

      assert.equal(result.valid, true, `${fields.type}/${fields.status}`);
      assert.equal(JSON.stringify(ticket), before);
      assert.deepEqual((ticket.frontmatter ?? ticket).labels, ["legacy"]);
      assert.equal("labels" in result, false);
      assert.equal("mutation" in result, false);
    }
  }
});

test("rejects legacy Quiz and Task types for new tickets", () => {
  const result = validateTicket(
    requirementsTicket({ type: "task" }),
    { provider: "github", stage: "creation" }
  );

  assert.ok(result.errors.some((error) => error.code === "invalid_type"));
});

test("requires atomic, sequential, unique AC identifiers", () => {
  const valid = validateAcceptanceCriteria(criteria());
  const duplicate = validateAcceptanceCriteria(
    "- [ ] AC001: First outcome\n- [ ] AC001: Second outcome"
  );
  const compoundParagraph = validateAcceptanceCriteria(
    "AC001: First outcome. AC002: Second outcome."
  );

  assert.equal(valid.valid, true);
  assert.ok(duplicate.errors.some((error) => error.code === "ac_sequence"));
  assert.ok(compoundParagraph.errors.some((error) => error.code === "ac_format"));
});

test("does not require Research findings at creation, but requires them at resolution", () => {
  const researchBody = `## Details

- **Status:** Draft

## Investigation Goal

What are the available approaches?

## Research Scope

**In scope:** Compare the approaches.

**Out of scope:** Production implementation.

## Acceptance Criteria

${criteria()}
`;
  const ticket = requirementsTicket({
    type: "research",
    title: "Research: Available approaches",
    labels: ["recon:research"],
    body: researchBody,
  });

  assert.equal(
    validateTicket(ticket, { provider: "github", stage: "creation" }).valid,
    true
  );

  const resolution = validateTicket(
    {
      ...ticket,
      status: "Done",
      body: `${researchBody.replace("- **Status:** Draft", "- **Status:** Done")}\n## Findings\nEvidence from the investigation.\n\n## Recommendation\nRecommend option A because the evidence supports it.\n`,
      resolution: { userAccepted: true },
    },
    { provider: "github", stage: "resolution" }
  );

  assert.equal(resolution.valid, true);
});

test("blocks resolution when Research evidence or user acceptance is missing", () => {
  const result = validateTicket(
    requirementsTicket({
      type: "research",
      labels: ["recon:research"],
      status: "Done",
      resolution: { userAccepted: false },
    }),
    { provider: "github", stage: "resolution" }
  );

  assert.ok(result.errors.some((error) => error.code === "missing_resolution_section"));
  assert.ok(result.errors.some((error) => error.code === "resolution_not_accepted"));
});

test("requires requirements quiz confirmation and acknowledgement of open questions", () => {
  const mapFogUrl = "https://github.com/example/repo/issues/2#issuecomment-2";
  const ticket = requirementsTicket({
    status: "Done",
    labels: ["recon:quiz-requirements", "recon:open-questions"],
    body: `${requirementsBody().replace("- **Status:** Draft", "- **Status:** Done")}\n## Confirmed Requirements\nThe user confirmed the requirements.\n\n## Open Questions\n- [Q1] How should this work? ${mapFogUrl}\n`,
    resolution: {
      requirementsConfirmed: true,
      openQuestionsAcknowledged: false,
      openQuestions: [
        {
          id: "Q1",
          text: "How should this work?",
          mapFogUrl,
          acknowledged: false,
        },
      ],
    },
  });
  const result = validateTicket(ticket, { provider: "github", stage: "resolution" });

  assert.ok(result.errors.some((error) => error.code === "open_questions_unacknowledged"));
});

test("validates open-question IDs, Map Fog of War links, acknowledgement, and labels", () => {
  const mapFogUrl = "https://github.com/example/repo/issues/2#issuecomment-3";
  const body = `${requirementsBody().replace("- **Status:** Draft", "- **Status:** Done")}\n## Confirmed Requirements\nThe user confirmed the requirements.\n\n## Open Questions\n- [Q1] How should this work? ${mapFogUrl}\n`;
  const ticket = requirementsTicket({
    status: "Done",
    labels: ["recon:quiz-requirements", "recon:open-questions"],
    body,
    resolution: {
      requirementsConfirmed: true,
      openQuestionsAcknowledged: true,
      openQuestions: [
        {
          id: "Q1",
          text: "How should this work?",
          mapFogUrl,
          acknowledged: true,
        },
      ],
    },
  });
  assert.equal(validateTicket(ticket, { provider: "github", stage: "resolution" }).valid, true);

  const invalid = validateTicket(
    {
      ...ticket,
      labels: ["recon:quiz-requirements"],
      resolution: {
        ...ticket.resolution,
        openQuestions: [
          { id: "Q2", text: "How should this work?", mapFogUrl: "", acknowledged: false },
        ],
      },
    },
    { provider: "github", stage: "resolution" }
  );
  assert.ok(invalid.errors.some((error) => error.code === "open_question_id_invalid"));
  assert.ok(invalid.errors.some((error) => error.code === "open_question_map_link_missing"));
  assert.ok(invalid.errors.some((error) => error.code === "open_question_unacknowledged"));
  assert.ok(invalid.errors.some((error) => error.code === "open_questions_label_missing"));

  const staleLabel = validateTicket(
    {
      ...ticket,
      body: `${ticket.body}\n`,
      resolution: { ...ticket.resolution, openQuestions: [] },
    },
    { provider: "github", stage: "resolution" }
  );
  assert.ok(staleLabel.errors.some((error) => error.code === "open_questions_label_stale"));
});

test("keeps a deferred Understanding Quiz open", () => {
  const body = `## Details

- **Status:** Ready

## Goal Model

The user wants a reliable import.

## Questions

- What happens when a record is missing?

## Acceptance Criteria

${criteria()}
`;
  const result = validateTicket(
    requirementsTicket({
      type: "quiz-understanding",
      labels: ["recon:quiz-understanding"],
      status: "Done",
      body,
      resolution: { outcome: "defer", userChosen: true, reason: "Discuss later." },
    }),
    { provider: "github", stage: "resolution" }
  );

  assert.ok(result.errors.some((error) => error.code === "defer_must_remain_open"));
});

test("allows a user-chosen Learn check skip without fabricated results", () => {
  const body = `## Details

- **Status:** Done

## Topic

Ticket lifecycle.

## Learning Goals

- Explain ticket status transitions.

## Resources

- Shared ticket contract.

## Check Preference

The user chose not to take a knowledge check.

## Takeaways

The user can explain when a ticket moves to Done.

## Acceptance Criteria

${criteria()}
`;
  const result = validateTicket(
    requirementsTicket({
      type: "learn",
      status: "Done",
      labels: ["recon:learn"],
      body,
      resolution: { outcome: "skip", userChosen: true, reason: "The user did not need a check." },
    }),
    { provider: "github", stage: "resolution" }
  );

  assert.equal(result.valid, true);
});

test("requires external-only scope for Prerequisite tickets", () => {
  const body = `## Details

- **Status:** Draft

## Work Scope

**Will do:** Ask the vendor to enable access.

**Will not do:** Edit repository source files.

## Decision Unblocked

Choose the vendor integration.

## Evidence Plan

Confirm access in the vendor portal.

## Acceptance Criteria

${criteria()}
`;
  assert.equal(
    validateTicket(
      requirementsTicket({
        type: "prerequisite",
        title: "Prerequisite: Vendor access",
        labels: ["recon:prerequisite"],
        body,
      }),
      { provider: "github", stage: "creation" }
    ).valid,
    true
  );

  const invalid = validateTicket(
    requirementsTicket({
      type: "prerequisite",
      title: "Prerequisite: Vendor access",
      labels: ["recon:prerequisite"],
      body: body.replace("Ask the vendor to enable access.", "Edit the repository source code."),
    }),
    { provider: "github", stage: "creation" }
  );
  assert.ok(invalid.errors.some((error) => error.code === "prerequisite_repository_work"));
});

test("enforces lifecycle transitions and named blockers", () => {
  assert.equal(validateStatusTransition("Draft", "Ready").valid, true);
  assert.ok(
    validateStatusTransition("Ready", "Blocked").errors.some(
      (error) => error.code === "blocker_required"
    )
  );
  assert.equal(
    validateStatusTransition("Ready", "Blocked", {
      blocker: "Waiting for access",
      reason: "The vendor has not enabled the account.",
    }).valid,
    true
  );
  assert.ok(
    validateStatusTransition("Blocked", "Ready").errors.some(
      (error) => error.code === "blocker_not_cleared"
    )
  );
});

test("requires closure evidence before moving In Progress to Done", () => {
  assert.ok(
    validateStatusTransition("In Progress", "Done").errors.some(
      (error) => error.code === "closure_not_ready"
    )
  );
  assert.equal(validateStatusTransition("In Progress", "Done", { closureReady: true }).valid, false);
  assert.equal(validateStatusTransition("In Progress", "Done", {
    criteria: [{
      id: "AC001",
      checked: true,
      owner: "https://github.com/example/repo/issues/2",
      evidence: "Verified implementation.",
      userConfirmed: true,
      missingRequirementsInvited: true,
      userConfirmedAt: "2026-11-21T10:00:00Z",
      sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-1",
      sourceCommentAt: "2026-11-21T10:01:00Z",
      checkedAt: "2026-11-21T10:02:00Z",
    }],
  }).valid, true);
});

test("selects only the first unchecked criterion for review", () => {
  const next = getNextAcceptanceCriterion([
    { id: "AC001", checked: true },
    { id: "AC002", checked: false },
    { id: "AC003", checked: false },
  ]);

  assert.equal(next.id, "AC002");
  assert.equal(getNextAcceptanceCriterion([
    { id: "AC001", checked: false },
    { id: "AC002", checked: false },
  ], [{
    id: "AC001",
    userConfirmed: true,
    reason: "Removed from scope.",
    userConfirmedAt: "2026-11-21T10:00:00Z",
    sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-2",
    sourceCommentAt: "2026-11-21T10:01:00Z",
  }]).id, "AC002");
});

test("requires source comment after confirmation and before checking", () => {
  const result = validateClosureReadiness([
    {
      id: "AC001",
      checked: true,
      owner: "https://github.com/example/repo/issues/212",
      evidence: "Focused tests pass.",
      userConfirmed: true,
      missingRequirementsInvited: true,
      userConfirmedAt: "2026-11-21T10:00:00Z",
      sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-1",
      sourceCommentAt: "2026-11-21T10:01:00Z",
      checkedAt: "2026-11-21T10:02:00Z",
    },
  ]);

  assert.equal(result.valid, true);
});

test("blocks closure when an AC is checked before its decision comment", () => {
  const result = validateClosureReadiness([
    {
      id: "AC001",
      checked: true,
      userConfirmed: true,
      userConfirmedAt: "2026-11-21T10:02:00Z",
      sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-1",
      sourceCommentAt: "2026-11-21T10:01:00Z",
      checkedAt: "2026-11-21T10:03:00Z",
    },
  ]);

  assert.ok(result.errors.some((error) => error.code === "review_order"));
});

test("requires a missing-requirements invitation and linked owner for each confirmed AC", () => {
  const result = validateClosureReadiness([
    {
      id: "AC001",
      checked: true,
      owner: "ticket #212",
      evidence: "Focused tests pass.",
      userConfirmed: true,
      missingRequirementsInvited: false,
      userConfirmedAt: "2026-11-21T10:00:00Z",
      sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-1",
      sourceCommentAt: "2026-11-21T10:01:00Z",
      checkedAt: "2026-11-21T10:02:00Z",
    },
  ]);

  assert.ok(result.errors.some((error) => error.code === "criterion_confirmation_missing"));
  assert.ok(result.errors.some((error) => error.code === "criterion_owner_missing"));
});

test("blocks checking a later criterion before earlier criteria", () => {
  const result = validateClosureReadiness([
    { id: "AC001", checked: false },
    {
      id: "AC002",
      checked: true,
      owner: "https://github.com/example/repo/issues/212",
      evidence: "The linked ticket is complete.",
      userConfirmed: true,
      missingRequirementsInvited: true,
      userConfirmedAt: "2026-11-21T10:00:00Z",
      sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-2",
      sourceCommentAt: "2026-11-21T10:01:00Z",
      checkedAt: "2026-11-21T10:02:00Z",
    },
  ]);

  assert.ok(result.errors.some((error) => error.code === "review_order"));
});

test("allows an unmet criterion only after user-approved re-scoping is recorded", () => {
  const result = validateClosureReadiness(
    [{ id: "AC001", checked: false }],
    [{
      id: "AC001",
      reason: "The user removed this outcome from scope.",
      userConfirmed: true,
      userConfirmedAt: "2026-11-21T10:00:00Z",
      sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-2",
      sourceCommentAt: "2026-11-21T10:01:00Z",
    }]
  );

  assert.equal(result.valid, true);
});

test("requires re-scope approval before its source comment", () => {
  const result = validateClosureReadiness(
    [{ id: "AC001", checked: false }],
    [{
      id: "AC001",
      reason: "The user removed this outcome from scope.",
      userConfirmed: true,
      userConfirmedAt: "2026-11-21T10:02:00Z",
      sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-3",
      sourceCommentAt: "2026-11-21T10:01:00Z",
    }]
  );

  assert.ok(result.errors.some((error) => error.code === "rescope_order"));
});

test("re-scoping one AC does not bypass checks for the other criteria", () => {
  const rescope = [{
    id: "AC001",
    reason: "Removed from scope after user review.",
    userConfirmed: true,
    userConfirmedAt: "2026-11-21T10:00:00Z",
    sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-2",
    sourceCommentAt: "2026-11-21T10:01:00Z",
  }];
  const criteria = [
    { id: "AC001", checked: false },
    { id: "AC002", checked: false },
  ];
  assert.ok(validateClosureReadiness(criteria, rescope).errors.some(
    (error) => error.code === "criterion_unchecked" && error.path === "AC002"
  ));
  assert.ok(validateClosureReadiness(
    [criteria[0], { id: "AC002", checked: true }],
    rescope
  ).errors.some((error) => error.code === "criterion_confirmation_missing"));
  assert.ok(validateClosureReadiness([criteria[0]], [
    { ...rescope[0], id: "AC009" },
  ]).errors.some((error) => error.code === "rescope_invalid"));

  const confirmed = {
    id: "AC002",
    checked: true,
    owner: "https://github.com/example/repo/issues/212",
    evidence: "Focused tests pass.",
    userConfirmed: true,
    missingRequirementsInvited: true,
    userConfirmedAt: "2026-11-21T10:02:00Z",
    sourceCommentUrl: "https://github.com/example/repo/issues/1#issuecomment-3",
    sourceCommentAt: "2026-11-21T10:03:00Z",
    checkedAt: "2026-11-21T10:04:00Z",
  };
  assert.equal(validateClosureReadiness([criteria[0], confirmed], rescope).valid, true);
  assert.ok(validateClosureReadiness([criteria[0], {
    ...confirmed, userConfirmedAt: "2026-11-21T10:00:30Z",
  }], rescope).errors.some((error) => error.code === "review_order"));
});

const TITLE_CASES = [
  ["map", "Map", "destination"],
  ["research", "Research", "topic"],
  ["prototype", "Prototype", "concept"],
  ["quiz-requirements", "Quiz (Requirements)", "question"],
  ["quiz-understanding", "Quiz (Understanding)", "question"],
  ["learn", "Learn", "topic"],
  ["prerequisite", "Prerequisite", "work"],
];

test("default title patterns cover the seven new ticket types", () => {
  assert.equal(Object.keys(DEFAULT_TITLE_PATTERNS).length, 7);
  for (const [type, prefix, variable] of TITLE_CASES) {
    assert.equal(DEFAULT_TITLE_PATTERNS[type.replace("-", "_")], `${prefix}: {${variable}}`);
  }
});

for (const [type, prefix] of TITLE_CASES) {
  test(`validateTitleFormat accepts and rejects default title for ${type}`, () => {
    assert.equal(validateTitleFormat(type, `${prefix}: Something real`).valid, true);
    assert.equal(validateTitleFormat(type.replace("-", "_"), `${prefix}: Something real`).valid, true);
    const wrongPrefix = validateTitleFormat(type, "Other: Something real");
    assert.ok(wrongPrefix.errors.some((error) => error.code === "title_prefix"));
    const missingVariable = validateTitleFormat(type, `${prefix}:   `);
    assert.ok(missingVariable.errors.some((error) => error.code === "title_variable_missing"));
    assert.equal(validateTitleFormat(type, `${prefix}:`).valid, false);
    assert.equal(validateTitleFormat(type, "").valid, false);
  });
}

test("validateTitleFormat rejects unknown and legacy types", () => {
  assert.ok(validateTitleFormat("quiz", "Quiz: Anything").errors.some((e) => e.code === "title_type_unknown"));
  assert.ok(validateTitleFormat("task", "Task: Anything").errors.some((e) => e.code === "title_type_unknown"));
});

test("validateTitleFormat accepts a configured override pattern", () => {
  const overrides = { map: "[Map] {destination}", quiz_requirements: "Ask: {question}?" };
  assert.equal(validateTitleFormat("map", "[Map] Import data", overrides).valid, true);
  assert.equal(validateTitleFormat("map", "Map: Import data", overrides).valid, false);
  assert.equal(validateTitleFormat("map", "[Map] ", overrides).valid, false);
  assert.equal(validateTitleFormat("quiz-requirements", "Ask: Who owns it?", overrides).valid, true);
  assert.equal(validateTitleFormat("quiz-requirements", "Ask: Who owns it", overrides).valid, false);
  // Other types keep defaults; invalid overrides fall back to the default.
  assert.equal(validateTitleFormat("learn", "Learn: Topic", overrides).valid, true);
  assert.equal(validateTitleFormat("learn", "Learn: Topic", { learn: "no placeholder" }).valid, true);
  assert.equal(validateTitleFormat("learn", "Learn: Topic", { learn: 5 }).valid, true);
});

test("validateTicket checks titles at creation, honoring overrides", () => {
  const base = requirementsTicket();
  const bad = validateTicket({ ...base, title: "Requirements for users" }, { provider: "github", stage: "creation" });
  assert.ok(bad.errors.some((error) => error.code === "title_prefix"));
  const overridden = validateTicket(
    { ...base, title: "Ask: User requirements" },
    { provider: "github", stage: "creation", titleFormat: { quiz_requirements: "Ask: {question}" } }
  );
  assert.equal(overridden.errors.some((error) => error.code.startsWith("title_")), false);
});

test("validateTicket does not check historical or non-creation titles", () => {
  const legacy = validateTicket(
    { title: "Old quiz title", type: "quiz", status: "Done", body: "" },
    { provider: "github", stage: "read" }
  );
  assert.equal(legacy.errors.some((error) => error.code.startsWith("title_")), false);
  const historicalMap = validateTicket(
    { ...mapTicket(), title: "Legacy map name", status: "Completed" },
    { provider: "github", stage: "read" }
  );
  assert.equal(historicalMap.errors.some((error) => error.code.startsWith("title_")), false);
  const resolution = validateTicket(
    { ...requirementsTicket(), title: "Freeform title" },
    { provider: "github", stage: "resolution" }
  );
  assert.equal(resolution.errors.some((error) => error.code.startsWith("title_")), false);
});


// AC016: historical issues are not rewritten.
const HISTORICAL_FIXTURES = [
  {
    name: "legacy Quiz",
    fields: { type: "quiz", status: "Ready", title: "Quiz: old topic" },
    body: "## Questions\r\n\r\n1. Old question?\r\n\r\n## Answers\r\n- unanswered\r\n",
  },
  {
    name: "legacy Task",
    fields: { type: "task", status: "Ready", title: "Task: old work" },
    body: "## Task\n\n- [ ] Do the thing\n- [x] Done thing\n",
  },
  {
    name: "old Map (Walked)",
    fields: { type: "map", status: "Walked", title: "Map: old" },
    body: "# Old Map\n\n| Step | Status |\n|---|---|\n| a | Charting |\n\nTrailing space \n",
  },
  {
    name: "old Map (Stale)",
    fields: { type: "map", status: "Stale", title: "Map: stale" },
    body: "# Stale Map\n\u00e9\u00e8 unicode and no final newline",
  },
];

function deepFreezeValue(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreezeValue);
  }
  return value;
}

test("read-mode validation does not modify deep-frozen input", () => {
  for (const fixture of HISTORICAL_FIXTURES) {
    for (const provider of ["github", "markdown"]) {
      const ticket = deepFreezeValue(
        provider === "markdown"
          ? { frontmatter: { ...fixture.fields, labels: ["legacy"] }, body: fixture.body }
          : { ...fixture.fields, labels: ["legacy"], body: fixture.body }
      );
      const before = JSON.stringify(ticket);

      assert.doesNotThrow(
        () => validateTicket(ticket, { provider, stage: "read" }),
        `${fixture.name}/${provider}`
      );
      assert.equal(JSON.stringify(ticket), before, `${fixture.name}/${provider}`);
      assert.equal(Object.isFrozen(ticket), true);
    }
  }
});

test("historical issue bodies are byte-unchanged after read and validation helpers run", () => {
  for (const fixture of HISTORICAL_FIXTURES) {
    const originalBytes = Buffer.from(fixture.body, "utf8");
    const options = deepFreezeValue({ stage: "read", provider: "github", overrides: {} });
    const ticket = { ...fixture.fields, labels: ["legacy"], body: fixture.body };

    validateTicket(ticket, options);
    validateTicket(
      { frontmatter: { ...fixture.fields }, body: fixture.body },
      { provider: "markdown", stage: "read" }
    );
    validateTitleFormat(fixture.fields.type, fixture.fields.title);
    const section = deepFreezeValue({ text: fixture.body }).text;
    validateAcceptanceCriteria(section);
    const parsed = validateAcceptanceCriteria(section).criteria;
    deepFreezeValue(parsed);
    getNextAcceptanceCriterion(parsed);
    validateClosureReadiness(parsed);

    assert.equal(ticket.body, fixture.body, fixture.name);
    assert.ok(Buffer.from(ticket.body, "utf8").equals(originalBytes), fixture.name);
    assert.deepEqual(ticket.labels, ["legacy"]);
    assert.equal(ticket.type, fixture.fields.type);
    assert.equal(ticket.status, fixture.fields.status);
    assert.equal(ticket.title, fixture.fields.title);
  }
});