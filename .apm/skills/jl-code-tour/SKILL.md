---
name: jl-code-tour
description: "Code tour skill: generates CodeTour `.tour` walkthrough files for a repo, or walks a user through code live in-chat, for onboarding. User-invoked only - launch by name when you need a guided walkthrough of a codebase."
disable-model-invocation: true
---

# Code Tour

## Overview

Code Tour turns a codebase into a guided walkthrough. It is adapted from the CodeTour VS Code extension (microsoft/codetour): the file format is its, the generation is ours. A tour is an ordered set of steps — a description anchored to a file, a directory, or a view — that leads a reader through the code. The skill has two renderings: a **generator** that writes `.tour` files a user can play in VS Code, and a **walk** that plays the same tour live in chat, one step at a time.

This skill is user-invoked only. An agent may notice a request has this shape — onboarding, "how does X work?", "walk me through this repo" — and suggest Code Tour by name, but only a human launches it.

## Core Model

- **Tour** — a guided walkthrough of a codebase: a title, an optional description, and an ordered list of steps. The unit the skill produces, in either rendering.
- **Step** — one stop on the tour: a markdown description anchored to a file (optionally at a line or selection), a directory, or a view. Steps tell the reader what to look at and why.
- **Anchor** — the file + line/selection that pins a step to code. An anchor either resolves — the file exists and the line is in range — or it does not. Every anchor must resolve before the tour is written.
- **Breadth** — what the tour covers: the whole repo (onboarding), one task or area ("how does X work?"), or a change window (what changed between refs). Breadth decides which anchors the tour gathers.
- **Landing** — where generated files go: `.tours/` in the target repo, per CodeTour's discovery convention. The skill writes; the user commits.

## Modes

Two entry points, chosen by the user: **generate** (write `.tour` files) or **walk** (play a tour live in chat). Each ends on its own completion criterion.

### 1. Generate a tour

Writing `.tour` walkthrough files for the target repo — the repo the skill is running in.

1. Confirm the target and the landing: the repo root, and the tour directory (default `.tours/`; the user may choose `.vscode/tours/` or `.github/tours/` — all three are auto-discovered). Create the directory if it does not exist.
2. Settle the breadth: whole-repo onboarding, a task or area, or a change window. If the request does not name one, ask the user — never infer breadth from the agent's own read.
3. Explore the code to gather the anchors the breadth calls for. Onboarding tours anchor the entry point, the main flow, and the core abstractions; task tours anchor the area's own entry points and key flows; change tours anchor the diff between two refs (`git diff <ref1>..<ref2>`).
4. Draft the steps in narrative order, each with a markdown description that says what to look at and why, anchored to a file and an explicit line (or selection) where the code lives.
5. Validate every anchor before writing anything: the file exists, the line is 1-based and within the file's line count, and any selection's start and end lines are likewise in range. Fix or drop any step whose anchor does not resolve. A tour with a broken anchor is never written.
6. Write the tour: one `.tour` file per tour, schema-valid JSON (see [TOUR-FORMAT.md](references/TOUR-FORMAT.md)), named `.tours/<slug>.tour`. For a change tour, set the `ref` to the refs the diff ran between.
7. Report the landing: the path of every file written, and that the user commits them. Never commit.

**Completion criterion:** every `.tour` file written is schema-valid JSON, every anchor in it resolves to an existing file with an in-range line, and the user has been told exactly where the files landed for them to commit.

### 2. Walk a tour

Playing a tour live in chat, producing no files.

1. Settle the breadth exactly as in Generate, step 2.
2. Explore the code and draft the same narrative — entry point, main flow, abstractions; the area's key flows; or the change window — as an ordered set of steps.
3. Present the steps one at a time, each showing the file, the line or selection, and the description of what to look at. Pause after each step; the user says when to continue.
4. End with a one-paragraph recap of the tour's arc: what the reader now knows and where to look next.

**Completion criterion:** every drafted step has been presented to the user, one at a time, and the walk ended with a recap the user has seen.

## Requirements

The agent MUST:

- Validate every anchor — file exists, line and selection in range — before writing any `.tour` file, and never write a tour containing an unresolvable anchor.
- Write `.tour` files as schema-valid JSON per the format in [TOUR-FORMAT.md](references/TOUR-FORMAT.md), with a `$schema`, a `title`, and `steps` whose descriptions are non-empty.
- Use 1-based `line` numbers in `.tour` files, matching CodeTour's convention; the extension converts to VS Code's 0-based positions on play.
- Place generated tours in the target repo's tour directory (default `.tours/`), create the directory if needed, and leave committing to the user.
- Keep the human in control: confirm the breadth when the request does not name one, and present Walk steps one at a time, waiting between them.
- Treat a request that names no breadth as an open question, not a default.

The agent MUST NOT:

- Fire this skill itself — it is user-invoked only. Suggesting it by name is fine; launching it is not.
- Commit, stage, or push the generated tours.
- Write tour files anywhere outside the target repo's tour directory without the user's explicit ask.
- Invent anchors — a file path or line number that was not found in the code gets the step fixed or dropped, never fabricated.
- Add post-hoc drift machinery (anchor re-location or a `refresh`/`--check` step) — generation-time validation is the staleness defense.

## Relationship to Other Skills

- **jl-markdown-standards** — applies to the markdown step descriptions and any prose this skill produces.
- **jl-quiz** — the mechanism for settling an unnamed breadth or other user-only choice when it surfaces.
- **jl-recon** — the sibling skill for understanding a poorly-understood codebase; Code Tour renders that understanding as a guided walkthrough, Recon as a map of decisions.
- **jl-documentation-template** — the structure behind onboarding documentation; Code Tour complements it by walking the reader through the code itself.

## References

- [TOUR-FORMAT.md](references/TOUR-FORMAT.md) — the exact `.tour` JSON schema, CodeTour's discovery rules, and the anchor-validation checklist.

## Assets

- `assets/tour-template.json` — a minimal schema-valid `.tour` skeleton to start a generation from.
