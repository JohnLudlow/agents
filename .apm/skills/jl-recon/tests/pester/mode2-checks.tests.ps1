<#
.SYNOPSIS
Pester unit tests for jl-recon Mode 2 quality check logic.

Tests configuration gating, fallback invocation, findings parsing, markdown
rendering, prompt generation, and user-decision handling for Mode 2 ticket
resolution checks.
#>

# Force Pester 6.x for modern Should syntax
Import-Module Pester -MinimumVersion 6.0 -ErrorAction Stop

$skillRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script:mode2ScriptPath = Join-Path $skillRoot "scripts" "mode2-quality-checks.ps1"

if (-not (Test-Path $script:mode2ScriptPath)) {
    throw "Mode 2 quality checks script not found at $script:mode2ScriptPath"
}

Describe "Mode 2 checks configuration" {
    BeforeEach {
        $local:path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "scripts" "mode2-quality-checks.ps1"
        . $local:path
    }

    It "runs checks when on_ticket_resolution_enabled is true" {
        Get-JlReconMode2ChecksEnabled -Config @{ checks = @{ on_ticket_resolution_enabled = $true } } | Should -BeTrue
    }

    It "skips checks when on_ticket_resolution_enabled is false" {
        Get-JlReconMode2ChecksEnabled -Config @{ checks = @{ on_ticket_resolution_enabled = $false } } | Should -BeFalse
    }

    It "defaults to true when configuration is missing" {
        Get-JlReconMode2ChecksEnabled -Config $null | Should -BeTrue
    }

    It "uses a 30 second timeout by default" {
        Get-JlReconMode2ChecksTimeoutSeconds -Config $null | Should -Be 30
    }

    It "reads a configured timeout override" {
        Get-JlReconMode2ChecksTimeoutSeconds -Config @{ checks = @{ timeout_seconds = 45 } } | Should -Be 45
    }
}

Describe "Mode 2 check invocation" {
    BeforeEach {
        $local:path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "scripts" "mode2-quality-checks.ps1"
        . $local:path
        $script:invocations = [System.Collections.Generic.List[string]]::new()
        $script:ticket = [pscustomobject]@{
            Id = 176
            Title = "Mode 2 quality checks"
            Resolution = "Resolved via map walkthrough."
            Findings = @("Linked decision")
            MapContext = "Map section: Decisions-so-far"
        }
    }

    It "invokes jl-adversarial-reviewer via jl-subagent-spawning first" {
        $handlers = @{
            subagent = {
                param($checkName, $ticket)
                $script:invocations.Add("subagent:$checkName")
                $ticket.Title | Should -Be "Mode 2 quality checks"
                return @{ findings = @() }
            }
        }

        $result = Invoke-JlReconCheckWithFallback -CheckName "jl-adversarial-reviewer" -StrategyHandlers $handlers -Ticket $script:ticket

        $result.Status | Should -Be "success"
        $result.Strategy | Should -Be "subagent"
        $script:invocations | Should -Be @("subagent:jl-adversarial-reviewer")
    }

    It "falls back to Herdr when the subagent path fails" {
        $handlers = @{
            subagent = {
                param($checkName, $ticket)
                $script:invocations.Add("subagent:$checkName")
                throw "task timeout"
            }
            herdr = {
                param($checkName, $ticket)
                $script:invocations.Add("herdr:$checkName")
                return @{ findings = @() }
            }
        }

        $result = Invoke-JlReconCheckWithFallback -CheckName "jl-adversarial-reviewer" -StrategyHandlers $handlers -Ticket $script:ticket

        $result.Status | Should -Be "success"
        $result.Strategy | Should -Be "herdr"
        $result.Attempts.Count | Should -Be 2
        $result.Attempts[0].Category | Should -Be "timeout"
        $result.Attempts[1].Status | Should -Be "success"
    }

    It "falls back to reading into the session when subagent and Herdr fail" {
        $handlers = @{
            subagent = {
                param($checkName, $ticket)
                $script:invocations.Add("subagent:$checkName")
                throw "subagent unavailable"
            }
            herdr = {
                param($checkName, $ticket)
                $script:invocations.Add("herdr:$checkName")
                throw "Herdr unavailable"
            }
            session = {
                param($checkName, $ticket)
                $script:invocations.Add("session:$checkName")
                return @{ findings = @() }
            }
        }

        $result = Invoke-JlReconCheckWithFallback -CheckName "jl-adversarial-reviewer" -StrategyHandlers $handlers -Ticket $script:ticket

        $result.Status | Should -Be "success"
        $result.Strategy | Should -Be "session"
        $result.Attempts.Count | Should -Be 3
        $result.Attempts[0].Category | Should -Be "unavailable"
        $result.Attempts[1].Category | Should -Be "unavailable"
        $result.Attempts[2].Status | Should -Be "success"
    }

    It "returns an unavailable result when every fallback strategy fails" {
        $handlers = @{
            subagent = { param($checkName, $ticket) throw "timeout" }
            herdr = { param($checkName, $ticket) throw "network error" }
            session = { param($checkName, $ticket) throw "session unavailable" }
        }

        $warnings = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @("jl-adversarial-reviewer") -StrategyHandlers $handlers -Ticket $script:ticket -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks.Count | Should -Be 1
        $result.FailedChecks[0].Error | Should -Be "All fallback strategies failed."
        $result.FailedChecks[0].Attempts.Count | Should -Be 3
        $result.FailedChecks[0].FailureCategory | Should -Be "timeout"
        @($warnings).Count | Should -Be 1
        @($warnings)[0].ToString() | Should -Be 'Check jl-adversarial-reviewer timed out after 30s'
    }

    It "classifies parse failures as degraded checks" {
        $handlers = @{
            subagent = { param($checkName, $ticket) "{not-json" }
        }

        $warnings = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @("jl-adversarial-reviewer") -StrategyHandlers $handlers -Ticket $script:ticket -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks.Count | Should -Be 1
        $result.FailedChecks[0].FailureCategory | Should -Be "parse"
        @($warnings)[0].ToString() | Should -Match '^Check jl-adversarial-reviewer returned malformed findings:'
    }

    It "detects timeout based on configured timeout seconds" {
        $handlers = @{
            subagent = @{
                Invoke = {
                    param($checkName, $ticket, $timeoutSeconds)
                    Start-Sleep -Milliseconds 1200
                    return @{ findings = @() }
                }
            }
        }

        $result = Invoke-JlReconCheckWithFallback -CheckName "jl-adversarial-reviewer" -StrategyHandlers $handlers -Ticket $script:ticket -TimeoutSeconds 1

        $result.Status | Should -Be "failed"
        $result.FailureCategory | Should -Be "timeout"
    }

    It "reports partial availability when one check succeeds and another fails" {
        $handlers = @{
            subagent = {
                param($checkName, $ticket)
                if ($checkName -eq "jl-adversarial-reviewer") {
                    return @{
                        findings = @(
                            @{
                                severity = "major"
                                description = "Inconsistent resolution note"
                                recommendation = "Align the resolution note"
                            }
                        )
                    }
                }

                throw "network error"
            }
            herdr = { param($checkName, $ticket) throw "Herdr unavailable" }
            session = { param($checkName, $ticket) throw "session unavailable" }
        }

        $warnings = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @(
            [pscustomobject]@{ Name = "jl-adversarial-reviewer" },
            [pscustomobject]@{ Name = "doublecheck" }
        ) -StrategyHandlers $handlers -Ticket $script:ticket -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AnySucceeded | Should -BeTrue
        $result.PartialFailure | Should -BeTrue
        $result.ChecksStatus | Should -Be "partial"
        $result.SuccessfulChecks.Count | Should -Be 1
        $result.FailedChecks.Count | Should -Be 1
        $result.Findings.Count | Should -Be 1
        $result.Findings[0].Check | Should -Be "jl-adversarial-reviewer"
        $result.WarningMessages.Count | Should -Be 1
        $result.FailureSummary | Should -Match 'doublecheck failed due to network error'
        @($warnings)[0].ToString() | Should -Be 'Check doublecheck failed due to network error — network error'
    }

    It "handles typed timeout exceptions with a warning and degraded result" {
        $handlers = @{
            subagent = {
                param($checkName, $ticket)
                throw [System.TimeoutException]::new("provider deadline exceeded")
            }
        }

        $warnings = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @("jl-adversarial-reviewer") -StrategyHandlers $handlers -Ticket $script:ticket -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks[0].FailureCategory | Should -Be "timeout"
        @($warnings)[0].ToString() | Should -Be 'Check jl-adversarial-reviewer timed out after 30s'
    }

    It "handles network exceptions with a warning and degraded result" {
        $handlers = @{
            subagent = {
                param($checkName, $ticket)
                throw [System.Net.Http.HttpRequestException]::new("Connection refused")
            }
        }

        $warnings = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @("jl-adversarial-reviewer") -StrategyHandlers $handlers -Ticket $script:ticket -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks[0].FailureCategory | Should -Be "network"
        @($warnings)[0].ToString() | Should -Match '^Check jl-adversarial-reviewer failed due to network error'
        @($warnings)[0].ToString() | Should -Match 'network error'
        @($warnings)[0].ToString() | Should -Match 'Connection refused'
    }

    It "reports unavailable handlers distinctly from general errors" {
        $handlers = @{}

        $warnings = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @(
            [pscustomobject]@{
                Name = "doublecheck"
                StrategyOrder = @("session")
            }
        ) -StrategyHandlers $handlers -Ticket $script:ticket -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks[0].FailureCategory | Should -Be "unavailable"
        @($warnings)[0].ToString() | Should -Be 'Check doublecheck is not available in this harness — No handler registered.'
    }

    It "handles malformed responses with a warning and skips findings" {
        $handlers = @{
            subagent = {
                param($checkName, $ticket)
                return @{
                    findings = @(
                        @{
                            severity = "major"
                            description = "Missing recommendation"
                        }
                    )
                }
            }
        }

        $warnings = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @("jl-adversarial-reviewer") -StrategyHandlers $handlers -Ticket $script:ticket -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.Findings.Count | Should -Be 0
        $result.FailedChecks[0].FailureCategory | Should -Be "parse"
        @($warnings)[0].ToString() | Should -Match '^Check jl-adversarial-reviewer returned malformed findings:'
        @($warnings)[0].ToString() | Should -Match 'missing recommendation'
    }

    It "handles general exceptions with a warning and degraded result" {
        $handlers = @{
            subagent = {
                param($checkName, $ticket)
                throw [System.InvalidOperationException]::new("Unexpected provider state")
            }
        }

        $warnings = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @("jl-adversarial-reviewer") -StrategyHandlers $handlers -Ticket $script:ticket -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks[0].FailureCategory | Should -Be "error"
        @($warnings)[0].ToString() | Should -Be 'Check jl-adversarial-reviewer failed: Unexpected provider state'
    }

    It "collects warnings when all checks fail" {
        $handlers = @{
            subagent = { param($checkName, $ticket) throw [System.TimeoutException]::new("deadline exceeded") }
            herdr = { param($checkName, $ticket) throw [System.Net.WebException]::new("DNS failure") }
            session = { param($checkName, $ticket) throw [System.InvalidOperationException]::new("Session read failed") }
        }

        $warnings = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @("jl-adversarial-reviewer", "doublecheck") -StrategyHandlers $handlers -Ticket $script:ticket -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks.Count | Should -Be 2
        $result.WarningMessages.Count | Should -Be 2
        @($warnings).Count | Should -Be 2
        @($warnings)[0].ToString() | Should -Match '^Check jl-adversarial-reviewer'
        @($warnings)[1].ToString() | Should -Match '^Check doublecheck'
    }

    It "logs the start of Mode 2 checks with the configured timeout" {
        $handlers = @{
            subagent = {
                param($checkName, $ticket)
                return @{ findings = @() }
            }
        }

        $informationMessages = $null
        $result = Invoke-JlReconMode2Checks -CheckRequests @("jl-adversarial-reviewer") -StrategyHandlers $handlers -Ticket $script:ticket -TimeoutSeconds 45 -InformationAction Continue -InformationVariable informationMessages

        $result.ChecksStatus | Should -Be "completed"
        @($informationMessages).Count | Should -BeGreaterThan 0
        @($informationMessages)[0].ToString() | Should -Be 'Starting Mode 2 checks (timeout: 45s)'
    }

    It "preserves check names in multi-check failure summaries" {
        $failedChecks = @(
            [pscustomobject]@{
                CheckName = "jl-adversarial-reviewer"
                FailureReason = "jl-adversarial-reviewer timed out after 30s"
                FailureCategory = "timeout"
                TimeoutSeconds = 30
                Error = "deadline exceeded"
            },
            [pscustomobject]@{
                CheckName = "doublecheck"
                FailureReason = "doublecheck is not available in this harness"
                FailureCategory = "unavailable"
                TimeoutSeconds = 30
                Error = "No handler registered."
            }
        )

        $summary = Get-JlReconFailedChecksSummary -FailedChecks $failedChecks

        $summary | Should -Be 'jl-adversarial-reviewer timed out after 30s; doublecheck is not available in this harness'
    }
}

Describe "Mode 2 findings collection" {
    BeforeEach {
        $local:path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "scripts" "mode2-quality-checks.ps1"
        . $local:path
    }

    It "parses findings from a jl-adversarial-reviewer response" {
        $result = ConvertFrom-JlReconCheckResponseResult -CheckName "jl-adversarial-reviewer" -Response @{
            findings = @(
                @{
                    severity = "critical"
                    description = "Resolution contradicts ticket evidence"
                    recommendation = "Re-open the decision"
                    file = ".apm/skills/jl-recon/SKILL.md"
                    line = 510
                }
            )
        }

        $result.Success | Should -BeTrue
        $result.Findings.Count | Should -Be 1
        $result.Findings[0].Severity | Should -Be "critical"
        $result.Findings[0].Recommendation | Should -Be "Re-open the decision"
        $result.Findings[0].File | Should -Be ".apm/skills/jl-recon/SKILL.md"
        $result.Findings[0].Line | Should -Be 510
    }

    It "returns an empty finding set when checks report all-pass" {
        (ConvertFrom-JlReconCheckResponse -CheckName "jl-adversarial-reviewer" -Response @{ findings = @() }).Count | Should -Be 0
    }

    It "collects multiple severities in normalized order-independent form" {
        $findings = ConvertFrom-JlReconCheckResponse -CheckName "jl-adversarial-reviewer" -Response @{
            findings = @(
                @{ severity = "nit"; description = "Typo in summary"; recommendation = "Fix the typo" }
                @{ severity = "major"; description = "Decision omits mitigation"; recommendation = "Add the mitigation details" }
                @{ severity = "minor"; description = "Map wording is unclear"; recommendation = "Clarify the map wording" }
            )
        }

        @($findings | Select-Object -ExpandProperty Severity) | Should -Be @("nit", "major", "minor")
    }

    It "handles missing location fields without failing" {
        $findings = ConvertFrom-JlReconCheckResponse -CheckName "jl-adversarial-reviewer" -Response @{
            findings = @(
                @{
                    severity = "major"
                    description = "Recommendation omitted"
                    recommendation = "Add the missing recommendation"
                }
            )
        }

        $findings.Count | Should -Be 1
        $findings[0].Recommendation | Should -Be "Add the missing recommendation"
        $findings[0].File | Should -Be $null
        $findings[0].Line | Should -Be $null
    }

    It "parses JSON payloads from fallback responses" {
        $jsonResponse = @'
{"findings":[{"severity":"minor","description":"JSON payload finding","recommendation":"Inspect the map entry"}]}
'@

        $findings = ConvertFrom-JlReconCheckResponse -CheckName "jl-adversarial-reviewer" -Response $jsonResponse

        $findings.Count | Should -Be 1
        $findings[0].Finding | Should -Be "JSON payload finding"
        $findings[0].Recommendation | Should -Be "Inspect the map entry"
    }
}

Describe "Mode 2 findings display" {
    BeforeEach {
        $local:path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "scripts" "mode2-quality-checks.ps1"
        . $local:path
    }

    It "renders the expected markdown table columns" {
        $table = Format-JlReconMode2FindingsTable -Findings @(
            [pscustomobject]@{
                Severity = "major"
                Check = "jl-adversarial-reviewer"
                Finding = "Decision summary is incomplete"
                Recommendation = "Add the missing rationale"
            }
        )

        $table | Should -Match '^\| Severity \| Check \| Finding \| Recommendation \|'
        $table | Should -Match '\| --- \| --- \| --- \| --- \|'
    }

    It "sorts rows by severity critical to nit" {
        $table = Format-JlReconMode2FindingsTable -Findings @(
            [pscustomobject]@{ Severity = "nit"; Check = "reviewer"; Finding = "Typo"; Recommendation = "Fix typo" },
            [pscustomobject]@{ Severity = "critical"; Check = "reviewer"; Finding = "Contradiction"; Recommendation = "Re-open" },
            [pscustomobject]@{ Severity = "major"; Check = "reviewer"; Finding = "Missing validation"; Recommendation = "Add validation" }
        )

        $lines = $table -split "`r?`n"
        $lines[2] | Should -Match '\| critical \|'
        $lines[3] | Should -Match '\| major \|'
        $lines[4] | Should -Match '\| nit \|'
    }

    It "includes file and location context when available" {
        $table = Format-JlReconMode2FindingsTable -Findings @(
            [pscustomobject]@{
                Severity = "minor"
                Check = "jl-adversarial-reviewer"
                Finding = "Missing cross-ticket reference"
                Recommendation = "Link the related ticket"
                File = ".apm/skills/jl-recon/SKILL.md"
                Line = 530
            }
        )

        $table | Should -Match '\(.apm/skills/jl-recon/SKILL.md:530\)'
    }

    It "renders markdown safely for long findings and special characters" {
        $longFinding = "Pipe | newline`n" + ("x" * 120)

        $table = Format-JlReconMode2FindingsTable -Findings @(
            [pscustomobject]@{
                Severity = "major"
                Check = "jl-adversarial-reviewer"
                Finding = $longFinding
                Recommendation = "Escape special characters"
            }
        )

        $table | Should -Match 'Pipe \\| newline<br>'
        $table | Should -Match ('x' * 40)
        (@($table -split "`r?`n" | Where-Object { $_ -like '| *' })).Count | Should -Be 3
    }
}

Describe "Mode 2 prompt generation" {
    BeforeEach {
        $local:path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "scripts" "mode2-quality-checks.ps1"
        . $local:path
    }

    It "builds the unavailable prompt with override language" {
        $prompt = Get-JlReconMode2DecisionPrompt -CheckRun ([pscustomobject]@{
                AllFailed = $true
                PartialFailure = $false
                FailureSummary = "jl-adversarial-reviewer timed out after 30s"
            }) -FindingsTable $null

        $prompt | Should -Match 'Quality checks unavailable'
        $prompt | Should -Match 'Proceed without checks'
        $prompt | Should -Match 'Override and record anyway'
    }

    It "builds the partial failure prompt with available findings" {
        $prompt = Get-JlReconMode2DecisionPrompt -CheckRun ([pscustomobject]@{
                AllFailed = $false
                PartialFailure = $true
                FailureSummary = "doublecheck failed due to network error"
            }) -FindingsTable '| Severity | Check | Finding | Recommendation |'

        $prompt | Should -Match 'Some quality checks failed'
        $prompt | Should -Match 'Available findings:'
        $prompt | Should -Match 'Approve and record resolution'
    }
}

Describe "Mode 2 user decisions" {
    BeforeEach {
        $local:path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "scripts" "mode2-quality-checks.ps1"
        . $local:path
        $script:auditTrail = [System.Collections.Generic.List[object]]::new()
    }

    It "accepts the approve and record resolution path" {
        $decision = Resolve-JlReconMode2Decision -DecisionProvider { param($prompt, $allowed) "Approve and record resolution" } -AuditTrail $script:auditTrail
        $decision.Decision | Should -Be "approve"
        $script:auditTrail.Count | Should -Be 1
        $script:auditTrail[0].AuditType | Should -Be "decision"
    }

    It "accepts the override and record anyway path" {
        $decision = Resolve-JlReconMode2Decision -DecisionProvider { param($prompt, $allowed) "Override and record anyway" } -AuditTrail $script:auditTrail
        $decision.Decision | Should -Be "override"
        $script:auditTrail.Count | Should -Be 1
    }

    It "accepts the cancel resolution path" {
        $decision = Resolve-JlReconMode2Decision -DecisionProvider { param($prompt, $allowed) "Cancel resolution" } -AuditTrail $script:auditTrail
        $decision.Decision | Should -Be "cancel"
        $script:auditTrail.Count | Should -Be 1
    }

    It "logs the final decision to the audit trail" {
        $decision = Resolve-JlReconMode2Decision -DecisionProvider { param($prompt, $allowed) "Override and record anyway" } -AuditTrail $script:auditTrail
        $decision.Attempt | Should -Be 1
        $script:auditTrail[0].Decision | Should -Be "override"
        $script:auditTrail[0].Prompt | Should -Be "Review Mode 2 quality checks."
    }

    It "retries on invalid input until a valid decision is received" {
        $responses = [System.Collections.Generic.Queue[string]]::new()
        $responses.Enqueue("what")
        $responses.Enqueue("not yet")
        $responses.Enqueue("Approve and record resolution")

        $decision = Resolve-JlReconMode2Decision -DecisionProvider {
            param($prompt, $allowed)
            $responses.Dequeue()
        } -AuditTrail $script:auditTrail

        $decision.Decision | Should -Be "approve"
        $decision.Attempt | Should -Be 3
        $script:auditTrail.Count | Should -Be 1
    }
}
