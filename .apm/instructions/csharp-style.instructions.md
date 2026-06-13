---
description: "C# coding style and repository standards (naming, async, DI, exceptions, tests, logging)."
applyTo: "**/*.cs,**/*.csproj"
---

- Use PascalCase for public types and members; use camelCase for private fields, parameters, and locals.
- Always declare explicit access modifiers for public APIs (public/protected/internal/private).
- Use async/await for asynchronous I/O. Suffix Task-returning methods with `Async`. Avoid `async void` except for event handlers.
- Prefer dependency injection for services; avoid static mutable state. Keep singletons immutable where possible.
- Validate public method arguments with guard clauses (e.g., `if (arg == null) throw new ArgumentNullException(nameof(arg));`).
- Accept and propagate CancellationToken for cancellable operations; do not swallow cancellation requests.
- Avoid blocking on tasks (no `Task.Result`/`Wait()`); use `await` instead.
- Keep methods small and focused (prefer < ~50 lines). Extract helpers for repeated logic.
- Prefer `IReadOnlyList<T>`/`IReadOnlyCollection<T>` for publicly exposed collections; avoid returning mutable collections.
- Use expression-bodied members and pattern matching where they improve readability.
- Use `using` declarations for disposables (C# 8+): `using var stream = ...;`.
- Use structured logging (ILogger) and include property placeholders (e.g., `logger.LogInformation("Processed {Count} items", count);`).
- Do not swallow exceptions silently. Catch specific exceptions and add contextual information when rethrowing.
- Document public APIs with XML comments and include examples for complex behaviors.
- Enable nullable reference types and annotate APIs accordingly; prefer non-nullable APIs when possible.
- Keep file paths/namespaces aligned (folder structure -> namespace). One top-level public type per file is preferred.
- Add unit and integration tests for public behavior and edge cases. Aim for meaningful assertions and clear arrangement.
- Ensure CI enforces formatting and linting (e.g., `dotnet format`, analyzers) before merge.

Notes:
- These rules are guidance for agents and reviewers interacting with C# code in this repository. 
  If a rule conflicts with an established project exception, document the exception in code comments 
  and include rationale in the PR description.
