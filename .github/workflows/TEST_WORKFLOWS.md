# GitHub Actions Test Workflow

`.github/workflows/main.yml` is the canonical unfiltered push/pull-request workflow.

It runs the complete jl-recon Pester directory in `pester-windows` on `windows-latest` and `pester-linux` on `ubuntu-latest`.

Both jobs install Pester 6 or later and run `Invoke-Pester -Path '.apm/skills/jl-recon/tests/pester' -PassThru`.

Each job fails unless the result is `Passed`. The directory includes four Mode 2/3 suites and three label-helper suites.

No separate path-filtered test workflow or Bats job remains.

The `build` job needs `setup`, `validate`, `pester-windows`, and `pester-linux`.

A failing test job prevents build and its dependent release job from running. Release runs only after a successful build on pushes to `main`.

These dependencies do not configure required pull-request status checks; repository ruleset policy is tracked separately.

## Local Verification

From the repository root, using PowerShell 7 and Pester 6 or later:

```powershell
$result = Invoke-Pester -Path '.apm/skills/jl-recon/tests/pester' -Output Detailed -PassThru
if ($result.Result -ne 'Passed') { throw "Pester tests failed: $($result.FailedCount) failed" }
```

For provider test failures, inspect the `pester-windows` and `pester-linux` job logs.

The label tests mock `gh` and `az` and use temporary Markdown files; no provider credentials are needed.

Error messages from failure-handling tests are expected when the overall Pester result is `Passed`.
