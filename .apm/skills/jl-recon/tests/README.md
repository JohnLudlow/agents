# JL-Recon Integration Tests

Comprehensive test suite for jl-recon label application and Mode 2 quality checks.

## Test Structure

```text
tests/
├── pester/
│   ├── mode2-checks.tests.ps1         # Unit tests for Mode 2 check logic
│   ├── mode2-workflow.tests.ps1       # Integration tests for Mode 2 resolution workflow
│   ├── mode3-checks.tests.ps1         # Unit tests for Mode 3 check logic
│   ├── mode3-workflow.tests.ps1       # Integration tests for Mode 3 publication workflow
│   ├── markdown-labels.tests.ps1      # File I/O, YAML frontmatter recording
│   ├── github-labels.tests.ps1        # GitHub API mocks, per-label tests
│   └── azure-devops-tags.tests.ps1    # Azure DevOps API mocks, semicolon format
└── bats/
    ├── label-resolution.bats          # Config resolution, inheritance, determinism
    └── README.md                      # This file
```

## Test Coverage

### Pester Tests (PowerShell)

#### `mode2-checks.tests.ps1`

- **Configuration gating:** enabled, disabled, missing config defaults, timeout override
- **Fallback invocation:** subagent → Herdr → session, all-failed, timeout, parse error, partial availability
- **Findings parsing:** structured objects, malformed JSON degradation, empty findings, missing optional fields
- **Findings display:** markdown table columns, severity sorting, file/line context, escaping
- **Prompt generation:** unavailable-check prompt, partial-availability prompt
- **User decisions:** approve, proceed, override, cancel, audit logging, invalid-input retry

#### `mode2-workflow.tests.ps1`

- **Happy path:** checks pass, user approves, resolution recorded
- **Findings path:** findings displayed before approval and recording
- **Override path:** critical finding overridden and logged
- **Cancel path:** returns to resolve step, no record until re-resolution
- **Degradation path:** all checks unavailable, proceed without blocking
- **Partial availability path:** available findings preserved while failed checks degrade gracefully
- **Disabled checks path:** skips invocation entirely and logs skip status

#### `mode3-checks.tests.ps1`

- **Configuration gating:** enabled, disabled, missing config defaults, timeout override
- **Fallback invocation:** subagent → Herdr → session, all-failed, timeout, parse error, partial availability
- **Findings parsing/display:** claim normalization, risk ordering, confidence formatting, source links, edge cases
- **User decisions:** approve, publish-without-verification, override, cancel, invalid-input retry
- **Audit logging:** findings summary, degradation details, override tracking

#### `mode3-workflow.tests.ps1`

- **GitHub Issues flow:** approved publication after successful verification
- **Azure DevOps flow:** override publication with disputed findings
- **Degraded path:** unavailable checks still permit explicit publish
- **Cancel path:** blocks publication and returns to report generation
- **Disabled checks path:** skips invocation but still requires user approval

#### `markdown-labels.tests.ps1`

- **Map label recording:** Basic, empty labels, deduplication, user override
- **Ticket label recording:** Per type (quiz, research, prototype, task), inheritance, body note
- **Edge cases:** Special characters, long label lists, frontmatter updates
- **Determinism:** Alphabetical sorting

#### `github-labels.tests.ps1`

- **Map labels:** Configuration application, defaults, override
- **Ticket labels:** All 4 types, inheritance (additive), label union
- **Inheritance model:** No duplication, all three sources present
- **Override behavior:** Entire set replacement
- **Edge cases:** Special characters, empty lists, single label, 20+ labels

#### `azure-devops-tags.tests.ps1`

- **Map tags:** Configuration, defaults, override
- **Ticket tags:** All 4 types, inheritance, tag union
- **Semicolon serialization:** Format validation, alphabetical sorting
- **Inheritance model:** Same as GitHub (additive, not replacement)
- **Edge cases:** Special characters, empty/minimal sets, long tag lists

### Bats Tests (Bash)

#### `label-resolution.bats`

- **Config resolution:** Defaults → CONTRIBUTING.md → AGENTS.md precedence
- **Label inheritance:** Type + inherited + required label formula
- **Deduplication:** Removes duplicates from all sources
- **Ticket types:** All 4 types get correct recon label
- **Cross-provider consistency:** Same labels across GitHub, Azure DevOps, Markdown
- **Integration scenarios:** Create map → create tickets with inheritance
- **Edge cases:** Empty labels, special characters, 20+ labels
- **Formatting:** Markdown YAML, semicolon-delimited for Azure DevOps
- **Determinism:** Alphabetical sorting

## Running Tests

### Prerequisites

- **Pester:** `Install-Module -Name Pester -Force`
- **Bats:** `npm install -g bats` or `apt-get install bats` (Linux)

### Run All Tests

```bash
# Pester tests
Invoke-Pester -Path ./tests/pester -Verbose

# Bats tests
bats ./tests/bats/*.bats
```

### Run Specific Test File

```bash
# Markdown labels only
Invoke-Pester -Path ./tests/pester/markdown-labels.tests.ps1

# GitHub labels only
Invoke-Pester -Path ./tests/pester/github-labels.tests.ps1

# Label resolution only
bats ./tests/bats/label-resolution.bats
```

### Run Specific Test

```bash
# Pester: run single context or test
Invoke-Pester -Path ./tests/pester/markdown-labels.tests.ps1 -TestName "Label deduplication"

# Bats: run single test
bats ./tests/bats/label-resolution.bats --filter "alphabetical sorting"
```

## Test Design Notes

### Mocking Strategy

**Pester tests** use function mocking for external dependencies:

- GitHub API: Mock `Invoke-GhIssueCreate` and `Invoke-GhIssueEdit`
- Azure DevOps API: Mock `Invoke-AzWorkItemCreate` and `Invoke-AzWorkItemUpdate`
- File system: Use `[System.IO.Path]::GetTempFileName()` for isolated test files

**Bats tests** focus on:

- Configuration file parsing (YAML CONTRIBUTING.md, AGENTS.md)
- Label combining and deduplication logic
- Format conversion (CSV → semicolon, YAML list generation)
- Cross-provider consistency checks

### Key Test Principles

1. **Per-type testing** — Each ticket type (quiz, research, prototype, task) tested individually
2. **Inheritance verification** — All three label sources (configured, inherited, required) verified
3. **Edge cases** — Empty lists, special characters, long lists, duplicates
4. **Determinism** — Alphabetical sorting ensures reproducible output
5. **Mocked APIs** — No live GitHub/Azure DevOps calls; all mocked for speed and repeatability

## Acceptance Criteria Status

- ✅ Mode 2 checks configuration gating tested
- ✅ Mode 2 fallback hierarchy tested
- ✅ Mode 2 findings parsing and markdown rendering tested
- ✅ Mode 2 approve / override / cancel flows tested
- ✅ Mode 2 proceed-without-checks flow tested
- ✅ Mode 2 graceful degradation and disabled-check paths tested
- ✅ Mode 3 checks configuration, parsing, prompts, and audit logging tested
- ✅ Mode 3 publication workflow tested across approve / override / cancel / disabled paths
- ✅ GitHub map label application tested
- ✅ GitHub ticket label application (with inheritance) tested for all 4 types
- ✅ Azure DevOps tag application tested
- ✅ Markdown frontmatter label recording tested
- ✅ Config override (user session preference) tested
- ✅ Edge cases included (where sensible)
- ✅ Broader scenarios (inheritance, determinism, config resolution)

## Future Enhancements

- Add integration tests with real GitHub/Azure DevOps sandboxes (optional, gated)
- Add performance benchmarks for large label sets
- Add regression tests for specific bugs reported
- Expand edge cases based on real-world usage patterns
