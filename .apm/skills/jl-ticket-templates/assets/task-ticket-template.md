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

This file is retained for reading historical Task tickets. Do not use it to create new Recon tickets. New source changes belong in Implementation issues, not Recon map children.

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

## Historical Acceptance Criteria

Retain the original criteria when reading a historical Task ticket. Do not use this file to create new tickets.

## Implementation Notes

[Optional: Any gotchas, dependencies, or guidance for the implementer. Keep it
brief; link to longer docs if needed.]

Example:
> PostgreSQL connection string loaded from `IConfiguration`. Assumes the `User` table
> schema is already migrated. See DATABASE.md for schema details.
