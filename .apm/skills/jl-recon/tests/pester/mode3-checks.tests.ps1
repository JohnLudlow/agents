<#
.SYNOPSIS
Pester unit tests for jl-recon Mode 3 quality check logic.

Tests configuration helpers, doublecheck fallback invocation, claim parsing,
markdown rendering, prompts, user decisions, and audit summary handling.
#>

Import-Module Pester -MinimumVersion 6.0 -ErrorAction Stop

if (-not ('BlankUrlValue' -as [type])) {
    Add-Type -TypeDefinition @'
public class BlankUrlValue
{
    public override string ToString()
    {
        return "";
    }
}
'@
}

$skillRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$scriptPath = Join-Path $skillRoot 'scripts' 'mode3-quality-checks.ps1'

if (-not (Test-Path $scriptPath)) {
    throw "Mode 3 quality checks script not found at $scriptPath"
}

function Ensure-TestJlReconMode3RawFindingsAvailableFunction {
    if ($null -ne (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
        return
    }

    function Test-JlReconMode3RawFindingsAvailable {
        [CmdletBinding()]
        param(
            [Parameter()]
            [AllowNull()]
            [object]$ParsedResponse
        )

        if ($null -eq $ParsedResponse) {
            return $false
        }

        if ($ParsedResponse -is [System.Collections.IDictionary]) {
            if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) {
                return $true
            }

            if ($ParsedResponse.Contains('report')) {
                return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report']
            }

            return $false
        }

        if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or
            (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) {
            return $true
        }

        if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') {
            return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report')
        }

        return $false
    }
}

Describe 'Mode 3 checks configuration' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
        if ($null -eq (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
            function Test-JlReconMode3RawFindingsAvailable {
                param([object]$ParsedResponse)
                if ($null -eq $ParsedResponse) { return $false }
                if ($ParsedResponse -is [System.Collections.IDictionary]) {
                    if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) { return $true }
                    if ($ParsedResponse.Contains('report')) { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report'] }
                    return $false
                }
                if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) { return $true }
                if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report') }
                return $false
            }
        }
    }

    It 'returns null when no config is provided' {
        Get-JlReconChecksConfig -Config $null | Should -Be $null
    }

    It 'extracts checks from a hashtable config' {
        $checks = Get-JlReconChecksConfig -Config @{
            checks = @{
                on_status_report_enabled = $false
                timeout_seconds = 45
            }
        }

        $checks.on_status_report_enabled | Should -BeFalse
        $checks.timeout_seconds | Should -Be 45
    }

    It 'extracts checks from a PSObject config' {
        $checks = Get-JlReconChecksConfig -Config ([pscustomobject]@{
                checks = [pscustomobject]@{
                    on_status_report_enabled = $true
                    timeout_seconds = 50
                }
            })

        $checks.on_status_report_enabled | Should -BeTrue
        $checks.timeout_seconds | Should -Be 50
    }

    It 'returns null when checks are missing' {
        Get-JlReconChecksConfig -Config @{ other = 'value' } | Should -Be $null
    }

    It 'defaults enablement to true when config is missing' {
        Get-JlReconMode3ChecksEnabled -Config $null | Should -BeTrue
    }

    It 'defaults enablement to true when checks are missing' {
        Get-JlReconMode3ChecksEnabled -Config @{ other = 'value' } | Should -BeTrue
    }

    It 'reads enablement from a hashtable config' {
        Get-JlReconMode3ChecksEnabled -Config @{ checks = @{ on_status_report_enabled = $false } } | Should -BeFalse
    }

    It 'reads enablement from a PSObject config' {
        Get-JlReconMode3ChecksEnabled -Config ([pscustomobject]@{ checks = [pscustomobject]@{ on_status_report_enabled = $true } }) | Should -BeTrue
    }

    It 'defaults timeout to 30 seconds when config is missing' {
        Get-JlReconMode3ChecksTimeoutSeconds -Config $null | Should -Be 30
    }

    It 'uses the supplied default timeout when checks are missing' {
        Get-JlReconMode3ChecksTimeoutSeconds -Config @{ other = 'value' } -DefaultTimeoutSeconds 15 | Should -Be 15
    }

    It 'reads timeout from a hashtable config' {
        Get-JlReconMode3ChecksTimeoutSeconds -Config @{ checks = @{ timeout_seconds = 45 } } | Should -Be 45
    }

    It 'reads timeout from a PSObject config' {
        Get-JlReconMode3ChecksTimeoutSeconds -Config ([pscustomobject]@{ checks = [pscustomobject]@{ timeout_seconds = '60' } }) | Should -Be 60
    }

    It 'returns the default timeout when the configured timeout is zero' {
        Get-JlReconMode3ChecksTimeoutSeconds -Config @{ checks = @{ timeout_seconds = 0 } } -DefaultTimeoutSeconds 22 | Should -Be 22
    }

    It 'returns the default timeout when the configured timeout is negative' {
        Get-JlReconMode3ChecksTimeoutSeconds -Config @{ checks = @{ timeout_seconds = -5 } } -DefaultTimeoutSeconds 22 | Should -Be 22
    }

    It 'returns the default timeout when the configured timeout is not an integer' {
        Get-JlReconMode3ChecksTimeoutSeconds -Config @{ checks = @{ timeout_seconds = 'abc' } } -DefaultTimeoutSeconds 22 | Should -Be 22
    }
}

Describe 'Mode 3 check invocation' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
        if ($null -eq (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
            function Test-JlReconMode3RawFindingsAvailable {
                param([object]$ParsedResponse)
                if ($null -eq $ParsedResponse) { return $false }
                if ($ParsedResponse -is [System.Collections.IDictionary]) {
                    if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) { return $true }
                    if ($ParsedResponse.Contains('report')) { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report'] }
                    return $false
                }
                if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) { return $true }
                if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report') }
                return $false
            }
        }
        $script:statusReportText = @"
Status report:
- Mode 3 Step 2 is in progress.
- Unit tests are being added.
"@
        $script:invocations = [System.Collections.Generic.List[string]]::new()
    }

    It 'invokes doublecheck through the subagent strategy first' {
        $handlers = @{
            subagent = {
                param($checkName, $payload, $timeoutSeconds)
                $script:invocations.Add("subagent:${checkName}:$timeoutSeconds")
                $payload | Should -Match 'Mode 3 Step 2'
                return @{ claims = @(@{ text = 'Mode 3 Step 2 is in progress.'; status = 'VERIFIED'; confidence = 95; sources = @('https://example.test/evidence') }) }
            }
        }

        $informationMessages = $null
        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -TimeoutSeconds 45 -SubagentSpawningHandlers $handlers -InformationAction Continue -InformationVariable informationMessages

        $result.AnySucceeded | Should -BeTrue
        $result.SuccessfulChecks[0].Strategy | Should -Be 'subagent'
        $result.Findings.Count | Should -Be 1
        $script:invocations | Should -Be @('subagent:doublecheck:45')
        @($informationMessages)[0].ToString() | Should -Be 'Starting Mode 3 checks (timeout: 45s)'
    }

    It 'falls back to Herdr when the subagent path fails' {
        $handlers = @{
            subagent = {
                param($checkName, $payload, $timeoutSeconds)
                $script:invocations.Add("subagent:${checkName}")
                throw 'task timeout'
            }
            herdr = {
                param($checkName, $payload, $timeoutSeconds)
                $script:invocations.Add("herdr:${checkName}")
                return @{ claims = @(@{ text = 'Unit tests are being added.'; status = 'PLAUSIBLE'; confidence = 70; sources = @('https://example.test/tests') }) }
            }
        }

        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -SubagentSpawningHandlers $handlers

        $result.AnySucceeded | Should -BeTrue
        $result.SuccessfulChecks[0].Strategy | Should -Be 'herdr'
        $result.SuccessfulChecks[0].Attempts.Count | Should -Be 2
        $result.SuccessfulChecks[0].Attempts[0].Category | Should -Be 'timeout'
        $script:invocations | Should -Be @('subagent:doublecheck', 'herdr:doublecheck')
    }

    It 'falls back to reading into the session when subagent and Herdr fail' {
        $handlers = @{
            subagent = { param($checkName, $payload, $timeoutSeconds) throw 'subagent unavailable' }
            herdr = { param($checkName, $payload, $timeoutSeconds) throw 'Herdr unavailable' }
            session = {
                param($checkName, $payload, $timeoutSeconds)
                return @{ report = @{ claims = @(@{ claim = 'Session fallback still verifies claims.'; status = 'VERIFIED'; confidence = 88; sources = @(@{ title = 'Session note'; url = 'https://example.test/session' }) }) } }
            }
        }

        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -SubagentSpawningHandlers $handlers

        $result.AnySucceeded | Should -BeTrue
        $result.SuccessfulChecks[0].Strategy | Should -Be 'session'
        $result.SuccessfulChecks[0].Attempts.Count | Should -Be 3
        $result.Findings[0].Claim | Should -Be 'Session fallback still verifies claims.'
    }

    It 'returns an unavailable result when every fallback strategy fails' {
        $handlers = @{
            subagent = { param($checkName, $payload, $timeoutSeconds) throw 'timeout' }
            herdr = { param($checkName, $payload, $timeoutSeconds) throw 'network error' }
            session = { param($checkName, $payload, $timeoutSeconds) throw 'session unavailable' }
        }

        $warnings = $null
        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -SubagentSpawningHandlers $handlers -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks.Count | Should -Be 1
        $result.FailedChecks[0].FailureCategory | Should -Be 'timeout'
        @($warnings)[0].ToString() | Should -Be 'Check doublecheck timed out after 30s'
    }

    It 'warns and degrades gracefully when no doublecheck handler is available' {
        $warnings = $null
        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -SubagentSpawningHandlers @{} -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.ChecksStatus | Should -Be 'unavailable'
        $result.Degraded | Should -BeTrue
        $result.WarningMessages | Should -Contain 'Doublecheck unavailable (handler not found in this harness)'
        @($warnings)[0].ToString() | Should -Be 'Check doublecheck is not available in this harness — No handler registered.'
    }

    It 'detects timeout based on configured timeout seconds' {
        $handlers = @{
            subagent = @{
                Invoke = {
                    param($checkName, $payload, $timeoutSeconds)
                    Start-Sleep -Milliseconds 1200
                    return @{ claims = @(@{ text = 'Delayed result'; status = 'VERIFIED'; confidence = 90 }) }
                }
            }
        }

        $warnings = $null
        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -TimeoutSeconds 1 -SubagentSpawningHandlers $handlers -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks[0].FailureCategory | Should -Be 'timeout'
        @($warnings)[0].ToString() | Should -Be 'Check doublecheck timed out after 1s'
        $result.WarningMessages | Should -Contain 'Doublecheck timed out after 1s; proceeding without verification'
    }

    It 'warns and degrades gracefully on network errors' {
        $handlers = @{
            subagent = { param($checkName, $payload, $timeoutSeconds) throw [System.Net.Http.HttpRequestException]::new('Connection refused') }
            herdr = { param($checkName, $payload, $timeoutSeconds) throw [System.Net.WebException]::new('DNS lookup failed') }
            session = { param($checkName, $payload, $timeoutSeconds) throw [System.Net.Http.HttpRequestException]::new('Gateway timeout') }
        }

        $warnings = $null
        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -SubagentSpawningHandlers $handlers -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks[0].FailureCategory | Should -Be 'network'
        $result.WarningMessages | Should -Contain 'Network error calling doublecheck; proceeding without verification'
        @($warnings)[0].ToString() | Should -Match 'Check doublecheck failed due to network error'
    }

    It 'keeps partial results when a timeout includes a partial response' {
        $handlers = @{
            subagent = {
                param($checkName, $payload, $timeoutSeconds)

                $timeoutException = [System.TimeoutException]::new('Timed out with partial results')
                $timeoutException.Data['Response'] = @{
                    claims = @(
                        @{ text = 'Verified before timeout'; status = 'VERIFIED'; confidence = 93; sources = @('https://example.test/partial') }
                    )
                }

                throw $timeoutException
            }
        }

        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -TimeoutSeconds 30 -SubagentSpawningHandlers $handlers

        $result.PartialFailure | Should -BeTrue
        $result.Findings.Count | Should -Be 1
        $result.Findings[0].Claim | Should -Be 'Verified before timeout'
        $result.WarningMessages | Should -Contain 'Doublecheck timed out after 30s; partial results (1 claim verified)'
    }

    It 'keeps partial findings when some claims are malformed' {
        $handlers = @{
            subagent = {
                param($checkName, $payload, $timeoutSeconds)
                return @{
                    claims = @(
                        @{ text = 'Verified claim'; status = 'VERIFIED'; confidence = 91; sources = @('https://example.test/verified') },
                        @{ text = 'Broken claim'; confidence = 10 },
                        @{ text = 'Risky claim'; status = 'FABRICATION_RISK'; confidence = 5; sources = @('https://example.test/risky') }
                    )
                }
            }
        }

        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -SubagentSpawningHandlers $handlers

        $result.AnySucceeded | Should -BeTrue
        $result.PartialFailure | Should -BeTrue
        $result.ChecksStatus | Should -Be 'partial'
        $result.Findings.Count | Should -Be 2
        $result.MalformedFindings.Count | Should -Be 1
        @($result.Findings | Select-Object -ExpandProperty Status) | Should -Be @('VERIFIED', 'FABRICATION_RISK')
        $result.WarningMessages | Should -Contain 'Malformed findings from doublecheck; skipping invalid claim'
    }
}

Describe 'Mode 3 findings parsing' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
        if ($null -eq (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
            function Test-JlReconMode3RawFindingsAvailable {
                param([object]$ParsedResponse)
                if ($null -eq $ParsedResponse) { return $false }
                if ($ParsedResponse -is [System.Collections.IDictionary]) {
                    if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) { return $true }
                    if ($ParsedResponse.Contains('report')) { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report'] }
                    return $false
                }
                if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) { return $true }
                if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report') }
                return $false
            }
        }
    }

    It 'parses findings from a valid doublecheck response' {
        $result = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response @{ claims = @(@{ text = 'Claim text from report'; status = 'DISPUTED'; confidence = 40; sources = @(@{ title = 'Primary source'; url = 'https://example.test/source' }); recommendation = 'Revise the report wording' }) }

        $result.Success | Should -BeTrue
        $result.Findings.Count | Should -Be 1
        $result.Findings[0].Status | Should -Be 'DISPUTED'
        $result.Findings[0].Confidence | Should -Be 40
        $result.Findings[0].Sources[0].Url | Should -Be 'https://example.test/source'
    }

    It 'treats a missing claims field as malformed' {
        $result = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response @{ report = @{ summary = 'Missing claims' } }

        $result.Success | Should -BeFalse
        $result.FailureCategory | Should -Be 'parse'
        $result.Error | Should -Be 'response for doublecheck is missing claims'
    }

    It 'filters invalid statuses and keeps valid claims' {
        $result = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response @{ claims = @(@{ text = 'Invalid status claim'; status = 'UNKNOWN' }, @{ text = 'Plausible claim'; status = 'PLAUSIBLE'; confidence = 72 }) }

        $result.Success | Should -BeTrue
        $result.Findings.Count | Should -Be 1
        $result.Findings[0].Status | Should -Be 'PLAUSIBLE'
        $result.MalformedFindings.Count | Should -Be 1
    }

    It 'clamps confidence into the 0-100 range and defaults missing values to 50' {
        $result = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response @{ claims = @(@{ text = 'Too high'; status = 'VERIFIED'; confidence = 400 }, @{ text = 'Missing confidence'; status = 'UNVERIFIED' }) }

        $result.Findings.Count | Should -Be 2
        $result.Findings[0].Confidence | Should -Be 100
        $result.Findings[1].Confidence | Should -Be 50
    }
}

Describe 'Mode 3 findings display' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
        if ($null -eq (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
            function Test-JlReconMode3RawFindingsAvailable {
                param([object]$ParsedResponse)
                if ($null -eq $ParsedResponse) { return $false }
                if ($ParsedResponse -is [System.Collections.IDictionary]) {
                    if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) { return $true }
                    if ($ParsedResponse.Contains('report')) { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report'] }
                    return $false
                }
                if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) { return $true }
                if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report') }
                return $false
            }
        }
    }

    It 'renders the expected markdown table columns' {
        $table = Format-JlReconMode3Findings -Findings @([pscustomobject]@{ Claim = 'A verified claim'; Status = 'VERIFIED'; Confidence = 95; Sources = @('https://example.test/verified') })

        $table | Should -Match '^\| Claim \| Status \| Confidence \| Sources \|'
        $table | Should -Match '\| --- \| --- \| --- \| --- \|'
    }

    It 'sorts rows by verification risk with FABRICATION_RISK first' {
        $table = Format-JlReconMode3Findings -Findings @(
            [pscustomobject]@{ Claim = 'Verified'; Status = 'VERIFIED'; Confidence = 99; Sources = @() },
            [pscustomobject]@{ Claim = 'Plausible'; Status = 'PLAUSIBLE'; Confidence = 75; Sources = @() },
            [pscustomobject]@{ Claim = 'Fabricated'; Status = 'FABRICATION_RISK'; Confidence = 5; Sources = @() },
            [pscustomobject]@{ Claim = 'Disputed'; Status = 'DISPUTED'; Confidence = 20; Sources = @() }
        )

        $lines = $table -split "`r?`n"
        $lines[2] | Should -Match '\| Fabricated \| FABRICATION_RISK \| 5% \|'
        $lines[3] | Should -Match '\| Disputed \| DISPUTED \| 20% \|'
        $lines[4] | Should -Match '\| Plausible \| PLAUSIBLE \| 75% \|'
        $lines[5] | Should -Match '\| Verified \| VERIFIED \| 99% \|'
    }

    It 'includes markdown source links and confidence percentages' {
        $table = Format-JlReconMode3Findings -Findings @([pscustomobject]@{ Claim = 'Claim with sources'; Status = 'PLAUSIBLE'; Confidence = 73; Sources = @([pscustomobject]@{ Label = 'Source A'; Url = 'https://example.test/a' }, [pscustomobject]@{ Label = 'Source B'; Url = 'https://example.test/b' }) })

        $table | Should -Match '\| Claim with sources \| PLAUSIBLE \| 73% \| \[Source A\]\(https://example.test/a\), \[Source B\]\(https://example.test/b\) \|'
    }

    It 'appends failed-check summaries after the table when provided' {
        $table = Format-JlReconMode3Findings -Findings @([pscustomobject]@{ Claim = 'Verified claim'; Status = 'VERIFIED'; Confidence = 95; Sources = @() }) -FailedChecks @([pscustomobject]@{ CheckName = 'doublecheck'; FailureReason = 'doublecheck timed out after 30s'; FailureCategory = 'timeout'; TimeoutSeconds = 30; Error = 'deadline exceeded' })

        $table | Should -Match '> Failed checks: doublecheck timed out after 30s'
    }

    It 'returns an empty findings table when only failures are available' {
        $table = Format-JlReconMode3Findings -Findings @() -FailedChecks @([pscustomobject]@{ CheckName = 'doublecheck'; FailureReason = 'doublecheck timed out after 30s'; FailureCategory = 'timeout'; TimeoutSeconds = 30; Error = 'deadline exceeded' })

        $table | Should -Be ''
    }
}

Describe 'Mode 3 prompt generation' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
        if ($null -eq (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
            function Test-JlReconMode3RawFindingsAvailable {
                param([object]$ParsedResponse)
                if ($null -eq $ParsedResponse) { return $false }
                if ($ParsedResponse -is [System.Collections.IDictionary]) {
                    if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) { return $true }
                    if ($ParsedResponse.Contains('report')) { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report'] }
                    return $false
                }
                if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) { return $true }
                if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report') }
                return $false
            }
        }
    }

    It 'builds the unavailable prompt when checks cannot produce findings' {
        $prompt = Get-JlReconMode3DecisionPrompt -FindingsTable '' -FailureWarnings @('doublecheck unavailable')

        $prompt | Should -Match 'Quality checks unavailable'
        $prompt | Should -Match 'Publish the report without verification'
        $prompt | Should -Match 'Override and publish anyway'
        $prompt | Should -Match 'You can always publish'
    }

    It 'builds the verification prompt with findings table when checks succeed' {
        $prompt = Get-JlReconMode3DecisionPrompt -FindingsTable '| Claim | Status | Confidence | Sources |' -FailureWarnings @('one claim needs manual review')

        $prompt | Should -Match 'Verification complete'
        $prompt | Should -Match '\| Claim \| Status \| Confidence \| Sources \|'
        $prompt | Should -Match 'Approve and publish report'
        $prompt | Should -Match 'one claim needs manual review'
    }
}

Describe 'Mode 3 user decisions' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
        if ($null -eq (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
            function Test-JlReconMode3RawFindingsAvailable {
                param([object]$ParsedResponse)
                if ($null -eq $ParsedResponse) { return $false }
                if ($ParsedResponse -is [System.Collections.IDictionary]) {
                    if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) { return $true }
                    if ($ParsedResponse.Contains('report')) { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report'] }
                    return $false
                }
                if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) { return $true }
                if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report') }
                return $false
            }
        }
        $script:JlReconMode3AuditTrail = [System.Collections.Generic.List[object]]::new()
    }

    It 'accepts numeric approval input when verification succeeded' {
        Mock Read-Host { '1' }

        $decision = Get-JlReconMode3UserDecision -FindingsTable '| Claim | Status | Confidence | Sources |'

        $decision.Choice | Should -Be 'approve'
        $decision.Timestamp | Should -Match '^\d{4}-\d{2}-\d{2}T'
        $decision.UserId | Should -Be $env:USERNAME
    }

    It 'accepts override text when checks are unavailable' {
        Mock Read-Host { 'override' }

        $decision = Get-JlReconMode3UserDecision -FindingsTable '' -FailureWarnings @('timed out after 30s')

        $decision.Choice | Should -Be 'override'
    }

    It 'maps approve text to publish when checks are unavailable' {
        Mock Read-Host { 'approve' }

        $decision = Get-JlReconMode3UserDecision -FindingsTable '' -FailureWarnings @('doublecheck unavailable')

        $decision.Choice | Should -Be 'publish'
    }

    It 'retries until a valid decision is supplied' {
        $responses = [System.Collections.Generic.Queue[string]]::new()
        $responses.Enqueue('wait')
        $responses.Enqueue('3')

        Mock Read-Host { $responses.Dequeue() }

        $decision = Get-JlReconMode3UserDecision -FindingsTable '| Claim | Status | Confidence | Sources |'

        $decision.Choice | Should -Be 'cancel'
        Should -Invoke Read-Host -Times 2 -Exactly
    }
}

Describe 'Mode 3 audit entries' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
        if ($null -eq (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
            function Test-JlReconMode3RawFindingsAvailable {
                param([object]$ParsedResponse)
                if ($null -eq $ParsedResponse) { return $false }
                if ($ParsedResponse -is [System.Collections.IDictionary]) {
                    if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) { return $true }
                    if ($ParsedResponse.Contains('report')) { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report'] }
                    return $false
                }
                if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) { return $true }
                if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report') }
                return $false
            }
        }
        $script:JlReconMode3AuditTrail = [System.Collections.Generic.List[object]]::new()
    }

    It 'records publication decisions with findings summary and override flag' {
        $findings = [pscustomobject]@{
            Findings = @(
                [pscustomobject]@{ Claim = 'Claim A'; Status = 'VERIFIED' },
                [pscustomobject]@{ Claim = 'Claim B'; Status = 'DISPUTED' },
                [pscustomobject]@{ Claim = 'Claim C'; Status = 'PLAUSIBLE' }
            )
            FailedChecks = @(
                [pscustomobject]@{
                    CheckName = 'doublecheck'
                    FailureCategory = 'timeout'
                    Warning = 'Check doublecheck timed out after 30s'
                }
            )
            MalformedFindings = @(
                [pscustomobject]@{
                    Claim = 'Claim D'
                    Index = 3
                    Error = 'claim at index 3 is missing status'
                }
            )
        }
        $decision = [pscustomobject]@{ Choice = 'override'; Timestamp = '2026-09-02T19:00:00.0000000+00:00'; UserId = 'johnl' }

        $entry = Record-JlReconMode3AuditEntry -StatusReportId 'status-42' -Findings $findings -UserDecision $decision -FailureWarnings @(
            'Doublecheck timed out after 30s; partial results (1 claim verified)',
            'Malformed findings from doublecheck; skipping invalid claim'
        )

        $entry.ReportId | Should -Be 'status-42'
        $entry.UserDecision | Should -Be 'override'
        $entry.Override | Should -BeTrue
        $entry.FindingsSummary.VerifiedCount | Should -Be 1
        $entry.FindingsSummary.DisputedCount | Should -Be 1
        $entry.FindingsSummary.FailedCheckCount | Should -Be 1
        $entry.FailureWarnings.Count | Should -Be 2
        $entry.Degradation.Degraded | Should -BeTrue
        $entry.Degradation.Timestamp | Should -Match '^\d{4}-\d{2}-\d{2}T'
        $entry.Degradation.Failures.Count | Should -Be 4
        $script:JlReconMode3AuditTrail.Count | Should -Be 1
    }

    It 'records publish decisions without marking an override' {
        $entry = Record-JlReconMode3AuditEntry -StatusReportId 'status-100' -Findings @([pscustomobject]@{ Claim = 'Claim A'; Status = 'VERIFIED' }) -UserDecision ([pscustomobject]@{ Choice = 'publish'; Timestamp = '2026-09-02T19:05:00.0000000+00:00'; UserId = 'johnl' })

        $entry.UserDecision | Should -Be 'publish'
        $entry.Override | Should -BeFalse
        $entry.FindingsSummary.VerifiedCount | Should -Be 1
        $entry.FindingsSummary.FailedCheckCount | Should -Be 0
        $entry.Degradation.Degraded | Should -BeFalse
    }
}

Describe 'Mode 3 edge cases and helper coverage' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
        if ($null -eq (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
            function Test-JlReconMode3RawFindingsAvailable {
                param([object]$ParsedResponse)
                if ($null -eq $ParsedResponse) { return $false }
                if ($ParsedResponse -is [System.Collections.IDictionary]) {
                    if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) { return $true }
                    if ($ParsedResponse.Contains('report')) { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report'] }
                    return $false
                }
                if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) { return $true }
                if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report') }
                return $false
            }
        }
    }

    It 'defaults enablement and timeout when checks exist but properties are missing' {
        $config = @{ checks = @{ other = 'value' } }

        Get-JlReconMode3ChecksEnabled -Config $config | Should -BeTrue
        Get-JlReconMode3ChecksTimeoutSeconds -Config $config -DefaultTimeoutSeconds 18 | Should -Be 18
    }

    It 'classifies parse and generic failure categories including empty messages' {
        Get-JlReconCheckFailureCategory -Message $null | Should -Be 'error'
        Get-JlReconCheckFailureCategory -Message 'Malformed JSON payload' | Should -Be 'parse'
        Get-JlReconCheckFailureCategory -Message 'unexpected provider issue' | Should -Be 'error'
    }

    It 'formats parse and generic failure reason text' {
        Get-JlReconCheckFailureReasonText -Category 'parse' -CheckName 'doublecheck' | Should -Be 'doublecheck returned malformed findings'
        Get-JlReconCheckFailureReasonText -Category 'error' -CheckName 'doublecheck' | Should -Be 'doublecheck failed'
        Get-JlReconCheckFailureReasonText -Category 'error' -CheckName 'doublecheck' -Detail 'provider crashed' | Should -Be 'doublecheck failed: provider crashed'
    }

    It 'defaults aggregate failure category to error when no attempts are recorded' {
        Get-JlReconAggregateFailureCategory -Attempts @() | Should -Be 'error'
    }

    It 'reads dictionary properties and returns null for missing values' {
        Test-JlReconObjectHasProperty -InputObject $null -Name 'claims' | Should -BeFalse
        Test-JlReconObjectHasProperty -InputObject @{ claims = @() } -Name 'claims' | Should -BeTrue
        Get-JlReconObjectValue -InputObject $null -Name 'claims' | Should -Be $null
        Get-JlReconObjectValue -InputObject @{ claims = 3 } -Name 'claims' | Should -Be 3
        Get-JlReconObjectValue -InputObject @{ } -Name 'missing' | Should -Be $null
    }

    It 'returns null when no partial response is stored on an exception' {
        $exception = [System.Exception]::new('boom')
        Get-JlReconExceptionResponse -Exception $exception | Should -Be $null
        Get-JlReconExceptionResponse -Exception $null | Should -Be $null
    }

    It 'formats timeout, malformed, partial network, and generic warnings across edge branches' {
        New-JlReconMode3FailureWarning -FailureCategory 'timeout' -TimeoutSeconds 30 -VerifiedClaimCount 2 | Should -Be 'Doublecheck timed out after 30s; partial results (2 claims verified)'
        New-JlReconMode3FailureWarning -FailureCategory 'network' -VerifiedClaimCount 1 | Should -Be 'Network error calling doublecheck; proceeding with partial verification'
        New-JlReconMode3FailureWarning -FailureCategory 'parse' -InvalidClaimCount 3 | Should -Be 'Malformed findings from doublecheck; skipping 3 invalid claims'
        New-JlReconMode3FailureWarning -FailureCategory 'error' -VerifiedClaimCount 1 | Should -Be 'Doublecheck failed; proceeding with partial verification'
        New-JlReconMode3FailureWarning -FailureCategory 'error' | Should -Be 'Doublecheck failed; proceeding without verification'
        New-JlReconMode3FailureWarning -FailureCategory 'error' -Detail 'provider crashed' | Should -Be 'Doublecheck failed; proceeding without verification (provider crashed)'
    }

    It 'resolves check requests from string and object inputs with default strategies' {
        $stringRequest = ConvertTo-JlReconCheckRequest -Request 'doublecheck' -DefaultTimeoutSeconds 21
        $objectRequest = ConvertTo-JlReconCheckRequest -Request ([pscustomobject]@{
                Name = 'doublecheck'
                TimeoutSeconds = 'not-a-number'
            }) -DefaultTimeoutSeconds 19

        $stringRequest.Name | Should -Be 'doublecheck'
        $stringRequest.StrategyOrder | Should -Be @('subagent', 'herdr', 'session')
        $stringRequest.TimeoutSeconds | Should -Be 21

        $objectRequest.StrategyOrder | Should -Be @('subagent', 'herdr', 'session')
        $objectRequest.TimeoutSeconds | Should -Be 19
    }

    It 'formats unavailable and generic logged warnings for missing detail' {
        New-JlReconCheckWarning -CheckName 'doublecheck' -FailureCategory 'unavailable' | Should -Be 'Check doublecheck is not available in this harness'
        New-JlReconCheckWarning -CheckName 'doublecheck' -FailureCategory 'error' | Should -Be 'Check doublecheck failed'
        New-JlReconCheckWarning -CheckName 'doublecheck' -FailureCategory 'error' -Detail 'agent crashed' | Should -Be 'Check doublecheck failed: agent crashed'
    }

    It 'supports object-based strategy handlers and fails when no invoke callback exists' {
        $handler = [pscustomobject]@{
            Invoke = {
                param($checkName, $payload, $timeoutSeconds)
                [pscustomobject]@{
                    Name = $checkName
                    Payload = $payload
                    TimeoutSeconds = $timeoutSeconds
                }
            }
            IgnoreElapsedTimeout = $true
        }

        $result = Invoke-JlReconStrategyHandler -Handler $handler -CheckName 'doublecheck' -Payload 'report body' -TimeoutSeconds 12

        $result.Response.Name | Should -Be 'doublecheck'
        $result.Response.Payload | Should -Be 'report body'
        $result.Response.TimeoutSeconds | Should -Be 12

        { Invoke-JlReconStrategyHandler -Handler ([pscustomobject]@{ }) -CheckName 'doublecheck' -Payload 'report' } | Should -Throw
    }

    It 'builds failed-check summaries from fallback-generated reasons' {
        $summary = Get-JlReconFailedChecksSummary -FailedChecks @(
            [pscustomobject]@{
                CheckName = 'doublecheck'
                FailureCategory = 'parse'
                TimeoutSeconds = 30
                Error = 'claims missing'
                FailureReason = $null
            }
        )

        $summary | Should -Be 'doublecheck returned malformed findings'
    }

    It 'escapes markdown cells and preserves long multi-line text' {
        $cell = ConvertTo-JlReconMarkdownCell -Value "Long | claim`nwith <markup> & unicode ✓"

        $cell | Should -Be 'Long \| claim<br>with &lt;markup&gt; &amp; unicode ✓'
        ConvertTo-JlReconMarkdownCell -Value $null | Should -Be '—'
        ConvertTo-JlReconMarkdownCell -Value '   ' | Should -Be '—'
    }

    It 'extracts raw findings from findings and nested report shapes' {
        (Get-JlReconMode3RawFindings -ParsedResponse $null) | Should -Be $null
        (Get-JlReconMode3RawFindings -ParsedResponse @{ findings = @('a') }) | Should -Be @('a')
        (Get-JlReconMode3RawFindings -ParsedResponse ([pscustomobject]@{ claims = @('b') })) | Should -Be @('b')
        (Get-JlReconMode3RawFindings -ParsedResponse ([pscustomobject]@{ findings = @('c') })) | Should -Be @('c')
        (Get-JlReconMode3RawFindings -ParsedResponse ([pscustomobject]@{ report = [pscustomobject]@{ claims = @('d') } })) | Should -Be @('d')
    }

    It 'normalizes confidence decimals, nulls, negatives, and zero values' {
        ConvertFrom-JlReconMode3Confidence -Value $null | Should -Be 50
        ConvertFrom-JlReconMode3Confidence -Value '0.93' | Should -Be 93
        ConvertFrom-JlReconMode3Confidence -Value -12 | Should -Be 0
        ConvertFrom-JlReconMode3Confidence -Value 0 | Should -Be 0
    }

    It 'normalizes sources from alternate url and label properties and skips null entries' {
        $sources = ConvertTo-JlReconMode3Sources -RawSources @(
            $null,
            ' https://example.test/unicode/ß ',
            [pscustomobject]@{ title = 'Docs'; href = 'https://例.example.test/docs' },
            [pscustomobject]@{ name = 'Label only' }
        )

        $sources.Count | Should -Be 3
        $sources[0].Label | Should -Be 'https://example.test/unicode/ß'
        $sources[0].Url | Should -Be 'https://example.test/unicode/ß'
        $sources[1].Label | Should -Be 'Docs'
        $sources[1].Url | Should -Be 'https://例.example.test/docs'
        $sources[2].Label | Should -Be 'Label only'
        $sources[2].Url | Should -Be $null
    }

    It 'treats null, invalid JSON, non-array claims, and all-malformed claims as parse failures' {
        $nullResponse = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response $null
        $invalidJson = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response '{bad json'
        $nonArrayClaims = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response @{ claims = 'nope' }
        $allMalformed = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response @{ claims = @($null, @{ status = 'VERIFIED' }) }

        $nullResponse.Success | Should -BeFalse
        $nullResponse.Error | Should -Be 'response for doublecheck was null'

        $invalidJson.Success | Should -BeFalse
        $invalidJson.FailureCategory | Should -Be 'parse'

        $nonArrayClaims.Success | Should -BeFalse
        $nonArrayClaims.Error | Should -Be 'claim at index 0 is missing text'

        $allMalformed.Success | Should -BeFalse
        $allMalformed.MalformedFindings.Count | Should -Be 2
        $allMalformed.Error | Should -Be 'claim at index 0 was null'
    }

    It 'parses json responses with alternate claim, confidence, and source field names' {
        $jsonResponse = @'
{
  "report": {
    "findings": [
      {
        "description": "Unicode claim ✓",
        "status": "verified",
        "score": 1.0,
        "sourceLinks": [
          { "label": "RFC", "link": "https://example.test/rfc" },
          { "text": "Mirror", "url": "https://example.test/mirror" }
        ],
        "recommendation": "Ship it"
      },
      {
        "message": "Percent claim",
        "status": "plausible",
        "percent": 0,
        "citations": [
          { "name": "Archive", "url": "https://example.test/archive" }
        ]
      }
    ]
  }
}
'@

        $result = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response $jsonResponse

        $result.Success | Should -BeTrue
        $result.Findings.Count | Should -Be 2
        $result.Findings[0].Claim | Should -Be 'Unicode claim ✓'
        $result.Findings[0].Confidence | Should -Be 100
        $result.Findings[0].Recommendation | Should -Be 'Ship it'
        $result.Findings[0].Sources.Count | Should -Be 2
        $result.Findings[1].Confidence | Should -Be 0
        $result.Findings[1].Sources[0].Label | Should -Be 'Archive'
    }

    It 'reports disabled, unavailable, partial, and completed findings status values' {
        Get-JlReconMode3FindingsStatus -CheckRun $null | Should -Be 'disabled'
        Get-JlReconMode3FindingsStatus -CheckRun ([pscustomobject]@{ AllFailed = $true; PartialFailure = $false }) | Should -Be 'unavailable'
        Get-JlReconMode3FindingsStatus -CheckRun ([pscustomobject]@{ AllFailed = $false; PartialFailure = $true }) | Should -Be 'partial'
        Get-JlReconMode3FindingsStatus -CheckRun ([pscustomobject]@{ AllFailed = $false; PartialFailure = $false }) | Should -Be 'completed'
    }
}

Describe 'Mode 3 expanded scenario coverage' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
        if ($null -eq (Get-Command Test-JlReconMode3RawFindingsAvailable -ErrorAction SilentlyContinue)) {
            function Test-JlReconMode3RawFindingsAvailable {
                param([object]$ParsedResponse)
                if ($null -eq $ParsedResponse) { return $false }
                if ($ParsedResponse -is [System.Collections.IDictionary]) {
                    if ($ParsedResponse.Contains('claims') -or $ParsedResponse.Contains('findings')) { return $true }
                    if ($ParsedResponse.Contains('report')) { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse $ParsedResponse['report'] }
                    return $false
                }
                if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings')) { return $true }
                if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') { return Test-JlReconMode3RawFindingsAvailable -ParsedResponse (Get-JlReconObjectValue -InputObject $ParsedResponse -Name 'report') }
                return $false
            }
        }
        $script:statusReportText = @"
Status report:
- Mode 3 checks are running.
- Unicode evidence is available.
"@
    }

    It 'handles empty findings when doublecheck returns no claims' {
        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -SubagentSpawningHandlers @{
            subagent = {
                param($checkName, $payload, $timeoutSeconds)
                @{ claims = @() }
            }
        }

        $result.ChecksStatus | Should -Be 'completed'
        $result.Findings.Count | Should -Be 0
        $result.WarningMessages.Count | Should -Be 0
        $result.Degraded | Should -BeFalse
    }

    It 'renders mixed verification statuses with stable risk ordering and multiple sources' {
        $findings = @(
            [pscustomobject]@{ Claim = 'Verified claim'; Status = 'VERIFIED'; Confidence = 100; Sources = @([pscustomobject]@{ Label = 'One'; Url = 'https://example.test/1' }, [pscustomobject]@{ Label = 'Two'; Url = 'https://example.test/2' }) },
            [pscustomobject]@{ Claim = 'Plausible claim'; Status = 'PLAUSIBLE'; Confidence = 80; Sources = @() },
            [pscustomobject]@{ Claim = 'Unverified claim'; Status = 'UNVERIFIED'; Confidence = 50; Sources = @() },
            [pscustomobject]@{ Claim = 'Disputed claim'; Status = 'DISPUTED'; Confidence = 0; Sources = @() },
            [pscustomobject]@{ Claim = 'Fabrication risk claim'; Status = 'FABRICATION_RISK'; Confidence = 5; Sources = @() }
        )

        $table = Format-JlReconMode3Findings -Findings $findings
        $lines = $table -split "`r?`n"

        $lines[2] | Should -Match 'Fabrication risk claim'
        $lines[3] | Should -Match 'Disputed claim'
        $lines[4] | Should -Match 'Unverified claim'
        $lines[5] | Should -Match 'Plausible claim'
        $lines[6] | Should -Match 'Verified claim'
        $table | Should -Match '\[One\]\(https://example.test/1\), \[Two\]\(https://example.test/2\)'
    }

    It 'preserves very long unicode claim text and unicode source links in the findings table' {
        $veryLongClaim = ('Evidence ✓ with pipes | and wrapping text ' * 8).Trim()
        $table = Format-JlReconMode3Findings -Findings @(
            [pscustomobject]@{
                Claim = $veryLongClaim
                Status = 'VERIFIED'
                Confidence = 'not-a-number'
                Sources = @(
                    [pscustomobject]@{ Label = '主要来源'; Url = 'https://例.example.test/状态' }
                )
            }
        )

        $table | Should -Match 'Evidence ✓ with pipes \\| and wrapping text'
        $table | Should -Match '50%'
        $table | Should -Match '\[主要来源\]\(https://例.example.test/状态\)'
    }

    It 'treats timeout at the 30 second boundary as partial success when partial claims are returned' {
        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -TimeoutSeconds 30 -SubagentSpawningHandlers @{
            subagent = {
                param($checkName, $payload, $timeoutSeconds)
                $timeoutSeconds | Should -Be 30

                $timeoutException = [System.TimeoutException]::new('deadline exceeded at 30s')
                $timeoutException.Data['PartialResult'] = @{
                    claims = @(
                        @{ text = 'Boundary verified claim'; status = 'VERIFIED'; confidence = 100; sources = @('https://example.test/boundary') }
                    )
                }

                throw $timeoutException
            }
        }

        $result.PartialFailure | Should -BeTrue
        $result.Findings.Count | Should -Be 1
        $result.WarningMessages | Should -Contain 'Doublecheck timed out after 30s; partial results (1 claim verified)'
    }

    It 'combines malformed claims with timeout degradation into a complete audit trail' {
        $checkRun = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -TimeoutSeconds 30 -SubagentSpawningHandlers @{
            subagent = {
                param($checkName, $payload, $timeoutSeconds)
                $timeoutException = [System.TimeoutException]::new('provider timeout')
                $timeoutException.Data['Response'] = @{
                    claims = @(
                        @{ text = 'Verified before timeout'; status = 'VERIFIED'; confidence = 95; sources = @('https://example.test/verified') },
                        @{ text = 'Broken before timeout'; status = '' }
                    )
                }

                throw $timeoutException
            }
        }

        $entry = Record-JlReconMode3AuditEntry -StatusReportId 'status-timeout' -Findings $checkRun -UserDecision ([pscustomobject]@{
                Choice = 'override'
                Timestamp = '2026-09-02T20:00:00.0000000+00:00'
                UserId = 'johnl'
            }) -FailureWarnings $checkRun.WarningMessages

        $checkRun.WarningMessages | Should -Contain 'Doublecheck timed out after 30s; partial results (1 claim verified)'
        $checkRun.WarningMessages | Should -Contain 'Malformed findings from doublecheck; skipping invalid claim'
        $entry.Degradation.Degraded | Should -BeTrue
        $entry.Degradation.Failures.Type | Should -Contain 'check-failure'
        $entry.Degradation.Failures.Type | Should -Contain 'malformed-finding'
        $entry.Degradation.Failures.Type | Should -Contain 'warning'
        $entry.Degradation.Timestamp | Should -Match '^\d{4}-\d{2}-\d{2}T'
    }

    It 'handles parse failures after a successful invocation when claims are missing' {
        $warnings = $null
        $result = Invoke-JlReconMode3Checks -StatusReportText $script:statusReportText -SubagentSpawningHandlers @{
            subagent = {
                param($checkName, $payload, $timeoutSeconds)
                @{ summary = 'missing claims' }
            }
        } -WarningAction SilentlyContinue -WarningVariable warnings

        $result.AllFailed | Should -BeTrue
        $result.FailedChecks.Count | Should -Be 1
        $result.FailedChecks[0].FailureCategory | Should -Be 'parse'
        $result.WarningMessages | Should -Contain 'Malformed findings from doublecheck; skipping invalid claim'
        @($warnings)[0].ToString() | Should -Match '^Check doublecheck returned malformed findings: response for doublecheck is missing claims'
    }
}

Describe 'Mode 3 remaining branch coverage' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
    }

    It 'tests raw findings availability negative branches' {
        Test-JlReconMode3RawFindingsAvailable -ParsedResponse $null | Should -BeFalse
        Test-JlReconMode3RawFindingsAvailable -ParsedResponse @{ summary = 'no claims' } | Should -BeFalse
        Test-JlReconMode3RawFindingsAvailable -ParsedResponse ([pscustomobject]@{ note = 'no claims' }) | Should -BeFalse
    }

    It 'normalizes sources with url-only objects' {
        $sources = ConvertTo-JlReconMode3Sources -RawSources @(
            [pscustomobject]@{ url = 'https://example.test/url-only' }
        )

        $sources.Count | Should -Be 1
        $sources[0].Label | Should -Be 'https://example.test/url-only'
        $sources[0].Url | Should -Be 'https://example.test/url-only'
    }

    It 'retains a null label when a source exposes a non-null but blank url value object' {
        $sources = ConvertTo-JlReconMode3Sources -RawSources @(
            [pscustomobject]@{ url = [BlankUrlValue]::new() }
        )

        $sources.Count | Should -Be 1
        $sources[0].Label | Should -Be $null
        $sources[0].Url | Should -Be ''
    }

    It 'formats source markdown for null items, plain labels, unlabeled urls, label-only objects, and empty collections' {
        $markdown = ConvertTo-JlReconMode3SourcesMarkdown -Sources @(
            $null,
            'human note',
            [pscustomobject]@{ Url = 'https://example.test/unlabeled' },
            [pscustomobject]@{ Label = 'label only' }
        )

        $markdown | Should -Be 'human note, [source](https://example.test/unlabeled), label only'
        ConvertTo-JlReconMode3SourcesMarkdown -Sources @($null) | Should -Be '—'
    }

    It 'resolves findings collections from string, dictionary, object, claims payload, and enumerable inputs' {
        $fromString = Resolve-JlReconMode3FindingsCollection -Findings 'single claim'
        $fromDictionary = Resolve-JlReconMode3FindingsCollection -Findings @{ Findings = @([pscustomobject]@{ Claim = 'dict claim'; Status = 'VERIFIED' }) }
        $fromClaimsDictionary = Resolve-JlReconMode3FindingsCollection -Findings @{ claims = @(@{ text = 'claim from payload'; status = 'VERIFIED'; confidence = 92 }) }
        $fromObject = Resolve-JlReconMode3FindingsCollection -Findings ([pscustomobject]@{ Findings = @([pscustomobject]@{ Claim = 'object claim'; Status = 'VERIFIED' }) })
        $fromClaimsObject = Resolve-JlReconMode3FindingsCollection -Findings ([pscustomobject]@{ claims = @([pscustomobject]@{ text = 'object payload'; status = 'PLAUSIBLE'; confidence = 61 }) })
        $fromEnumerable = Resolve-JlReconMode3FindingsCollection -Findings @([pscustomobject]@{ Claim = 'enumerable claim'; Status = 'DISPUTED' })
        $fromSingleObject = Resolve-JlReconMode3FindingsCollection -Findings ([pscustomobject]@{ Claim = 'single object'; Status = 'VERIFIED' })

        $fromString[0].Claim | Should -Be 'single claim'
        $fromString[0].Status | Should -Be 'UNVERIFIED'
        $fromDictionary[0].Claim | Should -Be 'dict claim'
        $fromClaimsDictionary[0].Claim | Should -Be 'claim from payload'
        $fromObject[0].Claim | Should -Be 'object claim'
        $fromClaimsObject[0].Status | Should -Be 'PLAUSIBLE'
        $fromEnumerable[0].Claim | Should -Be 'enumerable claim'
        $fromSingleObject[0].Claim | Should -Be 'single object'
    }

    It 'formats fallback no-findings and unknown-status rows' {
        Format-JlReconMode3Findings -Findings @() | Should -Be 'No findings.'

        $table = Format-JlReconMode3Findings -Findings @(
            [pscustomobject]@{ Claim = 'Unknown status'; Status = 'UNKNOWN'; Confidence = $null; Sources = @([pscustomobject]@{ Url = 'https://example.test/unlabeled' }) },
            [pscustomobject]@{ Claim = $null; Status = $null; Confidence = $null; Sources = @() }
        )

        $table | Should -Match '\| Unknown status \| UNKNOWN \| 50% \| \[source\]\(https://example.test/unlabeled\) \|'
        $table | Should -Match '\| — \| — \| 50% \| — \|'
    }

    It 'returns null when no process-scoped user variables are available' {
        $variableNames = @('GITHUB_USER', 'GITHUB_ACTOR', 'GH_USER', 'USERNAME', 'USER')
        $saved = @{}
        foreach ($name in $variableNames) {
            $saved[$name] = [System.Environment]::GetEnvironmentVariable($name, 'Process')
            [System.Environment]::SetEnvironmentVariable($name, $null, 'Process')
        }

        try {
            Get-JlReconMode3CurrentUserId | Should -Be $null
        }
        finally {
            foreach ($name in $variableNames) {
                [System.Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process')
            }
        }
    }

    It 'uses the default unavailable prompt reason when no warnings are supplied' {
        $prompt = Get-JlReconMode3DecisionPrompt -FindingsTable '' -FailureWarnings @()
        $prompt | Should -Match 'doublecheck unavailable or all verification checks failed'
    }

    It 'maps empty and unavailable cancel inputs to the expected decisions' {
        ConvertTo-JlReconMode3UserChoice -InputText '' -ChecksAvailable $true | Should -Be $null
        ConvertTo-JlReconMode3UserChoice -InputText '2' -ChecksAvailable $false | Should -Be 'cancel'
        ConvertTo-JlReconMode3UserChoice -InputText 'wait' -ChecksAvailable $false | Should -Be $null
    }

    It 'throws after max attempts when no valid user decision is supplied' {
        Mock Read-Host { 'invalid' }
        { Get-JlReconMode3UserDecision -FindingsTable '| Claim | Status | Confidence | Sources |' -MaxAttempts 2 } | Should -Throw 'A valid Mode 3 decision was not provided after 2 attempts.'
    }

    It 'summarizes findings from dictionary status and failure-warning inputs' {
        $summary = Get-JlReconMode3FindingsSummary -Findings @{
            Findings = @(
                @{ Status = 'VERIFIED' },
                $null,
                @{ Status = 'PLAUSIBLE' }
            )
            FailureWarnings = @('warning one')
        }

        $summary.TotalClaims | Should -Be 2
        $summary.VerifiedCount | Should -Be 1
        $summary.PlausibleCount | Should -Be 1
        $summary.FailedCheckCount | Should -Be 1

        $summaryFromFailedChecks = Get-JlReconMode3FindingsSummary -Findings @{
            Findings = @(@{ Status = $null })
            FailedChecks = @([pscustomobject]@{ CheckName = 'doublecheck' })
        }

        $summaryFromFailedChecks.FailedCheckCount | Should -Be 1

        $summaryFromObjectWarnings = Get-JlReconMode3FindingsSummary -Findings ([pscustomobject]@{
                Findings = @()
                FailureWarnings = @('warning two')
            })

        $summaryFromObjectWarnings.FailedCheckCount | Should -Be 1
    }

    It 'records audit entries without optional decision metadata and reuses failure reasons' {
        $entry = Record-JlReconMode3AuditEntry -StatusReportId 'status-minimal' -Findings ([pscustomobject]@{
                Findings = @()
                FailedChecks = @(
                    [pscustomobject]@{
                        CheckName = 'doublecheck'
                        FailureCategory = 'error'
                        FailureReason = 'doublecheck failed'
                        Warning = $null
                    }
                )
                MalformedFindings = @()
            }) -UserDecision ([pscustomobject]@{ Choice = 'approve' })

        $entry.DecisionTimestamp | Should -Be $null
        $entry.UserId | Should -Be $null
        $entry.Degradation.Failures[0].Message | Should -Be 'doublecheck failed'

        $choiceMissingEntry = Record-JlReconMode3AuditEntry -StatusReportId 'status-missing-choice' -Findings ([pscustomobject]@{
                Findings = @()
                FailedChecks = @()
                MalformedFindings = @()
            }) -UserDecision @{}

        $choiceMissingEntry.UserDecision | Should -Be $null
    }

    It 'converts provided decisions into normalized decision results' {
        $withChoice = New-JlReconMode3DecisionResult -Decision ([pscustomobject]@{ Choice = ' Override ' }) -ChecksAvailable $true
        $fromText = New-JlReconMode3DecisionResult -Decision 'cancel' -ChecksAvailable $false

        $withChoice.Choice | Should -Be 'override'
        $withChoice.Timestamp | Should -Match '^\d{4}-\d{2}-\d{2}T'
        $withChoice.UserId | Should -Be $env:USERNAME
        $fromText.Choice | Should -Be 'cancel'
        (New-JlReconMode3DecisionResult -Decision ([pscustomobject]@{ Choice = '' }) -ChecksAvailable $true) | Should -Be $null
        (New-JlReconMode3DecisionResult -Decision 'nonsense' -ChecksAvailable $true) | Should -Be $null
        (New-JlReconMode3DecisionResult -Decision $null -ChecksAvailable $true) | Should -Be $null
    }

    It 'handles direct timeout exceptions raised before fallback completes' {
        Mock Invoke-JlReconCheckWithFallback { throw [System.TimeoutException]::new('provider timeout') }
        (Invoke-JlReconMode3Checks -StatusReportText 'status report').FailedChecks[0].FailureCategory | Should -Be 'timeout'
    }

    It 'handles direct network exceptions raised before fallback completes' {
        Mock Invoke-JlReconCheckWithFallback { throw [System.Net.WebException]::new('dns fail') }
        (Invoke-JlReconMode3Checks -StatusReportText 'status report').FailedChecks[0].FailureCategory | Should -Be 'network'
    }

    It 'handles direct http exceptions raised before fallback completes' {
        Mock Invoke-JlReconCheckWithFallback { throw [System.Net.Http.HttpRequestException]::new('gateway fail') }
        (Invoke-JlReconMode3Checks -StatusReportText 'status report').FailedChecks[0].FailureCategory | Should -Be 'network'
    }

    It 'handles direct generic exceptions raised before fallback completes' {
        Mock Invoke-JlReconCheckWithFallback { throw [System.Exception]::new('unexpected boom') }
        (Invoke-JlReconMode3Checks -StatusReportText 'status report').FailedChecks[0].FailureCategory | Should -Be 'error'
    }

    It 'uses the no-findings parse error message when parsing returns null' {
        Mock Invoke-JlReconCheckWithFallback {
            [pscustomobject]@{
                CheckName = 'doublecheck'
                Status = 'success'
                Strategy = 'subagent'
                Response = @{ claims = @(@{ text = 'claim'; status = 'VERIFIED' }) }
                Attempts = @([pscustomobject]@{ Strategy = 'subagent'; Status = 'success' })
                Error = $null
                FailureCategory = $null
                FailureReason = $null
                TimeoutSeconds = 30
            }
        }
        Mock ConvertFrom-JlReconMode3CheckResponseResult { $null }

        $warnings = $null
        $result = Invoke-JlReconMode3Checks -StatusReportText 'status report' -WarningAction SilentlyContinue -WarningVariable warnings

        $result.FailedChecks[0].FailureCategory | Should -Be 'parse'
        @($warnings)[0].ToString() | Should -Match 'doublecheck returned no findings to parse'
    }

    It 'uses failure reason when a failed fallback result includes no attempt errors' {
        Mock Invoke-JlReconCheckWithFallback {
            [pscustomobject]@{
                CheckName = 'doublecheck'
                Status = 'failed'
                Strategy = $null
                Response = $null
                Attempts = @()
                Error = 'fallback error'
                FailureCategory = 'error'
                FailureReason = 'custom failure reason'
                TimeoutSeconds = 30
            }
        }

        $result = Invoke-JlReconMode3Checks -StatusReportText 'status report'
        $result.WarningMessages | Should -Contain 'Doublecheck failed; proceeding without verification (custom failure reason)'
    }

    It 'uses the raw error when a failed fallback result includes no failure reason' {
        Mock Invoke-JlReconCheckWithFallback {
            [pscustomobject]@{
                CheckName = 'doublecheck'
                Status = 'failed'
                Strategy = $null
                Response = $null
                Attempts = @()
                Error = 'fallback error'
                FailureCategory = 'error'
                FailureReason = $null
                TimeoutSeconds = 30
            }
        }

        (Invoke-JlReconMode3Checks -StatusReportText 'status report').WarningMessages | Should -Contain 'Doublecheck failed; proceeding without verification (fallback error)'
    }
}

Describe 'Mode 3 model selection' {
    BeforeEach {
        $path = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'mode3-quality-checks.ps1'
        . $path
    }

    It 'applies jl_recon.model_selection.status_report_checks to verification checks' {
        $script:capturedModel = $null

        $result = Invoke-JlReconMode3Checks `
            -StatusReportText 'status report' `
            -Config @{ model_selection = @{ status_report_checks = 'claude-sonnet-5' } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds, $model)
                    $script:capturedModel = $model
                    return @{ claims = @() }
                }
            }

        $script:capturedModel | Should -Be 'claude-sonnet-5'
        $result.SuccessfulChecks[0].ModelResolved | Should -Be 'claude-sonnet-5'
        $result.SuccessfulChecks[0].ModelResolutionSource | Should -Be 'status-report-checks'
    }

    It 'falls back to model_selection.default when status_report_checks is invalid' {
        $script:capturedModel = $null

        $result = Invoke-JlReconMode3Checks `
            -StatusReportText 'status report' `
            -Config @{ model_selection = @{ status_report_checks = 'fast-model'; default = 'gpt-5.4-mini' } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds, $model)
                    $script:capturedModel = $model
                    return @{ claims = @() }
                }
            } `
            -WarningAction SilentlyContinue

        $script:capturedModel | Should -Be 'gpt-5.4-mini'
        $result.WarningMessages | Should -Contain "Invalid model 'fast-model' from jl_recon.model_selection.status_report_checks; falling back to next precedence level."
        $result.SuccessfulChecks[0].ModelResolutionSource | Should -Be 'default'
    }

    It 'treats inherit as delegating model resolution to jl_subagent_models hierarchy' {
        $script:capturedModel = 'unset'

        $result = Invoke-JlReconMode3Checks `
            -StatusReportText 'status report' `
            -Config @{ model_selection = @{ status_report_checks = 'inherit' } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds, $model)
                    $script:capturedModel = $model
                    return @{ claims = @() }
                }
            }

        $script:capturedModel | Should -Be $null
        $result.SuccessfulChecks[0].ModelResolved | Should -Be $null
        $result.SuccessfulChecks[0].ModelResolutionSource | Should -Be 'status-report-checks-inherit'
    }

    It 'supports legacy mode3_checks as an alias for status_report_checks' {
        $script:capturedModel = $null

        $result = Invoke-JlReconMode3Checks `
            -StatusReportText 'status report' `
            -Config @{ model_selection = @{ mode3_checks = 'claude-sonnet-5' } } `
            -SubagentSpawningHandlers @{
                subagent = {
                    param($checkName, $payload, $timeoutSeconds, $model)
                    $script:capturedModel = $model
                    return @{ claims = @() }
                }
            }

        $script:capturedModel | Should -Be 'claude-sonnet-5'
        $result.SuccessfulChecks[0].ModelResolved | Should -Be 'claude-sonnet-5'
        $result.SuccessfulChecks[0].ModelResolutionSource | Should -Be 'status-report-checks'
    }
}
