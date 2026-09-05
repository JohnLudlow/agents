---
title: "[Descriptive task title]"
description: "[One-line summary of the work to be done]"
type: "task"
status: "Draft"
author: "[Your name or ID]"
date: "[YYYY-MM-DD]"
related_links: "[GitHub issue URL, related ticket URL, documentation link]"
parent: "[Parent issue or epic, if any]"
---

# Task Template

This template captures a **bounded work item** — a piece of implementation that
has a clear scope, measurable acceptance criteria, and an identifiable owner.
Use this when you have work to assign, track, or coordinate.

## Work Scope

**What will be done:** Describe the concrete changes or deliverables expected.
Be specific about inputs, outputs, and any significant constraints or assumptions.

Example:
> Implement the `UserRepository.GetByIdAsync()` method in src/Data/UserRepository.cs.
> Accept a `userId` string and a `CancellationToken`. Return a `User` object or null
> if not found. Query against the live PostgreSQL database connection.

**What will NOT be done:** Explicitly list work that might seem in scope but is
explicitly excluded. This prevents scope creep.

Example:
> - Caching is not included; this is a baseline implementation
> - Migration from legacy data is out of scope
> - Performance optimization beyond current requirements

## Acceptance Criteria

A task is accepted when these criteria are all met:

1. **[Specific, Measurable, Checkable]** — [Example outcome or command to verify]
2. **[Specific, Measurable, Checkable]** — [Example outcome or command to verify]
3. **[Specific, Measurable, Checkable]** — [Example outcome or command to verify]

Each criterion should be checkable by running a command (build, test, review),
inspecting a file, or running a measurable test.

Example acceptance criteria for the UserRepository task:
- Code compiles without warnings: `dotnet build`
- Method signature matches contract: accepts `userId`, `CancellationToken`; returns `Task<User?>`
- Unit tests pass: `dotnet test UserRepositoryTests.cs`
- Integration test passes against real PostgreSQL connection

## Implementation Notes

[Optional: Any gotchas, dependencies, or guidance for the implementer. Keep it
brief; link to longer docs if needed.]

Example:
> PostgreSQL connection string loaded from `IConfiguration`. Assumes the `User` table
> schema is already migrated. See DATABASE.md for schema details.
