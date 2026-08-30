# GitHub Actions Test Workflows

Automated test execution for label application across all providers.

## Workflows

### `test.yml` — Dedicated Test Workflow

Runs on pull requests and pushes that touch the `jl-recon` skill or test files.

**Triggers:**

- Push to `main` or `develop` branches when jl-recon files changed
- Pull requests to `main` or `develop` that modify jl-recon
- Any change to `.github/workflows/test.yml` itself

**Jobs:**

1. **pester-tests** (Windows)
   - Installs Pester module
   - Runs 3 test suites:
     - `markdown-labels.tests.ps1` — File I/O, YAML frontmatter recording
     - `github-labels.tests.ps1` — GitHub API mocks, label inheritance
     - `azure-devops-tags.tests.ps1` — Azure DevOps API mocks, semicolon format
   - Uploads NUnit XML results for parsing
   - Publishes results to PR/commit via `EnricoMi/publish-unit-test-result-action`

2. **bats-tests** (Ubuntu)
   - Installs Bats test framework via npm
   - Runs:
     - `label-resolution.bats` — Config resolution, inheritance, determinism
   - Captures TAP output
   - Adds results to GitHub step summary

3. **test-summary** (Ubuntu)
   - Aggregates results from both test jobs
   - Generates summary table in GitHub Actions UI
   - Reports overall pass/fail status

### `main.yml` — Integrated Build Pipeline

Standard build workflow that now includes tests.

**Pipeline:**

```text
setup → validate → test ↘
                         → build → release
```

**Test Job:**

- Runs on Windows (for PowerShell/Pester)
- Executes 3 Pester test suites
- Blocks build if any test fails
- Runs after validate, before build

## Test Execution

### Local Development

```bash
# Run all Pester tests
Invoke-Pester -Path ".apm/skills/jl-recon/tests/pester" -Verbose

# Run specific test file
Invoke-Pester -Path ".apm/skills/jl-recon/tests/pester/markdown-labels.tests.ps1" -Verbose

# Run all Bats tests
bats ".apm/skills/jl-recon/tests/bats/*.bats"

# Run specific Bats test
bats ".apm/skills/jl-recon/tests/bats/label-resolution.bats" --filter "config resolution"
```

### GitHub Actions

**In PR/commit:**

- Tests automatically run on push/PR
- Results appear in PR checks (test status, details)
- Build continues only if tests pass

**View Results:**

1. Click "Details" on the test job in PR checks
2. Or go to Actions tab → select workflow → select run
3. Scroll to "Integration Tests" section

### Test Output

**Pester:**

- NUnit XML files uploaded as artifacts
- Parsed and displayed in PR with:
  - Pass/fail counts
  - Failed test names and errors
  - Execution time

**Bats:**

- TAP format output
- Added to GitHub step summary
- Shows all test cases with status

## Coverage

The automated tests verify:

✅ **GitHub Labels**

- Map creation with labels
- Ticket labels (quiz, research, prototype, task)
- Label inheritance (additive, not replacement)
- User override (replaces entire set)

✅ **Azure DevOps Tags**

- Map work item tag application
- Ticket tag application (all 4 types)
- Semicolon-delimited format
- Same inheritance logic as GitHub

✅ **Markdown Frontmatter**

- YAML list formatting
- File I/O and updates
- Ticket body notes
- Parent link references

✅ **Edge Cases**

- Special characters (colons, hyphens, underscores)
- Empty label lists
- Very long label lists (20+)
- Duplicate removal
- Alphabetical sorting for determinism

✅ **Config Resolution**

- Default → CONTRIBUTING.md → AGENTS.md precedence
- Label inheritance across all ticket types
- Cross-provider consistency

## CI/CD Integration

**Pass/Fail Logic:**

- All Pester tests must pass
- All Bats tests must pass
- Both jobs must succeed for build to proceed
- Failures block merges to main/develop

**Artifact Retention:**

- Test results preserved for 30 days
- Available in Actions → Artifacts
- Downloadable for post-incident analysis

## Troubleshooting

### Test Failures

1. **Pester tests fail on Windows**
   - Check PowerShell version: `$PSVersionTable.PSVersion`
   - Verify Pester installed: `Get-Module Pester -ListAvailable`
   - Review test output in Actions job logs

2. **Bats tests fail on Ubuntu**
   - Check Bash version: `bash --version`
   - Verify Bats installed: `bats --version`
   - Review TAP output in step summary

3. **File path issues**
   - Ensure test files are in `.apm/skills/jl-recon/tests/`
   - Check for Windows/Unix line ending conflicts
   - Verify relative paths from repo root

### Debugging

Add verbose output to test runs:

```yaml
# In main.yml test job
- name: Run with Verbose Output
  run: |
    Invoke-Pester -Path <testpath> -Verbose -Debug
  shell: pwsh
```

## Future Enhancements

- Add code coverage reporting (via OpenCover)
- Integration tests with real GitHub/Azure DevOps sandboxes (gated)
- Performance benchmarks for large label sets
- Test result history dashboard
- Slack/email notifications on test failures
