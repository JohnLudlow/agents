<#
.SYNOPSIS
Pester integration tests for the jl-recon Mode 2 quality checks workflow.

Exercises end-to-end resolution flows across happy, findings, override,
cancel, degraded, partial, and disabled-check scenarios with mocked check
invocations and user decisions.
#>

# Force Pester 6.x for modern Should syntax
Import-Module Pester -MinimumVersion 6.0 -ErrorAction Stop

$skillRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script:mode2ScriptPath = Join-Path $skillRoot "scripts" "mode2-quality-checks.ps1"

if (-not (Test-Path $script:mode2ScriptPath)) {
    throw "Mode 2 quality checks script not found at $script:mode2ScriptPath"
}

Describe "Mode 2 resolution workflow integration" {
    BeforeEach {
        $local:path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "scripts" "mode2-quality-checks.ps1"
        . $local:path
        $script:ticket = [pscustomobject]@{
            Id = 176
            Title = "Mode 2 quality checks integration"
            Resolution = "Documented findings and closed the ticket."
            Findings = @("Decision captured")
            MapContext = "Destination > Decisions-so-far"
        }
        $script:resolutionRecords = [System.Collections.Generic.List[object]]::new()
        $script:auditTrail = [System.Collections.Generic.List[object]]::new()
        $script:attempts = [System.Collections.Generic.List[string]]::new()
    }

    It "happy path: resolves a ticket after checks pass with no findings" {
        $workflow = Invoke-JlReconMode2ResolutionWorkflow `
            -Ticket $script:ticket `
            -Config @{ checks = @{ on_ticket_resolution_enabled = $true } } `
            -StrategyHandlers @{
                subagent = {
                    param($checkName, $ticket)
                    $script:attempts.Add("subagent:$checkName")
                    $ticket.MapContext | Should -Be "Destination > Decisions-so-far"
                    return @{ findings = @() }
                }
            } `
            -DecisionProvider { param($prompt, $allowed) "approve" } `
            -ResolutionRecorder {
                param($ticket, $result)
                $script:resolutionRecords.Add([pscustomobject]@{
                        TicketId = $ticket.Id
                        Decision = $result.Decision
                        ChecksStatus = $result.ChecksStatus
                        FindingsCount = @($result.Findings).Count
                    })
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be "resolved"
        $workflow.Decision | Should -Be "approve"
        $workflow.ChecksStatus | Should -Be "completed"
        $workflow.Findings.Count | Should -Be 0
        $workflow.ResolutionRecorded | Should -BeTrue
        $script:resolutionRecords.Count | Should -Be 1
        $script:resolutionRecords[0].FindingsCount | Should -Be 0
        $script:attempts | Should -Be @("subagent:jl-adversarial-reviewer")
        $script:auditTrail.Count | Should -Be 2
        $script:auditTrail[0].AuditType | Should -Be "checks"
        $script:auditTrail[1].AuditType | Should -Be "decision"
    }

    It "findings path: displays findings and records resolution after approval" {
        $workflow = Invoke-JlReconMode2ResolutionWorkflow `
            -Ticket $script:ticket `
            -Config @{ checks = @{ on_ticket_resolution_enabled = $true } } `
            -StrategyHandlers @{
                subagent = {
                    param($checkName, $ticket)
                    return @{
                        findings = @(
                            @{
                                severity = "major"
                                description = "Resolved ticket omits map inconsistency"
                                recommendation = "Add the related ticket link"
                                file = "docs/plans/ac4/map.md"
                                line = 22
                            }
                        )
                    }
                }
            } `
            -DecisionProvider { param($prompt, $allowed) "approve" } `
            -ResolutionRecorder {
                param($ticket, $result)
                $script:resolutionRecords.Add($result)
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be "resolved"
        $workflow.Decision | Should -Be "approve"
        $workflow.Findings.Count | Should -Be 1
        $workflow.FindingsTable | Should -Match '\| Severity \| Check \| Finding \| Recommendation \|'
        $workflow.FindingsTable | Should -Match 'Resolved ticket omits map inconsistency'
        $workflow.FindingsTable | Should -Match '\(docs/plans/ac4/map.md:22\)'
        $workflow.DecisionPrompt | Should -Match 'Available findings:'
        $script:resolutionRecords.Count | Should -Be 1
    }

    It "override path: records a critical finding override in the audit trail" {
        $workflow = Invoke-JlReconMode2ResolutionWorkflow `
            -Ticket $script:ticket `
            -Config @{ checks = @{ on_ticket_resolution_enabled = $true } } `
            -StrategyHandlers @{
                subagent = {
                    param($checkName, $ticket)
                    return @{
                        findings = @(
                            @{
                                severity = "critical"
                                description = "Resolution conflicts with blocking ticket"
                                recommendation = "Re-open or justify the conflict"
                            }
                        )
                    }
                }
            } `
            -DecisionProvider { param($prompt, $allowed) "override" } `
            -ResolutionRecorder {
                param($ticket, $result)
                $script:resolutionRecords.Add($result)
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be "resolved"
        $workflow.Decision | Should -Be "override"
        $workflow.Findings.Count | Should -Be 1
        $script:auditTrail.Count | Should -Be 2
        $script:auditTrail[1].Decision | Should -Be "override"
        $script:resolutionRecords.Count | Should -Be 1
        $script:resolutionRecords[0].Decision | Should -Be "override"
    }

    It "cancel path: returns to resolve step without recording, then allows re-resolution" {
        $findingsResponse = @{
            findings = @(
                @{
                    severity = "major"
                    description = "Missing mitigation details"
                    recommendation = "Update the resolution text"
                }
            )
        }

        $firstRun = Invoke-JlReconMode2ResolutionWorkflow `
            -Ticket $script:ticket `
            -Config @{ checks = @{ on_ticket_resolution_enabled = $true } } `
            -StrategyHandlers @{ subagent = { param($checkName, $ticket) $findingsResponse } } `
            -DecisionProvider { param($prompt, $allowed) "Cancel resolution" } `
            -ResolutionRecorder {
                param($ticket, $result)
                $script:resolutionRecords.Add($result)
            } `
            -AuditTrail $script:auditTrail

        $firstRun.Status | Should -Be "returned-to-resolve-step"
        $firstRun.ResolutionRecorded | Should -BeFalse
        $firstRun.DecisionPrompt | Should -Match 'Cancel resolution'
        $script:resolutionRecords.Count | Should -Be 0

        $secondRun = Invoke-JlReconMode2ResolutionWorkflow `
            -Ticket $script:ticket `
            -Config @{ checks = @{ on_ticket_resolution_enabled = $true } } `
            -StrategyHandlers @{ subagent = { param($checkName, $ticket) @{ findings = @() } } } `
            -DecisionProvider { param($prompt, $allowed) "approve" } `
            -ResolutionRecorder {
                param($ticket, $result)
                $script:resolutionRecords.Add($result)
            } `
            -AuditTrail $script:auditTrail

        $secondRun.Status | Should -Be "resolved"
        $secondRun.ResolutionRecorded | Should -BeTrue
        $script:resolutionRecords.Count | Should -Be 1
    }

    It "degradation path: warns through unavailable status and proceeds without blocking" {
        $workflow = Invoke-JlReconMode2ResolutionWorkflow `
            -Ticket $script:ticket `
            -Config @{ checks = @{ on_ticket_resolution_enabled = $true } } `
            -StrategyHandlers @{
                subagent = { param($checkName, $ticket) throw "timeout" }
                herdr = { param($checkName, $ticket) throw "network error" }
                session = { param($checkName, $ticket) throw "session unavailable" }
            } `
            -DecisionProvider { param($prompt, $allowed) "Proceed without checks" } `
            -ResolutionRecorder {
                param($ticket, $result)
                $script:resolutionRecords.Add($result)
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be "resolved"
        $workflow.Decision | Should -Be "proceed"
        $workflow.ChecksStatus | Should -Be "unavailable"
        $workflow.CheckRun.AllFailed | Should -BeTrue
        $workflow.DecisionPrompt | Should -Match 'Proceed without checks'
        $workflow.ResolutionRecorded | Should -BeTrue
        $script:resolutionRecords.Count | Should -Be 1
        $script:resolutionRecords[0].ChecksStatus | Should -Be "unavailable"
    }

    It "partial availability path: preserves findings while warning about failed checks" {
        $workflow = Invoke-JlReconMode2ResolutionWorkflow `
            -Ticket $script:ticket `
            -Config @{ checks = @{ on_ticket_resolution_enabled = $true } } `
            -CheckRequests @(
                [pscustomobject]@{ Name = "jl-adversarial-reviewer" },
                [pscustomobject]@{ Name = "doublecheck" }
            ) `
            -StrategyHandlers @{
                subagent = {
                    param($checkName, $ticket)
                    if ($checkName -eq "jl-adversarial-reviewer") {
                        return @{
                            findings = @(
                                @{
                                    severity = "minor"
                                    description = "Map note needs a linked location"
                                    recommendation = "Link the map entry"
                                }
                            )
                        }
                    }

                    throw "network error"
                }
                herdr = { param($checkName, $ticket) throw "Herdr unavailable" }
                session = { param($checkName, $ticket) throw "session unavailable" }
            } `
            -DecisionProvider { param($prompt, $allowed) "approve" } `
            -ResolutionRecorder {
                param($ticket, $result)
                $script:resolutionRecords.Add($result)
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be "resolved"
        $workflow.ChecksStatus | Should -Be "partial"
        $workflow.Findings.Count | Should -Be 1
        $workflow.DecisionPrompt | Should -Match 'Some quality checks failed'
        $workflow.DecisionPrompt | Should -Match 'Approve and record resolution'
        $workflow.ChecksAuditEntry.FailedChecks | Should -Contain 'doublecheck'
    }

    It "disabled checks path: skips invocation entirely and logs skip status" {
        $workflow = Invoke-JlReconMode2ResolutionWorkflow `
            -Ticket $script:ticket `
            -Config @{ checks = @{ on_ticket_resolution_enabled = $false } } `
            -StrategyHandlers @{
                subagent = { param($checkName, $ticket) throw "should not be called" }
            } `
            -DecisionProvider { param($prompt, $allowed) throw "decision should not be requested" } `
            -ResolutionRecorder {
                param($ticket, $result)
                $script:resolutionRecords.Add($result)
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be "resolved"
        $workflow.Decision | Should -Be "approve"
        $workflow.ChecksStatus | Should -Be "disabled"
        $workflow.CheckRun | Should -Be $null
        $workflow.ChecksAuditEntry.AuditType | Should -Be "checks"
        $workflow.ChecksAuditEntry.ChecksStatus | Should -Be "disabled"
        $script:resolutionRecords.Count | Should -Be 1
        $script:auditTrail.Count | Should -Be 1
    }
}

