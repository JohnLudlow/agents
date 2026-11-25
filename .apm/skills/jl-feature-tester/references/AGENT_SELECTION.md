---
description: "Full test-agent selection table and rules for delegated testing"
---

# Test Agent Selection

Detailed test-agent selection. The entry point keeps a compact summary
inline; read this for the full table.

## Default preferences

| Test type | Preferred target | When to use |
| --- | --- | --- |
| Unit tests (generic or mixed-language) | `polyglot-test-agent` | Default choice for most generated unit tests and multi-language repositories |
| Unit tests (C# xUnit) | `csharp-xunit` | When the repo clearly uses xUnit and a language-specific agent is more precise |
| Unit tests (C# NUnit) | `csharp-nunit` | When NUnit is the established framework |
| Unit tests (C# MSTest) | `csharp-mstest` | When MSTest is the established framework |
| Unit tests (Java) | `java-junit` | When JUnit is the established framework |
| Browser or UI tests | `playwright-generate-test` or Playwright testing agents | When a browser automation harness already exists |
| Verification / running tests | `polyglot-test-agent:polyglot-test-tester` or inline runner | When execution should be isolated or standardized |
| Coverage or failing-test repair follow-up | `polyglot-test-agent:polyglot-test-fixer` or other specialist | When generated tests need repair or analysis |
| Performance testing | specialized performance agent | When load, latency, or throughput behaviour matters |
| Security testing | `security-review` or security testing agent | When validating security-sensitive behavior or test coverage |

### Selection rules

- Prefer `polyglot-test-agent` for unit-test generation unless a language-specific test agent clearly matches the existing framework better.
- Prefer language-specific agents when the repository conventions are obvious and the specialist agent reduces adaptation work.
- Prefer a performance-focused agent for performance validation rather than treating it as ordinary regression testing.
- Prefer a security-focused agent for security testing or exploit-oriented validation.
- Fall back to inline generation or analysis when no appropriate agent or harness is available.

## See Also

- [SKILL.md](../SKILL.md#test-agent-selection) — Compact summary
