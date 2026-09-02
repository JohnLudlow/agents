<#
.SYNOPSIS
Pester integration tests for the jl-recon Mode 3 publication workflow.

Exercises end-to-end publication flows across happy, override, cancel,
degraded, and disabled-check scenarios with mocked check handlers and
provider-specific publishers.
#>

Import-Module Pester -MinimumVersion 6.0 -ErrorAction Stop

$skillRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script:mode3ScriptPath = Join-Path $skillRoot 'scripts' 'mode3-quality-checks.ps1'

if (-not (Test-Path $script:mode3ScriptPath)) {
    throw "Mode 3 quality checks script not found at $script:mode3ScriptPath"
}

Describe 'Mode 3 publication workflow integration' {
    BeforeEach {
        . (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1')
        $script:statusReportId = 'status-42'
        $script:statusReportText = @"
Status report:
- API integration is complete.
- Azure DevOps publishing remains blocked on final sign-off.
"@
        $script:publishCalls = [System.Collections.Generic.List[object]]::new()
        $script:decisionCalls = [System.Collections.Generic.List[object]]::new()
        $script:auditTrail = [System.Collections.Generic.List[object]]::new()
        $script:JlReconMode3AuditTrail = [System.Collections.Generic.List[object]]::new()
        $script:checkAttempts = [System.Collections.Generic.List[string]]::new()
    }

    It 'publishes in the GitHub Issues flow after approval and records audit output' {
        $workflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId $script:statusReportId `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $true; timeout_seconds = 45 } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds)
                    $script:checkAttempts.Add("subagent:${checkName}:$timeoutSeconds")
                    return @{
                        claims = @(
                            @{
                                text = 'API integration is complete.'
                                status = 'VERIFIED'
                                confidence = 96
                                sources = @('https://example.test/github-issue')
                            }
                        )
                    }
                }
            } `
            -DecisionProvider {
                param($prompt, $findingsTable, $failureWarnings)
                $script:decisionCalls.Add([pscustomobject]@{
                        Prompt = $prompt
                        FindingsTable = $findingsTable
                        FailureWarnings = @($failureWarnings)
                    })
                return 'approve'
            } `
            -ReportPublisher {
                param($reportText, $context)
                $script:publishCalls.Add([pscustomobject]@{
                        ReportText = $reportText
                        Context = $context
                    })
                return [pscustomobject]@{
                    ReportId = 'gh-status-42'
                    Provider = 'github-issues'
                }
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be 'published'
        $workflow.Published | Should -BeTrue
        $workflow.Decision | Should -Be 'approve'
        $workflow.ChecksEnabled | Should -BeTrue
        $workflow.ChecksStatus | Should -Be 'completed'
        $workflow.StatusReportId | Should -Be 'gh-status-42'
        $workflow.Findings.Count | Should -Be 1
        $workflow.FindingsTable | Should -Match '\| API integration is complete\. \| VERIFIED \| 96% \|'
        $workflow.AuditEntry.ReportId | Should -Be 'gh-status-42'
        $workflow.AuditEntry.UserDecision | Should -Be 'approve'
        $workflow.AuditEntry.Override | Should -BeFalse
        $script:checkAttempts | Should -Be @('subagent:doublecheck:45')
        $script:decisionCalls.Count | Should -Be 1
        $script:decisionCalls[0].Prompt | Should -Match 'Approve and publish report'
        $script:publishCalls.Count | Should -Be 1
        $script:publishCalls[0].Context.UserDecision.Choice | Should -Be 'approve'
        $script:publishCalls[0].Context.ChecksStatus | Should -Be 'completed'
        $script:auditTrail.Count | Should -Be 1
    }

    It 'publishes in the Azure DevOps flow after an override with partial findings' {
        $warnings = $null
        $workflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId 'status-ado-17' `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $true } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds)
                    $script:checkAttempts.Add("subagent:${checkName}")
                    return @{
                        claims = @(
                            @{
                                text = 'Azure DevOps publishing remains blocked on final sign-off.'
                                status = 'DISPUTED'
                                confidence = 35
                                sources = @('https://example.test/ado-signoff')
                                recommendation = 'Revise the blocked status wording'
                            }
                        )
                    }
                }
                herdr = { param($checkName, $payload, $timeoutSeconds) throw 'should not be called' }
                session = { param($checkName, $payload, $timeoutSeconds) throw 'should not be called' }
            } `
            -DecisionProvider {
                param($prompt, $findingsTable, $failureWarnings)
                $script:decisionCalls.Add([pscustomobject]@{
                        Prompt = $prompt
                        FindingsTable = $findingsTable
                        FailureWarnings = @($failureWarnings)
                    })
                return [pscustomobject]@{
                    Choice = 'override'
                    Timestamp = '2026-09-02T20:00:00.0000000+00:00'
                    UserId = 'johnl'
                }
            } `
            -ReportPublisher {
                param($reportText, $context)
                $script:publishCalls.Add([pscustomobject]@{
                        ReportText = $reportText
                        Context = $context
                    })
                return [pscustomobject]@{
                    StatusReportId = 'ado-status-17'
                    Provider = 'azure-devops'
                }
            } `
            -AuditTrail $script:auditTrail `
            -WarningAction SilentlyContinue `
            -WarningVariable warnings

        $workflow.Status | Should -Be 'published'
        $workflow.Decision | Should -Be 'override'
        $workflow.ChecksStatus | Should -Be 'completed'
        $workflow.StatusReportId | Should -Be 'ado-status-17'
        $workflow.Findings.Count | Should -Be 1
        $workflow.FindingsTable | Should -Match '\| Azure DevOps publishing remains blocked on final sign-off\. \| DISPUTED \| 35% \|'
        $workflow.AuditEntry.UserDecision | Should -Be 'override'
        $workflow.AuditEntry.Override | Should -BeTrue
        $workflow.AuditEntry.FindingsSummary.DisputedCount | Should -Be 1
        $script:publishCalls.Count | Should -Be 1
        $script:publishCalls[0].Context.UserDecision.Choice | Should -Be 'override'
        $script:auditTrail.Count | Should -Be 1
        @($warnings).Count | Should -Be 0
    }

    It 'allows publication when checks degrade and the user explicitly publishes anyway' {
        $warnings = $null
        $workflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId $script:statusReportId `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $true } } `
            -SubagentSpawningHandlers @{
                subagent = { param($checkName, $payload, $timeoutSeconds) throw 'timeout' }
                herdr = { param($checkName, $payload, $timeoutSeconds) throw 'network error' }
                session = { param($checkName, $payload, $timeoutSeconds) throw 'session unavailable' }
            } `
            -DecisionProvider {
                param($prompt, $findingsTable, $failureWarnings)
                $script:decisionCalls.Add([pscustomobject]@{
                        Prompt = $prompt
                        FindingsTable = $findingsTable
                        FailureWarnings = @($failureWarnings)
                    })
                return 'publish'
            } `
            -ReportPublisher {
                param($reportText, $context)
                $script:publishCalls.Add([pscustomobject]@{
                        ReportText = $reportText
                        Context = $context
                    })
                return 'status-42-published'
            } `
            -AuditTrail $script:auditTrail `
            -WarningAction SilentlyContinue `
            -WarningVariable warnings

        $workflow.Status | Should -Be 'published'
        $workflow.Decision | Should -Be 'publish'
        $workflow.ChecksStatus | Should -Be 'unavailable'
        $workflow.Findings.Count | Should -Be 0
        $workflow.WarningMessages.Count | Should -Be 1
        $workflow.DecisionPrompt | Should -Match 'Quality checks unavailable'
        $workflow.AuditEntry.Degradation.Degraded | Should -BeTrue
        $workflow.AuditEntry.FindingsSummary.FailedCheckCount | Should -Be 1
        $script:publishCalls.Count | Should -Be 1
        $script:decisionCalls.Count | Should -Be 1
        @($warnings)[0].ToString() | Should -Match 'timed out after 30s'
    }

    It 'blocks publication when the user cancels after reviewing findings' {
        $workflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId $script:statusReportId `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $true } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds)
                    return @{
                        claims = @(
                            @{
                                text = 'Azure DevOps publishing remains blocked on final sign-off.'
                                status = 'UNVERIFIED'
                                confidence = 50
                                sources = @('https://example.test/needs-review')
                            }
                        )
                    }
                }
            } `
            -DecisionProvider {
                param($prompt, $findingsTable, $failureWarnings)
                $script:decisionCalls.Add([pscustomobject]@{
                        Prompt = $prompt
                        FindingsTable = $findingsTable
                        FailureWarnings = @($failureWarnings)
                    })
                return 'cancel'
            } `
            -ReportPublisher {
                param($reportText, $context)
                throw 'publisher should not be called'
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be 'returned-to-report-generation'
        $workflow.Published | Should -BeFalse
        $workflow.Decision | Should -Be 'cancel'
        $workflow.ChecksStatus | Should -Be 'completed'
        $workflow.Findings.Count | Should -Be 1
        $workflow.AuditEntry.UserDecision | Should -Be 'cancel'
        $workflow.AuditEntry.Override | Should -BeFalse
        $script:publishCalls.Count | Should -Be 0
        $script:decisionCalls.Count | Should -Be 1
        $script:auditTrail.Count | Should -Be 1
    }

    It 'skips Mode 3 checks entirely when disabled and still requires publication approval' {
        $workflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId $script:statusReportId `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $false; timeout_seconds = 10 } } `
            -SubagentSpawningHandlers @{
                subagent = { param($checkName, $payload, $timeoutSeconds) throw 'should not be called' }
            } `
            -DecisionProvider {
                param($prompt, $findingsTable, $failureWarnings)
                $script:decisionCalls.Add([pscustomobject]@{
                        Prompt = $prompt
                        FindingsTable = $findingsTable
                        FailureWarnings = @($failureWarnings)
                    })
                return [pscustomobject]@{
                    Choice = 'approve'
                    Timestamp = '2026-09-02T20:10:00.0000000+00:00'
                    UserId = 'johnl'
                }
            } `
            -ReportPublisher {
                param($reportText, $context)
                $script:publishCalls.Add([pscustomobject]@{
                        ReportText = $reportText
                        Context = $context
                    })
                return 'status-42-disabled'
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be 'published'
        $workflow.Published | Should -BeTrue
        $workflow.Decision | Should -Be 'approve'
        $workflow.ChecksEnabled | Should -BeFalse
        $workflow.CheckRun | Should -Be $null
        $workflow.ChecksStatus | Should -Be 'disabled'
        $workflow.Findings.Count | Should -Be 0
        $workflow.WarningMessages | Should -Be @('Mode 3 quality checks disabled by configuration.')
        $workflow.AuditEntry.UserDecision | Should -Be 'approve'
        $workflow.AuditEntry.FindingsSummary.TotalClaims | Should -Be 0
        $script:checkAttempts.Count | Should -Be 0
        $script:decisionCalls[0].Prompt | Should -Match 'Mode 3 quality checks disabled by configuration'
        $script:publishCalls.Count | Should -Be 1
        $script:auditTrail.Count | Should -Be 1
    }

    It 'shows mixed verification findings before an Azure DevOps override and records degraded audit details' {
        $warnings = $null
        $workflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId 'status-ado-mixed' `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $true; timeout_seconds = 30 } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds)
                    return @{
                        claims = @(
                            @{
                                text = 'API integration is complete.'
                                status = 'VERIFIED'
                                confidence = 97
                                sources = @('https://example.test/verified')
                            },
                            @{
                                text = 'Azure DevOps publishing remains blocked on final sign-off.'
                                status = 'DISPUTED'
                                confidence = 15
                                sources = @('https://example.test/disputed')
                            },
                            @{
                                text = 'Broken claim'
                                status = ''
                            }
                        )
                    }
                }
            } `
            -DecisionProvider {
                param($prompt, $findingsTable, $failureWarnings)
                $script:decisionCalls.Add([pscustomobject]@{
                        Prompt = $prompt
                        FindingsTable = $findingsTable
                        FailureWarnings = @($failureWarnings)
                    })
                return 'override'
            } `
            -ReportPublisher {
                param($reportText, $context)
                $script:publishCalls.Add([pscustomobject]@{
                        ReportText = $reportText
                        Context = $context
                    })
                return [pscustomobject]@{
                    StatusReportId = 'ado-status-mixed'
                    Provider = 'azure-devops'
                }
            } `
            -AuditTrail $script:auditTrail `
            -WarningAction SilentlyContinue `
            -WarningVariable warnings

        $workflow.Status | Should -Be 'published'
        $workflow.Decision | Should -Be 'override'
        $workflow.ChecksStatus | Should -Be 'partial'
        $workflow.StatusReportId | Should -Be 'ado-status-mixed'
        $workflow.Findings.Count | Should -Be 2
        $workflow.FindingsTable | Should -Match 'VERIFIED'
        $workflow.FindingsTable | Should -Match 'DISPUTED'
        $workflow.WarningMessages | Should -Contain 'Malformed findings from doublecheck; skipping invalid claim'
        $workflow.AuditEntry.Override | Should -BeTrue
        $workflow.AuditEntry.Degradation.Degraded | Should -BeTrue
        $workflow.AuditEntry.FindingsSummary.VerifiedCount | Should -Be 1
        $workflow.AuditEntry.FindingsSummary.DisputedCount | Should -Be 1
        $script:publishCalls[0].Context.ChecksStatus | Should -Be 'partial'
        $script:decisionCalls[0].Prompt | Should -Match 'Malformed findings from doublecheck; skipping invalid claim'
        @($warnings)[0].ToString() | Should -Match '^Check doublecheck returned malformed findings: claim at index 2 is missing status'
    }

    It 'resolves Mode 3 config defaults, explicit values, and invalid timeout fallback correctly' {
        $defaultWorkflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId 'status-default' `
            -StatusReportText $script:statusReportText `
            -Config $null `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds)
                    $script:checkAttempts.Add("default:$timeoutSeconds")
                    return @{ claims = @(@{ text = 'Default config claim'; status = 'VERIFIED'; confidence = 90 }) }
                }
            } `
            -DecisionProvider { 'approve' } `
            -ReportPublisher { param($reportText, $context) 'status-default-published' } `
            -AuditTrail $script:auditTrail

        $enabledWorkflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId 'status-enabled' `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $true; timeout_seconds = 12 } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds)
                    $script:checkAttempts.Add("enabled:$timeoutSeconds")
                    return @{ claims = @(@{ text = 'Enabled config claim'; status = 'VERIFIED'; confidence = 90 }) }
                }
            } `
            -DecisionProvider { 'approve' } `
            -ReportPublisher { param($reportText, $context) 'status-enabled-published' } `
            -AuditTrail $script:auditTrail

        $invalidTimeoutWorkflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId 'status-invalid-timeout' `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $true; timeout_seconds = 'invalid' } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds)
                    $script:checkAttempts.Add("invalid:$timeoutSeconds")
                    return @{ claims = @(@{ text = 'Invalid timeout claim'; status = 'VERIFIED'; confidence = 90 }) }
                }
            } `
            -DecisionProvider { 'approve' } `
            -ReportPublisher { param($reportText, $context) 'status-invalid-timeout-published' } `
            -AuditTrail $script:auditTrail

        $disabledWorkflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId 'status-disabled' `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $false; timeout_seconds = 9 } } `
            -SubagentSpawningHandlers @{
                subagent = { param($checkName, $payload, $timeoutSeconds) throw 'disabled path should not invoke checks' }
            } `
            -DecisionProvider { 'approve' } `
            -ReportPublisher { param($reportText, $context) 'status-disabled-published' } `
            -AuditTrail $script:auditTrail

        $defaultWorkflow.ChecksEnabled | Should -BeTrue
        $defaultWorkflow.ChecksStatus | Should -Be 'completed'
        $enabledWorkflow.ChecksStatus | Should -Be 'completed'
        $invalidTimeoutWorkflow.ChecksStatus | Should -Be 'completed'
        $disabledWorkflow.ChecksEnabled | Should -BeFalse
        $disabledWorkflow.ChecksStatus | Should -Be 'disabled'
        $script:checkAttempts | Should -Be @('default:30', 'enabled:12', 'invalid:30')
    }

    It 'uses interactive input when no decision provider is supplied and honors publisher Id values' {
        Mock Read-Host {
            param($Prompt)
            $script:decisionCalls.Add([pscustomobject]@{ Prompt = $Prompt })
            '1'
        }

        $workflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId 'status-interactive' `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $true } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds)
                    return @{ claims = @(@{ text = 'API integration is complete.'; status = 'VERIFIED'; confidence = 94 }) }
                }
            } `
            -ReportPublisher {
                param($reportText, $context)
                return [pscustomobject]@{
                    Id = 'interactive-id'
                    Provider = 'github-issues'
                }
            } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be 'published'
        $workflow.Decision | Should -Be 'approve'
        $workflow.StatusReportId | Should -Be 'interactive-id'
        $script:decisionCalls.Count | Should -Be 1
        Should -Invoke Read-Host -Times 1 -Exactly
    }

    It 'throws when the decision provider returns no valid publication decision' {
        {
            Invoke-JlReconMode3PublicationWorkflow `
                -StatusReportId 'status-invalid-decision' `
                -StatusReportText $script:statusReportText `
                -Config @{ checks = @{ on_status_report_enabled = $true } } `
                -SubagentSpawningHandlers @{
                    subagent = {
                        param($checkName, $payload, $timeoutSeconds)
                        return @{ claims = @(@{ text = 'API integration is complete.'; status = 'VERIFIED'; confidence = 94 }) }
                    }
                } `
                -DecisionProvider { $null } `
                -ReportPublisher { param($reportText, $context) 'should-not-publish' } `
                -AuditTrail $script:auditTrail
        } | Should -Throw 'A valid Mode 3 decision was not provided.'
    }

    It 'returns to report generation when checks are disabled and the user cancels publication' {
        $workflow = Invoke-JlReconMode3PublicationWorkflow `
            -StatusReportId 'status-disabled-cancel' `
            -StatusReportText $script:statusReportText `
            -Config @{ checks = @{ on_status_report_enabled = $false } } `
            -DecisionProvider { 'cancel' } `
            -ReportPublisher { param($reportText, $context) throw 'publisher should not be called' } `
            -AuditTrail $script:auditTrail

        $workflow.Status | Should -Be 'returned-to-report-generation'
        $workflow.Published | Should -BeFalse
        $workflow.ChecksStatus | Should -Be 'disabled'
        $workflow.AuditEntry.UserDecision | Should -Be 'cancel'
    }
}
