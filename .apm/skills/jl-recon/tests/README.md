# JL-Recon Tests

The Pester suites exercise Mode 2/3 workflows and the real label and tag helpers. Run them from the repository root with PowerShell 7 and Pester 6 or later.

## Suites

| File | Behavior covered |
| --- | --- |
| `pester/mode2-checks.tests.ps1` | Mode 2 check configuration, fallbacks, findings, and decisions |
| `pester/mode2-workflow.tests.ps1` | Mode 2 resolution workflow |
| `pester/mode3-checks.tests.ps1` | Mode 3 check configuration, findings, and decisions |
| `pester/mode3-workflow.tests.ps1` | Mode 3 publication workflow |
| `pester/github-labels.tests.ps1` | GitHub ticket label union, override, ordering, and failures |
| `pester/azure-devops-tags.tests.ps1` | Azure DevOps map/ticket inheritance and `System.Tags` serialization |
| `pester/markdown-labels.tests.ps1` | Markdown map/ticket frontmatter, inheritance, overrides, and file preservation |

`pester/label-helper-harness.ps1` supplies isolated `gh` and `az` command doubles; it is not a test suite.

Provider tests do not contact GitHub or Azure DevOps. Markdown tests use temporary files that are removed after each case.

## Running Tests

Install Pester if it is not already available:

```powershell
Install-Module -Name Pester -MinimumVersion 6.0 -Force -Scope CurrentUser -SkipPublisherCheck
```

Run every maintained suite and fail on any non-passing result:

```powershell
$result = Invoke-Pester -Path '.apm/skills/jl-recon/tests/pester' -Output Detailed -PassThru
if ($result.Result -ne 'Passed') { throw "Pester tests failed: $($result.FailedCount) failed" }
```

For a narrower run, pass a test file instead of the directory, such as `.apm/skills/jl-recon/tests/pester/github-labels.tests.ps1`.

The negative-path cases print provider error messages while asserting that the helpers do not make an unsafe write.

The overall Pester result determines success.

## Scope

The label suites verify actual helper inputs and outputs, including `quiz`, `research`, `prototype`, and `task` labels.

They do **not** prove `AGENTS.md`/`CONTRIBUTING.md` precedence: these helpers receive already-resolved inputs.

There is no separate GitHub map-label helper; the ticket helper accepts inherited map labels from issue metadata.
