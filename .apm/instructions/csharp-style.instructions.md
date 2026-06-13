---
description: "C# coding style and repository standards (naming, async, DI, exceptions, tests, logging)."
applyTo: "**/*.cs,**/*.csproj"
---

# C# Style Guide

## Priority of this Guide

- This is a basic style guide for use when developing with C#. It contains instructions for
  projects using C# covering things like naming.

- This guide can override official or public documentation

- This guide can be overridden by documentation local to the repository (such as a local
  CONTRIBUTING.md), other documents available to users (which may be linked from CONTRIBUTING.md),
  or instructions from the user.

## Naming Case

- Follow [official naming guidelines][official-guidelines-naming]
- All types (classes, structs, records, enums, delegates, unions, etc) use pascal case: `PascalCase`
- All public members (methods, properties, events) use pascal case: `PascalCase`
- Class fields use camel case with an underscore prefix: `_camelCase`
- Method-local identifiers (method-local fields, method parameters) use camel case: `camelCase`

### Examples

Bad example:

```csharp
public class my_class           // should be MyClass
{
    private int myField = 0;    // should be _myField
    public void MYMETHOD(       // should be MyMethod
        int MyParam             // should be myParam
    )      
    {
        int _myLocal = 123;     // should be myLocal
    }
}
```

Good example:

```csharp
public class MyClass
{
    private int _myField = 0;
    public void MyMethod(
        int myParam
    )
    {
        int myLocal = 123;
    }
}
```

## Naming Language

- Follow [official naming guidelines][official-guidelines-naming]

- In general, types (classes, structs, records, enums, delegates, unions, etc) ***SHOULD*** be nouns that describe the
  object they represent

- In general, data-holding members (fields, properties) ***SHOULD*** be nouns that describe the data they hold

- In general, action-performing members (methods, events) ***SHOULD*** be verbs that describe the action they will perform

- `async` methdods MUST be named with an `Async` suffix

## Access Modifiers

- Always declare explicit access modifiers for public APIs (public/protected/internal/private).

## Other Rules

- Use async/await for asynchronous I/O. Suffix Task-returning methods with `Async`.
  Avoid `async void` except for event handlers.

- Prefer dependency injection for services; avoid static mutable state. Keep singletons immutable where possible.

- Validate public method arguments with guard clauses (e.g., `if (arg == null) throw new ArgumentNullException(nameof(arg));`).

- Accept and propagate CancellationToken for cancellable operations; do not swallow cancellation requests.

- Avoid blocking on tasks (no `Task.Result`/`Wait()`); use `await` instead.

- Keep methods small and focused (prefer < ~50 lines). Extract helpers for repeated logic.

- Prefer `IReadOnlyList<T>`/`IReadOnlyCollection<T>` for publicly exposed collections; avoid returning mutable collections.

- Use expression-bodied members and pattern matching where they improve readability.

- Use `using` declarations for disposables (C# 8+): `using var stream = ...;`.

- Use structured logging (ILogger) and include property placeholders (e.g.,
  `logger.LogInformation("Processed {Count} items", count);`).

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

## References

[official-guidelines-naming]: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/identifier-names
