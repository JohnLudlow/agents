Set-StrictMode -Version Latest

function Get-JlReconChecksConfig {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$Config
    )

    if ($null -eq $Config) {
        return $null
    }

    if ($Config -is [System.Collections.IDictionary] -and $Config.Contains('checks')) {
        return $Config['checks']
    }

    if ($Config.PSObject.Properties.Name -contains 'checks') {
        return $Config.checks
    }

    return $null
}

function Get-JlReconMode3ChecksEnabled {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$Config
    )

    $checks = Get-JlReconChecksConfig -Config $Config

    if ($null -eq $checks) {
        return $true
    }

    if ($checks -is [System.Collections.IDictionary] -and $checks.Contains('on_status_report_enabled')) {
        return [bool]$checks['on_status_report_enabled']
    }

    if ($checks.PSObject.Properties.Name -contains 'on_status_report_enabled') {
        return [bool]$checks.on_status_report_enabled
    }

    return $true
}

function Get-JlReconMode3ChecksTimeoutSeconds {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$Config,

        [Parameter()]
        [int]$DefaultTimeoutSeconds = 30
    )

    $checks = Get-JlReconChecksConfig -Config $Config

    if ($null -eq $checks) {
        return $DefaultTimeoutSeconds
    }

    $timeoutValue = $null

    if ($checks -is [System.Collections.IDictionary] -and $checks.Contains('timeout_seconds')) {
        $timeoutValue = $checks['timeout_seconds']
    }
    elseif ($checks.PSObject.Properties.Name -contains 'timeout_seconds') {
        $timeoutValue = $checks.timeout_seconds
    }

    if ($null -eq $timeoutValue) {
        return $DefaultTimeoutSeconds
    }

    $parsedValue = 0
    if ([int]::TryParse($timeoutValue.ToString(), [ref]$parsedValue) -and $parsedValue -gt 0) {
        return $parsedValue
    }

    return $DefaultTimeoutSeconds
}

function Test-JlReconRecognizedModelName {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [string]$ModelName
    )

    if ([string]::IsNullOrWhiteSpace($ModelName)) {
        return $false
    }

    $normalizedModelName = $ModelName.Trim()
    if ($normalizedModelName -ieq 'inherit') {
        return $true
    }

    return (
        $normalizedModelName -match '^claude-[a-z0-9.-]+$' -or
        $normalizedModelName -match '^gpt-[a-z0-9.-]+$' -or
        $normalizedModelName -match '^gemini-[a-z0-9.-]+$' -or
        $normalizedModelName -match '^grok-[a-z0-9.-]+$' -or
        $normalizedModelName -match '^kimi-[a-z0-9.-]+$' -or
        $normalizedModelName -match '^mai-[a-z0-9.-]+$'
    )
}

function Get-JlReconModelSelectionConfig {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$Config
    )

    if ($null -eq $Config) {
        return $null
    }

    if ($Config -is [System.Collections.IDictionary] -and $Config.Contains('model_selection')) {
        return $Config['model_selection']
    }

    if ($Config.PSObject.Properties.Name -contains 'model_selection') {
        return $Config.model_selection
    }

    return $null
}

function Resolve-JlReconMode3CheckModel {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$Config,

        [Parameter()]
        [AllowNull()]
        [object]$Request
    )

    $warnings = [System.Collections.Generic.List[string]]::new()
    $explicitModel = Get-JlReconObjectValue -InputObject $Request -Name 'Model'
    if ($null -eq $explicitModel) {
        $explicitModel = Get-JlReconObjectValue -InputObject $Request -Name 'model'
    }

    $modelSelection = Get-JlReconModelSelectionConfig -Config $Config
    $mode3ConfiguredModel = Get-JlReconObjectValue -InputObject $modelSelection -Name 'mode3_checks'
    $defaultConfiguredModel = Get-JlReconObjectValue -InputObject $modelSelection -Name 'default'

    $candidates = @(
        [pscustomobject]@{ Source = 'explicit'; ConfigPath = 'request.model'; Value = $explicitModel },
        [pscustomobject]@{ Source = 'mode3-checks'; ConfigPath = 'jl_recon.model_selection.mode3_checks'; Value = $mode3ConfiguredModel },
        [pscustomobject]@{ Source = 'default'; ConfigPath = 'jl_recon.model_selection.default'; Value = $defaultConfiguredModel }
    )

    foreach ($candidate in $candidates) {
        if ($null -eq $candidate.Value) {
            continue
        }

        $candidateValue = $candidate.Value.ToString().Trim()
        if ([string]::IsNullOrWhiteSpace($candidateValue)) {
            continue
        }

        if ($candidateValue -ieq 'inherit') {
            return [pscustomobject]@{
                RequestedModel = $candidateValue
                ResolvedModel = $null
                ModelResolutionSource = "$($candidate.Source)-inherit"
                WarningMessages = @($warnings)
            }
        }

        if (Test-JlReconRecognizedModelName -ModelName $candidateValue) {
            return [pscustomobject]@{
                RequestedModel = $candidateValue
                ResolvedModel = $candidateValue
                ModelResolutionSource = $candidate.Source
                WarningMessages = @($warnings)
            }
        }

        $warnings.Add("Invalid model '$candidateValue' from $($candidate.ConfigPath); falling back to next precedence level.")
    }

    return [pscustomobject]@{
        RequestedModel = $null
        ResolvedModel = $null
        ModelResolutionSource = 'delegation-default'
        WarningMessages = @($warnings)
    }
}

function Get-JlReconCheckFailureCategory {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [string]$Message
    )

    if ([string]::IsNullOrWhiteSpace($Message)) {
        return 'error'
    }

    $normalized = $Message.Trim().ToLowerInvariant()

    if ($normalized -match 'timed?\s*out' -or $normalized -match '\btimeout\b' -or $normalized -match 'deadline') {
        return 'timeout'
    }

    if ($normalized -match 'network' -or $normalized -match 'socket' -or $normalized -match 'dns' -or $normalized -match 'http' -or $normalized -match 'transient' -or $normalized -match 'connection') {
        return 'network'
    }

    if ($normalized -match 'parse' -or $normalized -match 'malformed' -or $normalized -match 'json' -or $normalized -match 'format') {
        return 'parse'
    }

    if ($normalized -match 'unavailable' -or $normalized -match 'not installed' -or $normalized -match 'not supported' -or $normalized -match 'no handler') {
        return 'unavailable'
    }

    return 'error'
}

function Get-JlReconCheckFailureReasonText {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Category,

        [Parameter(Mandatory)]
        [string]$CheckName,

        [Parameter()]
        [int]$TimeoutSeconds = 30,

        [Parameter()]
        [AllowNull()]
        [string]$Detail
    )

    switch ($Category) {
        'timeout' { return "$CheckName timed out after ${TimeoutSeconds}s" }
        'network' { return "$CheckName failed due to network error" }
        'parse' { return "$CheckName returned malformed findings" }
        'unavailable' { return "$CheckName is not available in this harness" }
        default {
            if ([string]::IsNullOrWhiteSpace($Detail)) {
                return "$CheckName failed"
            }

            return "$CheckName failed: $Detail"
        }
    }
}

function Get-JlReconAggregateFailureCategory {
    [CmdletBinding()]
    param(
        [Parameter()]
        [object[]]$Attempts
    )

    $categories = @(
        @($Attempts) |
        ForEach-Object { $_.Category } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )

    foreach ($preferred in @('timeout', 'network', 'parse', 'error', 'unavailable')) {
        if ($categories -contains $preferred) {
            return $preferred
        }
    }

    return 'error'
}

function Test-JlReconObjectHasProperty {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$InputObject,

        [Parameter(Mandatory)]
        [string]$Name
    )

    if ($null -eq $InputObject) {
        return $false
    }

    if ($InputObject -is [System.Collections.IDictionary]) {
        return $InputObject.Contains($Name)
    }

    return @($InputObject.PSObject.Properties.Match($Name)).Count -gt 0
}

function Get-JlReconObjectValue {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$InputObject,

        [Parameter(Mandatory)]
        [string]$Name
    )

    if ($null -eq $InputObject) {
        return $null
    }

    if ($InputObject -is [System.Collections.IDictionary] -and $InputObject.Contains($Name)) {
        return $InputObject[$Name]
    }

    $propertyMatch = @($InputObject.PSObject.Properties.Match($Name)) | Select-Object -First 1
    if ($null -ne $propertyMatch) {
        return $propertyMatch.Value
    }

    return $null
}

function Get-JlReconExceptionResponse {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [System.Exception]$Exception
    )

    if ($null -eq $Exception -or $null -eq $Exception.Data) {
        return $null
    }

    foreach ($key in @('Response', 'PartialResponse', 'Result', 'PartialResult')) {
        if ($Exception.Data.Contains($key) -and $null -ne $Exception.Data[$key]) {
            return $Exception.Data[$key]
        }
    }

    return $null
}

function Get-JlReconMode3VerifiedClaimCount {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object[]]$Findings
    )

    return @(
        @($Findings | Where-Object { $null -ne $_ }) |
        Where-Object {
            $statusValue = Get-JlReconObjectValue -InputObject $_ -Name 'Status'
            $null -ne $statusValue -and $statusValue.ToString().Trim().ToUpperInvariant() -eq 'VERIFIED'
        }
    ).Count
}

function New-JlReconMode3FailureWarning {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FailureCategory,

        [Parameter()]
        [int]$TimeoutSeconds = 30,

        [Parameter()]
        [int]$VerifiedClaimCount = 0,

        [Parameter()]
        [int]$InvalidClaimCount = 0,

        [Parameter()]
        [AllowNull()]
        [string]$Detail
    )

    switch ($FailureCategory) {
        'timeout' {
            if ($VerifiedClaimCount -gt 0) {
                $claimLabel = if ($VerifiedClaimCount -eq 1) { 'claim' } else { 'claims' }
                return "Doublecheck timed out after ${TimeoutSeconds}s; partial results ($VerifiedClaimCount $claimLabel verified)"
            }

            return "Doublecheck timed out after ${TimeoutSeconds}s; proceeding without verification"
        }
        'network' {
            if ($VerifiedClaimCount -gt 0) {
                return 'Network error calling doublecheck; proceeding with partial verification'
            }

            return 'Network error calling doublecheck; proceeding without verification'
        }
        'unavailable' {
            return 'Doublecheck unavailable (handler not found in this harness)'
        }
        'parse' {
            if ($InvalidClaimCount -gt 1) {
                return "Malformed findings from doublecheck; skipping $InvalidClaimCount invalid claims"
            }

            return 'Malformed findings from doublecheck; skipping invalid claim'
        }
        default {
            if ($VerifiedClaimCount -gt 0) {
                return 'Doublecheck failed; proceeding with partial verification'
            }

            if ([string]::IsNullOrWhiteSpace($Detail)) {
                return 'Doublecheck failed; proceeding without verification'
            }

            return "Doublecheck failed; proceeding without verification ($Detail)"
        }
    }
}

function ConvertTo-JlReconCheckRequest {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Request,

        [Parameter()]
        [int]$DefaultTimeoutSeconds = 30
    )

    if ($Request -is [string]) {
        return [pscustomobject]@{
            Name = $Request
            StrategyOrder = @('subagent', 'herdr', 'session')
            TimeoutSeconds = $DefaultTimeoutSeconds
            Model = $null
        }
    }

    $strategyOrder = if ($Request.PSObject.Properties.Name -contains 'StrategyOrder' -and $null -ne $Request.StrategyOrder) {
        @($Request.StrategyOrder)
    }
    else {
        @('subagent', 'herdr', 'session')
    }

    $timeoutSeconds = $DefaultTimeoutSeconds
    if ($Request.PSObject.Properties.Name -contains 'TimeoutSeconds' -and $null -ne $Request.TimeoutSeconds) {
        $parsedTimeout = 0
        if ([int]::TryParse($Request.TimeoutSeconds.ToString(), [ref]$parsedTimeout) -and $parsedTimeout -gt 0) {
            $timeoutSeconds = $parsedTimeout
        }
    }

    return [pscustomobject]@{
        Name = $Request.Name
        StrategyOrder = $strategyOrder
        TimeoutSeconds = $timeoutSeconds
        Model = Get-JlReconObjectValue -InputObject $Request -Name 'Model'
    }
}

function New-JlReconFailedCheckResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$CheckName,

        [Parameter()]
        [AllowNull()]
        [string]$Strategy,

        [Parameter()]
        [AllowNull()]
        [object]$Response,

        [Parameter()]
        [object[]]$Attempts = @(),

        [Parameter(Mandatory)]
        [string]$Error,

        [Parameter(Mandatory)]
        [string]$FailureCategory,

        [Parameter(Mandatory)]
        [string]$Warning,

        [Parameter()]
        [int]$TimeoutSeconds = 30
    )

    return [pscustomobject]@{
        CheckName = $CheckName
        Status = 'failed'
        Strategy = $Strategy
        Response = $Response
        Attempts = @($Attempts)
        Error = $Error
        FailureCategory = $FailureCategory
        FailureReason = $Warning
        TimeoutSeconds = $TimeoutSeconds
        Warning = $Warning
        Failed = $true
    }
}

function New-JlReconCheckWarning {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$CheckName,

        [Parameter(Mandatory)]
        [string]$FailureCategory,

        [Parameter()]
        [int]$TimeoutSeconds = 30,

        [Parameter()]
        [AllowNull()]
        [string]$Detail
    )

    switch ($FailureCategory) {
        'timeout' { return "Check $CheckName timed out after ${TimeoutSeconds}s" }
        'network' { return "Check $CheckName failed due to network error — $Detail" }
        'parse' { return "Check $CheckName returned malformed findings: $Detail" }
        'unavailable' {
            if ([string]::IsNullOrWhiteSpace($Detail)) {
                return "Check $CheckName is not available in this harness"
            }

            return "Check $CheckName is not available in this harness — $Detail"
        }
        default {
            if ([string]::IsNullOrWhiteSpace($Detail)) {
                return "Check $CheckName failed"
            }

            return "Check $CheckName failed: $Detail"
        }
    }
}

function Invoke-JlReconStrategyHandler {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Handler,

        [Parameter(Mandatory)]
        [string]$CheckName,

        [Parameter()]
        [AllowNull()]
        [object]$Payload,

        [Parameter()]
        [int]$TimeoutSeconds = 30,

        [Parameter()]
        [AllowNull()]
        [object]$Model
    )

    $handlerDefinition = if ($Handler -is [scriptblock]) {
        [pscustomobject]@{
            Invoke = $Handler
            IgnoreElapsedTimeout = $false
        }
    }
    elseif ($Handler -is [System.Collections.IDictionary]) {
        [pscustomobject]@{
            Invoke = $Handler['Invoke']
            IgnoreElapsedTimeout = [bool]$Handler['IgnoreElapsedTimeout']
        }
    }
    else {
        [pscustomobject]@{
            Invoke = Get-JlReconObjectValue -InputObject $Handler -Name 'Invoke'
            IgnoreElapsedTimeout = if (Test-JlReconObjectHasProperty -InputObject $Handler -Name 'IgnoreElapsedTimeout') { [bool](Get-JlReconObjectValue -InputObject $Handler -Name 'IgnoreElapsedTimeout') } else { $false }
        }
    }

    if ($null -eq $handlerDefinition.Invoke) {
        throw 'No invoke callback registered.'
    }

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $response = & $handlerDefinition.Invoke $CheckName $Payload $TimeoutSeconds $Model
    $stopwatch.Stop()

    if (-not $handlerDefinition.IgnoreElapsedTimeout -and $stopwatch.Elapsed.TotalSeconds -gt $TimeoutSeconds) {
        throw [System.TimeoutException]::new("Check invocation timed out after ${TimeoutSeconds}s")
    }

    return [pscustomobject]@{
        Response = $response
        ElapsedMilliseconds = [int][Math]::Round($stopwatch.Elapsed.TotalMilliseconds)
    }
}

function Get-JlReconFailedChecksSummary {
    [CmdletBinding()]
    param(
        [Parameter()]
        [object[]]$FailedChecks
    )

    $failedChecks = @($FailedChecks | Where-Object { $null -ne $_ })

    if ($failedChecks.Count -eq 0) {
        return ''
    }

    $reasons = foreach ($failedCheck in $failedChecks) {
        if (-not [string]::IsNullOrWhiteSpace($failedCheck.FailureReason)) {
            $failedCheck.FailureReason
        }
        else {
            Get-JlReconCheckFailureReasonText `
                -Category $failedCheck.FailureCategory `
                -CheckName $failedCheck.CheckName `
                -TimeoutSeconds $failedCheck.TimeoutSeconds `
                -Detail $failedCheck.Error
        }
    }

    return (@($reasons) -join '; ')
}

function Invoke-JlReconCheckWithFallback {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$CheckName,

        [Parameter(Mandatory)]
        [hashtable]$StrategyHandlers,

        [Parameter()]
        [AllowNull()]
        [object]$Payload,

        [Parameter()]
        [string[]]$StrategyOrder = @('subagent', 'herdr', 'session'),

        [Parameter()]
        [int]$TimeoutSeconds = 30,

        [Parameter()]
        [AllowNull()]
        [object]$Model
    )

    $attempts = [System.Collections.Generic.List[object]]::new()

    foreach ($strategy in $StrategyOrder) {
        if (-not $StrategyHandlers.ContainsKey($strategy) -or $null -eq $StrategyHandlers[$strategy]) {
            $attempts.Add([pscustomobject]@{
                    Strategy = $strategy
                    Status = 'unavailable'
                    Category = 'unavailable'
                    Error = 'No handler registered.'
                    FailureReason = Get-JlReconCheckFailureReasonText -Category 'unavailable' -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds
                    ElapsedMilliseconds = 0
                    Response = $null
                })
            continue
        }

        try {
            $invocation = Invoke-JlReconStrategyHandler -Handler $StrategyHandlers[$strategy] -CheckName $CheckName -Payload $Payload -TimeoutSeconds $TimeoutSeconds -Model $Model
            $attempts.Add([pscustomobject]@{
                    Strategy = $strategy
                    Status = 'success'
                    Category = $null
                    Error = $null
                    FailureReason = $null
                    ElapsedMilliseconds = $invocation.ElapsedMilliseconds
                    Response = $invocation.Response
                })

            return [pscustomobject]@{
                CheckName = $CheckName
                Status = 'success'
                Strategy = $strategy
                Response = $invocation.Response
                Attempts = @($attempts)
                Error = $null
                FailureCategory = $null
                FailureReason = $null
                TimeoutSeconds = $TimeoutSeconds
            }
        }
        catch [System.TimeoutException] {
            $partialResponse = Get-JlReconExceptionResponse -Exception $_.Exception
            $attempts.Add([pscustomobject]@{
                    Strategy = $strategy
                    Status = 'failed'
                    Category = 'timeout'
                    Error = $_.Exception.Message
                    FailureReason = Get-JlReconCheckFailureReasonText -Category 'timeout' -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail $_.Exception.Message
                    ElapsedMilliseconds = 0
                    Response = $partialResponse
                })
        }
        catch [System.Net.WebException] {
            $partialResponse = Get-JlReconExceptionResponse -Exception $_.Exception
            $attempts.Add([pscustomobject]@{
                    Strategy = $strategy
                    Status = 'failed'
                    Category = 'network'
                    Error = $_.Exception.Message
                    FailureReason = Get-JlReconCheckFailureReasonText -Category 'network' -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail $_.Exception.Message
                    ElapsedMilliseconds = 0
                    Response = $partialResponse
                })
        }
        catch [System.Net.Http.HttpRequestException] {
            $partialResponse = Get-JlReconExceptionResponse -Exception $_.Exception
            $attempts.Add([pscustomobject]@{
                    Strategy = $strategy
                    Status = 'failed'
                    Category = 'network'
                    Error = $_.Exception.Message
                    FailureReason = Get-JlReconCheckFailureReasonText -Category 'network' -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail $_.Exception.Message
                    ElapsedMilliseconds = 0
                    Response = $partialResponse
                })
        }
        catch {
            $category = Get-JlReconCheckFailureCategory -Message $_.Exception.Message
            $partialResponse = Get-JlReconExceptionResponse -Exception $_.Exception
            $attempts.Add([pscustomobject]@{
                    Strategy = $strategy
                    Status = 'failed'
                    Category = $category
                    Error = $_.Exception.Message
                    FailureReason = Get-JlReconCheckFailureReasonText -Category $category -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail $_.Exception.Message
                    ElapsedMilliseconds = 0
                    Response = $partialResponse
                })
        }
    }

    $failureCategory = Get-JlReconAggregateFailureCategory -Attempts @($attempts)
    $partialResponse = @(
        @($attempts) |
        ForEach-Object { $_.Response } |
        Where-Object { $null -ne $_ }
    ) | Select-Object -First 1

    return [pscustomobject]@{
        CheckName = $CheckName
        Status = 'failed'
        Strategy = $null
        Response = $partialResponse
        Attempts = @($attempts)
        Error = 'All fallback strategies failed.'
        FailureCategory = $failureCategory
        FailureReason = Get-JlReconCheckFailureReasonText -Category $failureCategory -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail 'All fallback strategies failed.'
        TimeoutSeconds = $TimeoutSeconds
    }
}

function ConvertTo-JlReconMarkdownCell {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$Value
    )

    if ($null -eq $Value) {
        return '—'
    }

    $text = $Value.ToString()
    if ([string]::IsNullOrWhiteSpace($text)) {
        return '—'
    }

    return $text.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('|', '\|').Replace("`r`n", '<br>').Replace("`n", '<br>').Replace("`r", '<br>')
}

function Get-JlReconMode3RawFindings {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$ParsedResponse
    )

    if ($null -eq $ParsedResponse) {
        return $null
    }

    if ($ParsedResponse -is [System.Collections.IDictionary]) {
        if ($ParsedResponse.Contains('claims')) {
            return $ParsedResponse['claims']
        }

        if ($ParsedResponse.Contains('findings')) {
            return $ParsedResponse['findings']
        }

        if ($ParsedResponse.Contains('report') -and $null -ne $ParsedResponse['report']) {
            return Get-JlReconMode3RawFindings -ParsedResponse $ParsedResponse['report']
        }
    }
    else {
        if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'claims') {
            return $ParsedResponse.claims
        }

        if (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings') {
            return $ParsedResponse.findings
        }

        if ((Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') -and $null -ne $ParsedResponse.report) {
            return Get-JlReconMode3RawFindings -ParsedResponse $ParsedResponse.report
        }
    }

    return $null
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

function ConvertFrom-JlReconMode3Confidence {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$Value
    )

    if ($null -eq $Value) {
        return 50
    }

    $parsed = 0.0
    if (-not [double]::TryParse($Value.ToString(), [ref]$parsed)) {
        return 50
    }

    $isFractionalValue = $Value -is [double] -or $Value -is [float] -or $Value -is [decimal]
    if (-not $isFractionalValue) {
        $valueText = $Value.ToString()
        $isFractionalValue = $valueText.Contains('.') -or $valueText.Contains(',')
    }

    if ($parsed -le 1 -and $parsed -ge 0 -and $isFractionalValue) {
        $parsed = $parsed * 100
    }

    if ($parsed -lt 0) {
        $parsed = 0
    }
    elseif ($parsed -gt 100) {
        $parsed = 100
    }

    return [int][Math]::Round($parsed, 0)
}

function ConvertTo-JlReconMode3Sources {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$RawSources
    )

    if ($null -eq $RawSources) {
        return @()
    }

    $sourceItems = if ($RawSources -is [string]) {
        @($RawSources)
    }
    elseif ($RawSources -isnot [System.Collections.IEnumerable]) {
        @($RawSources)
    }
    else {
        @($RawSources)
    }

    $normalizedSources = foreach ($sourceItem in $sourceItems) {
        if ($null -eq $sourceItem) {
            continue
        }

        if ($sourceItem -is [string]) {
            $trimmed = $sourceItem.Trim()
            if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
                [pscustomobject]@{
                    Label = $trimmed
                    Url = $trimmed
                }
            }

            continue
        }

        $urlValue = @(
            Get-JlReconObjectValue -InputObject $sourceItem -Name 'url'
            Get-JlReconObjectValue -InputObject $sourceItem -Name 'link'
            Get-JlReconObjectValue -InputObject $sourceItem -Name 'href'
        ) | Where-Object { $null -ne $_ } | Select-Object -First 1

        $labelValue = @(
            Get-JlReconObjectValue -InputObject $sourceItem -Name 'title'
            Get-JlReconObjectValue -InputObject $sourceItem -Name 'label'
            Get-JlReconObjectValue -InputObject $sourceItem -Name 'text'
            Get-JlReconObjectValue -InputObject $sourceItem -Name 'name'
            $urlValue
        ) | Where-Object { $null -ne $_ -and -not [string]::IsNullOrWhiteSpace($_.ToString()) } | Select-Object -First 1

        if ($null -ne $urlValue -or $null -ne $labelValue) {
            [pscustomobject]@{
                Label = if ($null -ne $labelValue) { $labelValue.ToString() } else { $null }
                Url = if ($null -ne $urlValue) { $urlValue.ToString() } else { $null }
            }
        }
    }

    return @($normalizedSources | Where-Object { $null -ne $_ })
}

function ConvertFrom-JlReconMode3CheckResponseResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$CheckName,

        [Parameter()]
        [AllowNull()]
        [object]$Response
    )

    if ($null -eq $Response) {
        return [pscustomobject]@{
            Success = $false
            Findings = @()
            MalformedFindings = @()
            Error = "response for $CheckName was null"
            FailureCategory = 'parse'
        }
    }

    $parsedResponse = $Response

    if ($Response -is [string]) {
        try {
            $parsedResponse = $Response | ConvertFrom-Json -Depth 30
        }
        catch {
            return [pscustomobject]@{
                Success = $false
                Findings = @()
                MalformedFindings = @()
                Error = $_.Exception.Message
                FailureCategory = 'parse'
            }
        }
    }

    $hasRawFindings = Test-JlReconMode3RawFindingsAvailable -ParsedResponse $parsedResponse
    $rawFindings = @(Get-JlReconMode3RawFindings -ParsedResponse $parsedResponse)
    if (-not $hasRawFindings) {
        return [pscustomobject]@{
            Success = $false
            Findings = @()
            MalformedFindings = @()
            Error = "response for $CheckName is missing claims"
            FailureCategory = 'parse'
        }
    }

    $validStatuses = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($status in @('VERIFIED', 'PLAUSIBLE', 'UNVERIFIED', 'DISPUTED', 'FABRICATION_RISK')) {
        [void]$validStatuses.Add($status)
    }

    $findings = [System.Collections.Generic.List[object]]::new()
    $malformedFindings = [System.Collections.Generic.List[object]]::new()

    $index = 0
    foreach ($rawFinding in @($rawFindings)) {
        if ($null -eq $rawFinding) {
            $malformedFindings.Add([pscustomobject]@{
                    Index = $index
                    Error = "claim at index $index was null"
                })
            $index++
            continue
        }

        $claimValue = @(
            Get-JlReconObjectValue -InputObject $rawFinding -Name 'text'
            Get-JlReconObjectValue -InputObject $rawFinding -Name 'claim'
            Get-JlReconObjectValue -InputObject $rawFinding -Name 'description'
            Get-JlReconObjectValue -InputObject $rawFinding -Name 'message'
        ) | Where-Object { $null -ne $_ -and -not [string]::IsNullOrWhiteSpace($_.ToString()) } | Select-Object -First 1

        $statusValue = Get-JlReconObjectValue -InputObject $rawFinding -Name 'status'
        $status = if ($null -ne $statusValue) { $statusValue.ToString().Trim().ToUpperInvariant() } else { $null }

        if ($null -eq $claimValue) {
            $malformedFindings.Add([pscustomobject]@{
                    Index = $index
                    Error = "claim at index $index is missing text"
                })
            $index++
            continue
        }

        if ([string]::IsNullOrWhiteSpace($status)) {
            $malformedFindings.Add([pscustomobject]@{
                    Index = $index
                    Claim = $claimValue.ToString()
                    Error = "claim at index $index is missing status"
                })
            $index++
            continue
        }

        if (-not $validStatuses.Contains($status)) {
            $malformedFindings.Add([pscustomobject]@{
                    Index = $index
                    Claim = $claimValue.ToString()
                    Error = "claim at index $index has invalid status $status"
                })
            $index++
            continue
        }

        $confidenceValue = @(
            Get-JlReconObjectValue -InputObject $rawFinding -Name 'confidence'
            Get-JlReconObjectValue -InputObject $rawFinding -Name 'score'
            Get-JlReconObjectValue -InputObject $rawFinding -Name 'percent'
        ) | Where-Object { $null -ne $_ } | Select-Object -First 1

        $sourcesValue = Get-JlReconObjectValue -InputObject $rawFinding -Name 'sources'
        if ($null -eq $sourcesValue) {
            $sourcesValue = Get-JlReconObjectValue -InputObject $rawFinding -Name 'sourceLinks'
        }

        if ($null -eq $sourcesValue) {
            $sourcesValue = Get-JlReconObjectValue -InputObject $rawFinding -Name 'links'
        }

        if ($null -eq $sourcesValue) {
            $sourcesValue = Get-JlReconObjectValue -InputObject $rawFinding -Name 'citations'
        }

        $recommendationValue = Get-JlReconObjectValue -InputObject $rawFinding -Name 'recommendation'

        $findings.Add([pscustomobject]@{
                Claim = $claimValue.ToString()
                Status = $status
                Confidence = ConvertFrom-JlReconMode3Confidence -Value $confidenceValue
                Sources = @(ConvertTo-JlReconMode3Sources -RawSources $sourcesValue)
                Recommendation = if ($null -ne $recommendationValue) { $recommendationValue.ToString() } else { $null }
                Check = $CheckName
            })

        $index++
    }

    if ($findings.Count -eq 0 -and $malformedFindings.Count -gt 0) {
        return [pscustomobject]@{
            Success = $false
            Findings = @()
            MalformedFindings = @($malformedFindings)
            Error = $malformedFindings[0].Error
            FailureCategory = 'parse'
        }
    }

    return [pscustomobject]@{
        Success = $true
        Findings = @($findings)
        MalformedFindings = @($malformedFindings)
        Error = $null
        FailureCategory = $null
    }
}

function Get-JlReconMode3FindingsStatus {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$CheckRun
    )

    if ($null -eq $CheckRun) {
        return 'disabled'
    }

    if ($CheckRun.AllFailed) {
        return 'unavailable'
    }

    if ($CheckRun.PartialFailure) {
        return 'partial'
    }

    return 'completed'
}

function Invoke-JlReconMode3Checks {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$StatusReportText,

        [Parameter()]
        [int]$TimeoutSeconds = 30,

        [Parameter()]
        [AllowNull()]
        [object]$Config,

        [Parameter()]
        [hashtable]$SubagentSpawningHandlers = @{}
    )

    $results = [System.Collections.Generic.List[object]]::new()
    $successfulChecks = [System.Collections.Generic.List[object]]::new()
    $failedChecks = [System.Collections.Generic.List[object]]::new()
    $findings = [System.Collections.Generic.List[object]]::new()
    $warnings = [System.Collections.Generic.List[string]]::new()
    $malformedFindings = [System.Collections.Generic.List[object]]::new()
    $resolvedTimeoutSeconds = $TimeoutSeconds

    try {
        Write-Information "Starting Mode 3 checks (timeout: ${TimeoutSeconds}s)"

        $checkRequest = [pscustomobject]@{
            Name = 'doublecheck'
            StrategyOrder = @('subagent', 'herdr', 'session')
            TimeoutSeconds = $TimeoutSeconds
        }

        $resolvedRequest = ConvertTo-JlReconCheckRequest -Request $checkRequest -DefaultTimeoutSeconds $TimeoutSeconds
        $modelResolution = Resolve-JlReconMode3CheckModel -Config $Config -Request $resolvedRequest
        foreach ($modelWarning in @($modelResolution.WarningMessages)) {
            if (-not [string]::IsNullOrWhiteSpace($modelWarning)) {
                Write-Warning $modelWarning
                $warnings.Add($modelWarning)
            }
        }

        $resolvedTimeoutSeconds = $resolvedRequest.TimeoutSeconds
        $result = Invoke-JlReconCheckWithFallback -CheckName $resolvedRequest.Name -StrategyHandlers $SubagentSpawningHandlers -Payload $StatusReportText -StrategyOrder $resolvedRequest.StrategyOrder -TimeoutSeconds $resolvedRequest.TimeoutSeconds -Model $modelResolution.ResolvedModel

        $parseResult = $null
        if ($null -ne $result.Response) {
            $parseResult = ConvertFrom-JlReconMode3CheckResponseResult -CheckName $result.CheckName -Response $result.Response
        }

        if ($result.Status -ne 'success') {
            if ($null -ne $parseResult -and $parseResult.Success) {
                foreach ($finding in $parseResult.Findings) {
                    $findings.Add($finding)
                }

                foreach ($malformedFinding in $parseResult.MalformedFindings) {
                    $malformedFindings.Add($malformedFinding)
                }
            }

            $warningDetail = @(
                @($result.Attempts) |
                ForEach-Object { $_.Error } |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
            ) | Select-Object -First 1

            if ([string]::IsNullOrWhiteSpace($warningDetail)) {
                $warningDetail = if (-not [string]::IsNullOrWhiteSpace($result.FailureReason)) { $result.FailureReason } else { $result.Error }
            }

            $loggedWarning = New-JlReconCheckWarning -CheckName $resolvedRequest.Name -FailureCategory $result.FailureCategory -TimeoutSeconds $resolvedRequest.TimeoutSeconds -Detail $warningDetail
            Write-Warning $loggedWarning

            $failedResult = New-JlReconFailedCheckResult -CheckName $resolvedRequest.Name -Strategy $result.Strategy -Response $result.Response -Attempts @($result.Attempts) -Error $result.Error -FailureCategory $result.FailureCategory -Warning $loggedWarning -TimeoutSeconds $resolvedRequest.TimeoutSeconds
            $failedResult | Add-Member -NotePropertyName ModelRequested -NotePropertyValue $modelResolution.RequestedModel -Force
            $failedResult | Add-Member -NotePropertyName ModelResolved -NotePropertyValue $modelResolution.ResolvedModel -Force
            $failedResult | Add-Member -NotePropertyName ModelResolutionSource -NotePropertyValue $modelResolution.ModelResolutionSource -Force
            $failedChecks.Add($failedResult)
            $results.Add($failedResult)

            $userWarning = New-JlReconMode3FailureWarning -FailureCategory $result.FailureCategory -TimeoutSeconds $resolvedRequest.TimeoutSeconds -VerifiedClaimCount (Get-JlReconMode3VerifiedClaimCount -Findings @($findings)) -Detail $warningDetail
            $warnings.Add($userWarning)
        }
        elseif ($null -eq $parseResult -or -not $parseResult.Success) {
            $parseError = if ($null -ne $parseResult) { $parseResult.Error } else { 'doublecheck returned no findings to parse' }
            $loggedWarning = New-JlReconCheckWarning -CheckName $result.CheckName -FailureCategory 'parse' -TimeoutSeconds $resolvedRequest.TimeoutSeconds -Detail $parseError
            Write-Warning $loggedWarning

            $failedResult = New-JlReconFailedCheckResult -CheckName $result.CheckName -Strategy $result.Strategy -Response $result.Response -Attempts @($result.Attempts) -Error $parseError -FailureCategory 'parse' -Warning $loggedWarning -TimeoutSeconds $resolvedRequest.TimeoutSeconds
            $failedResult | Add-Member -NotePropertyName ModelRequested -NotePropertyValue $modelResolution.RequestedModel -Force
            $failedResult | Add-Member -NotePropertyName ModelResolved -NotePropertyValue $modelResolution.ResolvedModel -Force
            $failedResult | Add-Member -NotePropertyName ModelResolutionSource -NotePropertyValue $modelResolution.ModelResolutionSource -Force
            $failedChecks.Add($failedResult)
            $results.Add($failedResult)
            $warnings.Add((New-JlReconMode3FailureWarning -FailureCategory 'parse' -TimeoutSeconds $resolvedRequest.TimeoutSeconds -InvalidClaimCount 1 -Detail $parseError))
        }
        else {
            $result | Add-Member -NotePropertyName ParsedFindings -NotePropertyValue @($parseResult.Findings) -Force
            $result | Add-Member -NotePropertyName MalformedFindings -NotePropertyValue @($parseResult.MalformedFindings) -Force
            $result | Add-Member -NotePropertyName Warning -NotePropertyValue $null -Force
            $result | Add-Member -NotePropertyName Failed -NotePropertyValue $false -Force
            $result | Add-Member -NotePropertyName ModelRequested -NotePropertyValue $modelResolution.RequestedModel -Force
            $result | Add-Member -NotePropertyName ModelResolved -NotePropertyValue $modelResolution.ResolvedModel -Force
            $result | Add-Member -NotePropertyName ModelResolutionSource -NotePropertyValue $modelResolution.ModelResolutionSource -Force

            $successfulChecks.Add($result)
            $results.Add($result)

            foreach ($finding in $parseResult.Findings) {
                $findings.Add($finding)
            }

            foreach ($malformedFinding in $parseResult.MalformedFindings) {
                $malformedFindings.Add($malformedFinding)
            }
        }

        if ($malformedFindings.Count -gt 0) {
            Write-Warning (New-JlReconCheckWarning -CheckName 'doublecheck' -FailureCategory 'parse' -TimeoutSeconds $resolvedTimeoutSeconds -Detail ($malformedFindings[0].Error))
            $warnings.Add((New-JlReconMode3FailureWarning -FailureCategory 'parse' -TimeoutSeconds $resolvedTimeoutSeconds -InvalidClaimCount $malformedFindings.Count -Detail ($malformedFindings[0].Error)))
        }
    }
    catch [System.TimeoutException] {
        $loggedWarning = New-JlReconCheckWarning -CheckName 'doublecheck' -FailureCategory 'timeout' -TimeoutSeconds $resolvedTimeoutSeconds -Detail $_.Exception.Message
        Write-Warning $loggedWarning

        $failedResult = New-JlReconFailedCheckResult -CheckName 'doublecheck' -Error $_.Exception.Message -FailureCategory 'timeout' -Warning $loggedWarning -TimeoutSeconds $resolvedTimeoutSeconds
        $failedChecks.Add($failedResult)
        $results.Add($failedResult)
        $warnings.Add((New-JlReconMode3FailureWarning -FailureCategory 'timeout' -TimeoutSeconds $resolvedTimeoutSeconds -VerifiedClaimCount (Get-JlReconMode3VerifiedClaimCount -Findings @($findings)) -Detail $_.Exception.Message))
    }
    catch [System.Net.WebException] {
        $loggedWarning = New-JlReconCheckWarning -CheckName 'doublecheck' -FailureCategory 'network' -TimeoutSeconds $resolvedTimeoutSeconds -Detail $_.Exception.Message
        Write-Warning $loggedWarning

        $failedResult = New-JlReconFailedCheckResult -CheckName 'doublecheck' -Error $_.Exception.Message -FailureCategory 'network' -Warning $loggedWarning -TimeoutSeconds $resolvedTimeoutSeconds
        $failedChecks.Add($failedResult)
        $results.Add($failedResult)
        $warnings.Add((New-JlReconMode3FailureWarning -FailureCategory 'network' -TimeoutSeconds $resolvedTimeoutSeconds -VerifiedClaimCount (Get-JlReconMode3VerifiedClaimCount -Findings @($findings)) -Detail $_.Exception.Message))
    }
    catch [System.Net.Http.HttpRequestException] {
        $loggedWarning = New-JlReconCheckWarning -CheckName 'doublecheck' -FailureCategory 'network' -TimeoutSeconds $resolvedTimeoutSeconds -Detail $_.Exception.Message
        Write-Warning $loggedWarning

        $failedResult = New-JlReconFailedCheckResult -CheckName 'doublecheck' -Error $_.Exception.Message -FailureCategory 'network' -Warning $loggedWarning -TimeoutSeconds $resolvedTimeoutSeconds
        $failedChecks.Add($failedResult)
        $results.Add($failedResult)
        $warnings.Add((New-JlReconMode3FailureWarning -FailureCategory 'network' -TimeoutSeconds $resolvedTimeoutSeconds -VerifiedClaimCount (Get-JlReconMode3VerifiedClaimCount -Findings @($findings)) -Detail $_.Exception.Message))
    }
    catch {
        $failureCategory = Get-JlReconCheckFailureCategory -Message $_.Exception.Message
        $loggedWarning = New-JlReconCheckWarning -CheckName 'doublecheck' -FailureCategory $failureCategory -TimeoutSeconds $resolvedTimeoutSeconds -Detail $_.Exception.Message
        Write-Warning $loggedWarning

        $failedResult = New-JlReconFailedCheckResult -CheckName 'doublecheck' -Error $_.Exception.Message -FailureCategory $failureCategory -Warning $loggedWarning -TimeoutSeconds $resolvedTimeoutSeconds
        $failedChecks.Add($failedResult)
        $results.Add($failedResult)
        $warnings.Add((New-JlReconMode3FailureWarning -FailureCategory $failureCategory -TimeoutSeconds $resolvedTimeoutSeconds -VerifiedClaimCount (Get-JlReconMode3VerifiedClaimCount -Findings @($findings)) -Detail $_.Exception.Message))
    }

    $hasPartialClaimFailures = $malformedFindings.Count -gt 0
    $hasSuccessfulOutcome = $successfulChecks.Count -gt 0 -or $findings.Count -gt 0
    $checksStatus = if (-not $hasSuccessfulOutcome -and $failedChecks.Count -gt 0) {
        'unavailable'
    }
    elseif ($failedChecks.Count -gt 0 -or $hasPartialClaimFailures) {
        'partial'
    }
    else {
        'completed'
    }

    return [pscustomobject]@{
        Results = @($results)
        SuccessfulChecks = @($successfulChecks)
        FailedChecks = @($failedChecks)
        Findings = @($findings)
        AnySucceeded = $hasSuccessfulOutcome
        AllFailed = -not $hasSuccessfulOutcome -and $failedChecks.Count -gt 0
        PartialFailure = ($hasSuccessfulOutcome -and $failedChecks.Count -gt 0) -or $hasPartialClaimFailures
        FailureSummary = Get-JlReconFailedChecksSummary -FailedChecks @($failedChecks)
        ChecksStatus = $checksStatus
        TimeoutSeconds = $resolvedTimeoutSeconds
        WarningMessages = @($warnings | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
        MalformedFindings = @($malformedFindings)
        Degraded = $failedChecks.Count -gt 0 -or $hasPartialClaimFailures
    }
}

function ConvertTo-JlReconMode3SourcesMarkdown {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object[]]$Sources
    )

    $sourceItems = @($Sources)
    if ($sourceItems.Count -eq 0) {
        return '—'
    }

    $parts = foreach ($source in $sourceItems) {
        if ($null -eq $source) {
            continue
        }

        if ($source -is [string]) {
            $text = $source.Trim()
            if (-not [string]::IsNullOrWhiteSpace($text)) {
                if ($text -match '^https?://') {
                    "[source]($text)"
                }
                else {
                    $text
                }
            }

            continue
        }

        $label = Get-JlReconObjectValue -InputObject $source -Name 'Label'
        $url = Get-JlReconObjectValue -InputObject $source -Name 'Url'

        if (-not [string]::IsNullOrWhiteSpace($url)) {
            $resolvedLabel = if (-not [string]::IsNullOrWhiteSpace($label)) { $label.ToString() } else { 'source' }
            "[$resolvedLabel]($url)"
        }
        elseif (-not [string]::IsNullOrWhiteSpace($label)) {
            $label.ToString()
        }
    }

    $resolvedParts = @($parts | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($resolvedParts.Count -eq 0) {
        return '—'
    }

    return ($resolvedParts -join ', ')
}

function Resolve-JlReconMode3FindingsCollection {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Findings
    )

    if ($Findings -is [string]) {
        return @([pscustomobject]@{
                Claim = $Findings
                Status = 'UNVERIFIED'
                Confidence = 50
                Sources = @()
            })
    }

    if ($Findings -is [System.Collections.IDictionary]) {
        if ($Findings.Contains('Findings')) {
            return @($Findings['Findings'])
        }

        if ($Findings.Contains('claims') -or $Findings.Contains('findings')) {
            $parsed = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response $Findings
            return @($parsed.Findings)
        }
    }

    if (Test-JlReconObjectHasProperty -InputObject $Findings -Name 'Findings') {
        return @($Findings.Findings)
    }

    if ((Test-JlReconObjectHasProperty -InputObject $Findings -Name 'claims') -or (Test-JlReconObjectHasProperty -InputObject $Findings -Name 'findings')) {
        $parsed = ConvertFrom-JlReconMode3CheckResponseResult -CheckName 'doublecheck' -Response $Findings
        return @($parsed.Findings)
    }

    if ($Findings -is [System.Collections.IEnumerable] -and $Findings -isnot [string]) {
        return @($Findings)
    }

    return @($Findings)
}

function Format-JlReconMode3Findings {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Findings,

        [Parameter()]
        [object[]]$FailedChecks
    )

    $failedChecks = @($FailedChecks | Where-Object { $null -ne $_ })
    $resolvedFindings = @(Resolve-JlReconMode3FindingsCollection -Findings $Findings | Where-Object { $null -ne $_ })
    if ($resolvedFindings.Count -eq 0) {
        if ($failedChecks.Count -gt 0) {
            return ''
        }

        return 'No findings.'
    }

    $riskRank = @{
        FABRICATION_RISK = 0
        DISPUTED = 1
        UNVERIFIED = 2
        PLAUSIBLE = 3
        VERIFIED = 4
    }

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add('| Claim | Status | Confidence | Sources |')
    $lines.Add('| --- | --- | --- | --- |')

    $sortedFindings = $resolvedFindings | Sort-Object @{ Expression = {
                $statusValue = Get-JlReconObjectValue -InputObject $_ -Name 'Status'
                if ($null -eq $statusValue) { return 99 }

                $normalizedStatus = $statusValue.ToString().Trim().ToUpperInvariant()
                if ($riskRank.ContainsKey($normalizedStatus)) { $riskRank[$normalizedStatus] } else { 99 }
            } }, @{ Expression = {
                $confidenceValue = Get-JlReconObjectValue -InputObject $_ -Name 'Confidence'
                if ($null -eq $confidenceValue) { return 50 }
                return -1 * (ConvertFrom-JlReconMode3Confidence -Value $confidenceValue)
            } }, @{ Expression = {
                $claimValue = Get-JlReconObjectValue -InputObject $_ -Name 'Claim'
                if ($null -eq $claimValue) { return '' }
                return $claimValue.ToString()
            } }

    foreach ($finding in $sortedFindings) {
        $claim = Get-JlReconObjectValue -InputObject $finding -Name 'Claim'
        $status = Get-JlReconObjectValue -InputObject $finding -Name 'Status'
        $confidence = Get-JlReconObjectValue -InputObject $finding -Name 'Confidence'
        $sources = Get-JlReconObjectValue -InputObject $finding -Name 'Sources'

        $lines.Add("| $(ConvertTo-JlReconMarkdownCell -Value $claim) | $(ConvertTo-JlReconMarkdownCell -Value $status) | $(ConvertTo-JlReconMarkdownCell -Value ("{0}%" -f (ConvertFrom-JlReconMode3Confidence -Value $confidence))) | $(ConvertTo-JlReconMarkdownCell -Value (ConvertTo-JlReconMode3SourcesMarkdown -Sources @($sources))) |")
    }

    if ($failedChecks.Count -gt 0) {
        $summary = Get-JlReconFailedChecksSummary -FailedChecks $failedChecks
        if (-not [string]::IsNullOrWhiteSpace($summary)) {
            $lines.Add('')
            $lines.Add("> Failed checks: $(ConvertTo-JlReconMarkdownCell -Value $summary)")
        }
    }

    return ($lines -join [System.Environment]::NewLine)
}

if (-not (Get-Variable -Name JlReconMode3AuditTrail -Scope Script -ErrorAction SilentlyContinue)) {
    $script:JlReconMode3AuditTrail = [System.Collections.Generic.List[object]]::new()
}

function Get-JlReconMode3CurrentUserId {
    [CmdletBinding()]
    param()

    foreach ($variableName in @('GITHUB_USER', 'GITHUB_ACTOR', 'GH_USER', 'USERNAME', 'USER')) {
        $value = [System.Environment]::GetEnvironmentVariable($variableName)
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            return $value
        }
    }

    return $null
}

function Get-JlReconMode3DecisionPrompt {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$FindingsTable,

        [Parameter()]
        [string[]]$FailureWarnings
    )

    $hasFindingsTable = -not [string]::IsNullOrWhiteSpace($FindingsTable)
    $lines = [System.Collections.Generic.List[string]]::new()

    if (-not $hasFindingsTable) {
        $warningMessages = @($FailureWarnings | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        $reason = if ($warningMessages.Count -gt 0) {
            $warningMessages -join '; '
        }
        else {
            'doublecheck unavailable or all verification checks failed'
        }

        $lines.Add("⚠️ Quality checks unavailable: $reason")
        $lines.Add('')
        $lines.Add('Would you like to:')
        $lines.Add('1. Publish the report without verification')
        $lines.Add('2. Cancel and revise the status report')
        $lines.Add('3. Override and publish anyway')
        $lines.Add('')
        $lines.Add('(You can always publish)')
        return ($lines -join [System.Environment]::NewLine)
    }

    $lines.Add('✓ Verification complete')
    $lines.Add('')

    $warningMessages = @($FailureWarnings | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($warningMessages.Count -gt 0) {
        foreach ($warningMessage in $warningMessages) {
            $lines.Add("⚠️ $warningMessage")
        }

        $lines.Add('')
    }

    $lines.Add($FindingsTable)
    $lines.Add('')
    $lines.Add('Would you like to:')
    $lines.Add('1. Approve and publish report')
    $lines.Add('2. Override and publish anyway')
    $lines.Add('3. Cancel and revise')

    return ($lines -join [System.Environment]::NewLine)
}

function ConvertTo-JlReconMode3UserChoice {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [string]$InputText,

        [Parameter()]
        [bool]$ChecksAvailable
    )

    if ([string]::IsNullOrWhiteSpace($InputText)) {
        return $null
    }

    $normalized = $InputText.Trim().ToLowerInvariant()

    if ($ChecksAvailable) {
        switch -Regex ($normalized) {
            '^(1|approve|publish)$' { return 'approve' }
            '^(2|override)$' { return 'override' }
            '^(3|cancel)$' { return 'cancel' }
            default { return $null }
        }
    }

    switch -Regex ($normalized) {
        '^(1|approve|publish)$' { return 'publish' }
        '^(2|cancel)$' { return 'cancel' }
        '^(3|override)$' { return 'override' }
        default { return $null }
    }
}

function Get-JlReconMode3UserDecision {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$FindingsTable,

        [Parameter()]
        [string[]]$FailureWarnings,

        [Parameter()]
        [int]$MaxAttempts = 10
    )

    $checksAvailable = -not [string]::IsNullOrWhiteSpace($FindingsTable)
    $prompt = Get-JlReconMode3DecisionPrompt -FindingsTable $FindingsTable -FailureWarnings $FailureWarnings
    $validationMessage = 'Please enter 1, 2, 3, approve, override, or cancel.'

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        $response = Read-Host -Prompt $prompt
        $choice = ConvertTo-JlReconMode3UserChoice -InputText $response -ChecksAvailable $checksAvailable

        if ($null -ne $choice) {
            return [pscustomobject]@{
                Choice = $choice
                Timestamp = [System.DateTimeOffset]::UtcNow.ToString('o')
                UserId = Get-JlReconMode3CurrentUserId
            }
        }

        Write-Warning $validationMessage
    }

    throw "A valid Mode 3 decision was not provided after $MaxAttempts attempts."
}

function Get-JlReconMode3FindingsSummary {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$Findings
    )

    $findingItems = @()
    $failedChecks = @()

    if ($null -ne $Findings) {
        if ($Findings -is [System.Collections.IDictionary] -and $Findings.Contains('Findings')) {
            $findingItems = @($Findings['Findings'])
        }
        elseif ($Findings.PSObject.Properties.Name -contains 'Findings') {
            $findingItems = @($Findings.Findings)
        }
        elseif ($Findings -isnot [string] -and $Findings -is [System.Collections.IEnumerable]) {
            $findingItems = @($Findings)
        }

        if ($Findings -is [System.Collections.IDictionary] -and $Findings.Contains('FailedChecks')) {
            $failedChecks = @($Findings['FailedChecks'])
        }
        elseif ($Findings.PSObject.Properties.Name -contains 'FailedChecks') {
            $failedChecks = @($Findings.FailedChecks)
        }
        elseif ($Findings -is [System.Collections.IDictionary] -and $Findings.Contains('FailureWarnings')) {
            $failedChecks = @($Findings['FailureWarnings'])
        }
        elseif ($Findings.PSObject.Properties.Name -contains 'FailureWarnings') {
            $failedChecks = @($Findings.FailureWarnings)
        }
    }

    $normalizedStatuses = @($findingItems | ForEach-Object {
            if ($null -eq $_) {
                return $null
            }

            $status = $null
            if ($_ -is [System.Collections.IDictionary] -and $_.Contains('Status')) {
                $status = $_['Status']
            }
            elseif ($_.PSObject.Properties.Name -contains 'Status') {
                $status = $_.Status
            }

            if ($null -eq $status) {
                return $null
            }

            $status.ToString().ToUpperInvariant()
        } | Where-Object { $null -ne $_ })

    return [pscustomobject]@{
        TotalClaims = @($findingItems | Where-Object { $null -ne $_ }).Count
        VerifiedCount = @($normalizedStatuses | Where-Object { $_ -eq 'VERIFIED' }).Count
        PlausibleCount = @($normalizedStatuses | Where-Object { $_ -eq 'PLAUSIBLE' }).Count
        UnverifiedCount = @($normalizedStatuses | Where-Object { $_ -eq 'UNVERIFIED' }).Count
        DisputedCount = @($normalizedStatuses | Where-Object { $_ -eq 'DISPUTED' }).Count
        FabricationRiskCount = @($normalizedStatuses | Where-Object { $_ -eq 'FABRICATION_RISK' }).Count
        FailedCheckCount = @($failedChecks | Where-Object { $null -ne $_ }).Count
        FailedChecks = @($failedChecks | Where-Object { $null -ne $_ })
    }
}

function Record-JlReconMode3AuditEntry {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$StatusReportId,

        [Parameter(Mandatory)]
        [object]$Findings,

        [Parameter(Mandatory)]
        [object]$UserDecision,

        [Parameter()]
        [string[]]$FailureWarnings
    )

    $summary = Get-JlReconMode3FindingsSummary -Findings $Findings
    $userChoice = if ($UserDecision.PSObject.Properties.Name -contains 'Choice') { $UserDecision.Choice } else { $null }
    $timestamp = if ($UserDecision.PSObject.Properties.Name -contains 'Timestamp') { $UserDecision.Timestamp } else { $null }
    $userId = if ($UserDecision.PSObject.Properties.Name -contains 'UserId') { $UserDecision.UserId } else { $null }
    $warningMessages = @($FailureWarnings | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $failedChecks = @()
    $malformedFindings = @()

    if ($null -ne $Findings) {
        if (Test-JlReconObjectHasProperty -InputObject $Findings -Name 'FailedChecks') {
            $failedChecks = @($Findings.FailedChecks | Where-Object { $null -ne $_ })
        }

        if (Test-JlReconObjectHasProperty -InputObject $Findings -Name 'MalformedFindings') {
            $malformedFindings = @($Findings.MalformedFindings | Where-Object { $null -ne $_ })
        }
    }

    $degraded = @($warningMessages).Count -gt 0 -or @($failedChecks).Count -gt 0 -or @($malformedFindings).Count -gt 0
    $degradationTimestamp = if ($degraded) { [System.DateTimeOffset]::UtcNow.ToString('o') } else { $null }
    $degradationFailures = [System.Collections.Generic.List[object]]::new()

    foreach ($failedCheck in $failedChecks) {
        $degradationFailures.Add([pscustomobject]@{
                Type = 'check-failure'
                CheckName = $failedCheck.CheckName
                Category = $failedCheck.FailureCategory
                Message = if (-not [string]::IsNullOrWhiteSpace($failedCheck.Warning)) { $failedCheck.Warning } else { $failedCheck.FailureReason }
                Timestamp = $degradationTimestamp
            })
    }

    foreach ($malformedFinding in $malformedFindings) {
        $degradationFailures.Add([pscustomobject]@{
                Type = 'malformed-finding'
                Claim = Get-JlReconObjectValue -InputObject $malformedFinding -Name 'Claim'
                Index = Get-JlReconObjectValue -InputObject $malformedFinding -Name 'Index'
                Category = 'parse'
                Message = Get-JlReconObjectValue -InputObject $malformedFinding -Name 'Error'
                Timestamp = $degradationTimestamp
            })
    }

    foreach ($warningMessage in $warningMessages) {
        if (@($degradationFailures | Where-Object { $_.Message -eq $warningMessage }).Count -eq 0) {
            $degradationFailures.Add([pscustomobject]@{
                    Type = 'warning'
                    Category = 'warning'
                    Message = $warningMessage
                    Timestamp = $degradationTimestamp
                })
        }
    }

    $auditEntry = [pscustomobject]@{
        AuditType = 'mode3-publication-decision'
        ReportId = $StatusReportId
        RecordedAt = [System.DateTimeOffset]::UtcNow.ToString('o')
        FindingsSummary = $summary
        UserDecision = $userChoice
        DecisionTimestamp = $timestamp
        UserId = $userId
        Override = $userChoice -eq 'override'
        FailureWarnings = @($warningMessages)
        Degradation = [pscustomobject]@{
            Degraded = $degraded
            Failures = @($degradationFailures)
            WarningMessages = @($warningMessages)
            Timestamp = $degradationTimestamp
        }
    }

    $script:JlReconMode3AuditTrail.Add($auditEntry)

    return $auditEntry
}

function New-JlReconMode3DecisionResult {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$Decision,

        [Parameter()]
        [bool]$ChecksAvailable
    )

    if ($null -eq $Decision) {
        return $null
    }

    if (Test-JlReconObjectHasProperty -InputObject $Decision -Name 'Choice') {
        $choice = Get-JlReconObjectValue -InputObject $Decision -Name 'Choice'
        if ([string]::IsNullOrWhiteSpace($choice)) {
            return $null
        }

        return [pscustomobject]@{
            Choice = $choice.ToString().Trim().ToLowerInvariant()
            Timestamp = if (Test-JlReconObjectHasProperty -InputObject $Decision -Name 'Timestamp') {
                Get-JlReconObjectValue -InputObject $Decision -Name 'Timestamp'
            }
            else {
                [System.DateTimeOffset]::UtcNow.ToString('o')
            }
            UserId = if (Test-JlReconObjectHasProperty -InputObject $Decision -Name 'UserId') {
                Get-JlReconObjectValue -InputObject $Decision -Name 'UserId'
            }
            else {
                Get-JlReconMode3CurrentUserId
            }
        }
    }

    $choice = ConvertTo-JlReconMode3UserChoice -InputText $Decision.ToString() -ChecksAvailable $ChecksAvailable
    if ($null -eq $choice) {
        return $null
    }

    return [pscustomobject]@{
        Choice = $choice
        Timestamp = [System.DateTimeOffset]::UtcNow.ToString('o')
        UserId = Get-JlReconMode3CurrentUserId
    }
}

function Invoke-JlReconMode3PublicationWorkflow {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$StatusReportId,

        [Parameter(Mandatory)]
        [string]$StatusReportText,

        [Parameter()]
        [AllowNull()]
        [object]$Config,

        [Parameter()]
        [hashtable]$SubagentSpawningHandlers = @{},

        [Parameter()]
        [scriptblock]$DecisionProvider,

        [Parameter(Mandatory)]
        [scriptblock]$ReportPublisher,

        [Parameter()]
        [System.Collections.Generic.List[object]]$AuditTrail = $script:JlReconMode3AuditTrail
    )

    $checksEnabled = Get-JlReconMode3ChecksEnabled -Config $Config
    $timeoutSeconds = Get-JlReconMode3ChecksTimeoutSeconds -Config $Config
    $checkRun = $null
    $findings = @()
    $failedChecks = @()
    $warningMessages = @()
    $findingsTable = ''
    $decisionPrompt = $null

    if ($checksEnabled) {
        $checkRun = Invoke-JlReconMode3Checks -StatusReportText $StatusReportText -TimeoutSeconds $timeoutSeconds -Config $Config -SubagentSpawningHandlers $SubagentSpawningHandlers
        $findings = @($checkRun.Findings | Where-Object { $null -ne $_ })
        $failedChecks = @($checkRun.FailedChecks | Where-Object { $null -ne $_ })
        $warningMessages = @($checkRun.WarningMessages | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        $findingsTable = if ($findings.Count -gt 0) {
            Format-JlReconMode3Findings -Findings $findings -FailedChecks $failedChecks
        }
        else {
            ''
        }
    }
    else {
        $warningMessages = @('Mode 3 quality checks disabled by configuration.')
    }

    $userDecision = if ($null -ne $DecisionProvider) {
        $checksAvailable = -not [string]::IsNullOrWhiteSpace($findingsTable)
        $decisionPrompt = Get-JlReconMode3DecisionPrompt -FindingsTable $findingsTable -FailureWarnings $warningMessages
        $providedDecision = & $DecisionProvider $decisionPrompt $findingsTable @($warningMessages)
        New-JlReconMode3DecisionResult -Decision $providedDecision -ChecksAvailable $checksAvailable
    }
    else {
        $decisionPrompt = Get-JlReconMode3DecisionPrompt -FindingsTable $findingsTable -FailureWarnings $warningMessages
        Get-JlReconMode3UserDecision -FindingsTable $findingsTable -FailureWarnings $warningMessages
    }

    if ($null -eq $userDecision) {
        throw 'A valid Mode 3 decision was not provided.'
    }

    $auditFindings = if ($null -ne $checkRun) {
        $checkRun
    }
    else {
        [pscustomobject]@{
            Findings = @()
            FailedChecks = @()
            MalformedFindings = @()
        }
    }
    $shouldPublish = @('approve', 'override', 'publish') -contains $userDecision.Choice

    if (-not $shouldPublish) {
        $auditEntry = Record-JlReconMode3AuditEntry -StatusReportId $StatusReportId -Findings $auditFindings -UserDecision $userDecision -FailureWarnings $warningMessages
        if ($null -ne $AuditTrail -and -not [object]::ReferenceEquals($AuditTrail, $script:JlReconMode3AuditTrail)) {
            $AuditTrail.Add($auditEntry)
        }

        return [pscustomobject]@{
            Status = 'returned-to-report-generation'
            Published = $false
            StatusReportId = $StatusReportId
            Decision = $userDecision.Choice
            ChecksEnabled = $checksEnabled
            ChecksStatus = if ($checksEnabled -and $null -ne $checkRun) { $checkRun.ChecksStatus } else { 'disabled' }
            CheckRun = $checkRun
            Findings = $findings
            FindingsTable = $findingsTable
            WarningMessages = $warningMessages
            UserDecision = $userDecision
            AuditEntry = $auditEntry
            DecisionPrompt = $decisionPrompt
        }
    }

    $publishContext = [pscustomobject]@{
        StatusReportId = $StatusReportId
        StatusReportText = $StatusReportText
        Findings = $findings
        FindingsTable = $findingsTable
        FailedChecks = $failedChecks
        WarningMessages = $warningMessages
        UserDecision = $userDecision
        ChecksEnabled = $checksEnabled
        ChecksStatus = if ($checksEnabled -and $null -ne $checkRun) { $checkRun.ChecksStatus } else { 'disabled' }
        CheckRun = $checkRun
        TimeoutSeconds = $timeoutSeconds
    }

    $publishResult = & $ReportPublisher $StatusReportText $publishContext
    $publishedStatusReportId = $StatusReportId

    if ($null -ne $publishResult) {
        if ($publishResult -is [string] -and -not [string]::IsNullOrWhiteSpace($publishResult)) {
            $publishedStatusReportId = $publishResult
        }
        elseif (Test-JlReconObjectHasProperty -InputObject $publishResult -Name 'StatusReportId') {
            $candidateStatusReportId = Get-JlReconObjectValue -InputObject $publishResult -Name 'StatusReportId'
            if (-not [string]::IsNullOrWhiteSpace($candidateStatusReportId)) {
                $publishedStatusReportId = $candidateStatusReportId
            }
        }
        elseif (Test-JlReconObjectHasProperty -InputObject $publishResult -Name 'ReportId') {
            $candidateStatusReportId = Get-JlReconObjectValue -InputObject $publishResult -Name 'ReportId'
            if (-not [string]::IsNullOrWhiteSpace($candidateStatusReportId)) {
                $publishedStatusReportId = $candidateStatusReportId
            }
        }
        elseif (Test-JlReconObjectHasProperty -InputObject $publishResult -Name 'Id') {
            $candidateStatusReportId = Get-JlReconObjectValue -InputObject $publishResult -Name 'Id'
            if (-not [string]::IsNullOrWhiteSpace($candidateStatusReportId)) {
                $publishedStatusReportId = $candidateStatusReportId
            }
        }
    }

    $auditEntry = Record-JlReconMode3AuditEntry -StatusReportId $publishedStatusReportId -Findings $auditFindings -UserDecision $userDecision -FailureWarnings $warningMessages
    if ($null -ne $AuditTrail -and -not [object]::ReferenceEquals($AuditTrail, $script:JlReconMode3AuditTrail)) {
        $AuditTrail.Add($auditEntry)
    }

    return [pscustomobject]@{
        Status = 'published'
        Published = $true
        StatusReportId = $publishedStatusReportId
        Decision = $userDecision.Choice
        ChecksEnabled = $checksEnabled
        ChecksStatus = if ($checksEnabled -and $null -ne $checkRun) { $checkRun.ChecksStatus } else { 'disabled' }
        CheckRun = $checkRun
        Findings = $findings
        FindingsTable = $findingsTable
        WarningMessages = $warningMessages
        UserDecision = $userDecision
        AuditEntry = $auditEntry
        PublishResult = $publishResult
        DecisionPrompt = $decisionPrompt
    }
}
