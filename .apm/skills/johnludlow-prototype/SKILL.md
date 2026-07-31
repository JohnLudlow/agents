---
name: johnludlow-prototype
description: "Prototyping skill: generates a time-boxed, stack-agnostic prototype on its own branch after running johnludlow-quiz to confirm shared understanding. Use when the user wants to sanity-check an idea, try out a technique, or build a throwaway demo before committing to real implementation."
---

# Prototype

## Overview

This skill produces a time-boxed prototype — runnable code, an IaC deployment,
a visual/UX mockup, a docs sample, or an architecture sketch — that
demonstrates one technique against one stated requirement set. It never
starts generating without first running `johnludlow-quiz` to confirm what is
actually being tried and why; a prototype built on an assumption is wasted
effort twice over.

A prototype is not a first draft of production code. It exists to answer one
question — "does this technique work / feel right / meet the requirement?" —
and then either evolves or gets discarded. Keep that framing throughout: the
`johnludlow-quiz` questions below exist to pin down the question before any
artifact gets written.

## Core Model

Every prototype session carries the same state:

- **Objective** — the one question the prototype exists to answer.
- **Technique** — the specific approach, pattern, or idea being demonstrated.
- **Stack** — the language, framework, or tooling the prototype is built in.
- **Keep-vs-discard intent** — whether the user expects to evolve this into
  real work or throw it away once the question is answered.
- **Branch** — the git branch the prototype lives on; never the working
  branch the user was already on.

## When Invoked

Follow these steps in order. Do not skip ahead to Generation while any step
below remains open.

### 1. Run johnludlow-quiz

Load and run `johnludlow-quiz` now. Its BLOCKER 0 (preference resolution) and
mode selection apply unchanged — this skill does not duplicate or override
them.

Surface these decisions through the quiz (fold synonyms together; do not ask
about the same decision twice):

- **Requirements** — what must the prototype demonstrate to answer the
  objective?
- **Interesting technique** — which specific pattern, library, or idea is
  being tried?
- **Tech stack** — which language/framework/tooling?
- **Audience & purpose** — who looks at this, and what decision does it feed?
- **Keep vs discard** — is this expected to evolve into real work, or answer
  the question and get thrown away?
- **Acceptance criteria** — how will the user know the prototype answered the
  objective?
- **Output location** — confirm the branch-based convention below (step 2)
  fits, or surface any objection now rather than after the branch exists.

**Completion criterion:** the quiz has reached and the user has confirmed
shared understanding — objective plus every resolved decision restated back
to them — exactly as `johnludlow-quiz` requires. Do not proceed to Generation
until this is confirmed.

### 2. Create the branch

Create `prototype/<slug>`, where `<slug>` is a short kebab-case derivation of
the confirmed objective. The prototype lives on its own branch, never on the
branch the user was already on.

If the invoking agent lacks branch-creation permission, stop and ask the user
how they want to proceed. Do not fall back to writing the prototype onto the
current branch without asking — that silently changes the blast radius of
the work the user agreed to.

**Completion criterion:** the branch exists and is checked out, or the user
has explicitly told you how to proceed without one.

### 3. Scaffold the artifact

Build the artifact the quiz-agreed requirements and technique call for, in
the confirmed stack. The shape is deliberately broad — runnable code, an IaC
deployment, a visual/UX mockup, a docs sample, an architecture sketch — so
scaffold whichever of these the objective actually needs, not a default.

Keep it time-boxed: a prototype demonstrates the technique, it does not
productionise it. Stop scaffolding once the technique is demonstrated against
the confirmed acceptance criteria — resist the pull to keep polishing.

### 4. Write the README

Write `README.md` from
[`assets/prototype-readme-template.md`](./assets/prototype-readme-template.md),
populated with the quiz-agreed objective, technique, stack, how to run it, and
keep/discard status.

### 5. Add and run the self-check

Add a self-check — a script, or explicit run/verify steps — that confirms the
technique is actually demonstrated, not just that the code compiles or the
file exists.

Run the self-check if the invoking agent has permission to execute it in this
environment. If not, hand the exact steps to the user in your response and
wait for them to confirm the result before treating the prototype as done.

**Completion criterion:** the self-check has been run (by you or the user)
and its result — pass or fail — is known, not merely written down.

### 6. Route to review, then hand off

If keep-vs-discard was resolved as **evolve**, invoke `johnludlow-feature-reviewer`
on the prototype before handoff. If it was resolved as **discard**, skip the
reviewer — a throwaway artifact does not need a quality gate.

Hand off with the branch left local. Never push or open a PR unless the user
explicitly asks for it in this session. If keep-vs-discard is **discard**,
offer to delete the branch; if **evolve**, keep it and say so.

## Guardrails

Refuse, and explain why, rather than working around:

- Anything outside the objective the quiz confirmed. If the request has grown
  since confirmation, re-run the quiz on the delta rather than absorbing it
  silently.
- Production-grade deliverables. A request for hardened, fully-tested,
  deployment-ready output is not a prototype request — say so and ask whether
  they want the prototype skill or a real implementation flow.
- Mutating a real environment (deploying to a live cloud account, writing to
  production data) without explicit approval for that specific action, even
  if the user already approved the prototype in general.
- Anything that requires secrets or credentials to run. A prototype that only
  works with real credentials has failed to be a prototype.

## Requirements

The agent MUST:

- Run `johnludlow-quiz` to completion — objective and every decision
  confirmed by the user — before writing any artifact.
- Create and use a dedicated `prototype/<slug>` branch, or get explicit user
  direction when branch creation is unavailable.
- Write `README.md` from `assets/prototype-readme-template.md`.
- Include a self-check and know its result (pass/fail) before calling the
  work done.
- Invoke `johnludlow-feature-reviewer` when keep-vs-discard resolves to
  evolve.
- Keep the branch local unless the user explicitly asks to push or open a PR.

The agent MUST NOT:

- Generate before shared understanding is confirmed.
- Scaffold anything outside the quiz-confirmed objective.
- Produce a production-grade deliverable under the guise of a prototype.
- Mutate a real environment without explicit, action-specific approval.
- Generate anything that requires secrets or credentials to run or verify.
- Push, open a PR, or delete the branch without the user asking first.

## Relationship to Other Skills

- **johnludlow-quiz** — mandatory pre-step; this skill's Objective, Technique,
  Stack, Audience & purpose, Keep vs discard, Acceptance criteria, and Output
  location decisions are all surfaced through it, not asked separately.
- **johnludlow-markdown-standards** — applies to the generated `README.md`.
- **johnludlow-code-quality** — applies to any code the prototype contains,
  scaled to a time-boxed artifact rather than production code.
- **johnludlow-issue-management** — not used directly; a prototype lives on a
  branch, not in an issue tracker.
- **johnludlow-feature-reviewer** — invoked only when keep-vs-discard resolves
  to evolve.
- **Wayfinder** (future) — will reference this skill as one of the paths it
  can route into; this skill remains standalone-referenceable and does not
  depend on Wayfinder.

## Assets

- `assets/prototype-readme-template.md` — template for the generated
  `README.md`. See step 4 above for usage.
