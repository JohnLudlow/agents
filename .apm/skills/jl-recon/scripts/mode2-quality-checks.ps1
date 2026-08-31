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

function Get-JlReconMode2ChecksEnabled {
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

    if ($checks -is [System.Collections.IDictionary] -and $checks.Contains('on_ticket_resolution_enabled')) {
        return [bool]$checks['on_ticket_resolution_enabled']
    }

    if ($checks.PSObject.Properties.Name -contains 'on_ticket_resolution_enabled') {
        return [bool]$checks.on_ticket_resolution_enabled
    }

    return $true
}

function Get-JlReconMode2ChecksTimeoutSeconds {
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

function Get-JlReconMode2ChecksStatus {
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

    return $InputObject.PSObject.Properties.Name -contains $Name
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
        [object]$Ticket,

        [Parameter()]
        [int]$TimeoutSeconds = 30
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
            Invoke = $Handler.Invoke
            IgnoreElapsedTimeout = if ($Handler.PSObject.Properties.Name -contains 'IgnoreElapsedTimeout') { [bool]$Handler.IgnoreElapsedTimeout } else { $false }
        }
    }

    if ($null -eq $handlerDefinition.Invoke) {
        throw 'No invoke callback registered.'
    }

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $response = & $handlerDefinition.Invoke $CheckName $Ticket $TimeoutSeconds
    $stopwatch.Stop()

    if (-not $handlerDefinition.IgnoreElapsedTimeout -and $stopwatch.Elapsed.TotalSeconds -gt $TimeoutSeconds) {
        throw [System.TimeoutException]::new("Check invocation timed out after ${TimeoutSeconds}s")
    }

    return [pscustomobject]@{
        Response = $response
        ElapsedMilliseconds = [int][Math]::Round($stopwatch.Elapsed.TotalMilliseconds)
    }
}

function Add-JlReconAuditTrailEntry {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [System.Collections.Generic.List[object]]$AuditTrail,

        [Parameter(Mandatory)]
        [hashtable]$Entry
    )

    $auditEntry = [pscustomobject]$Entry

    if ($null -ne $AuditTrail) {
        $AuditTrail.Add($auditEntry)
    }

    return $auditEntry
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

    if ($InputObject.PSObject.Properties.Name -contains $Name) {
        return $InputObject.$Name
    }

    return $null
}

function Get-JlReconFailedChecksSummary {
    [CmdletBinding()]
    param(
        [Parameter()]
        [object[]]$FailedChecks
    )

    $failedChecks = @($FailedChecks)

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

function Test-JlReconCheckResponseSchema {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$CheckName,

        [Parameter()]
        [AllowNull()]
        [object]$ParsedResponse
    )

    if ($null -eq $ParsedResponse) {
        return [pscustomobject]@{
            Success = $false
            Error = 'response was null'
        }
    }

    $hasFindings = $false
    $rawFindings = $null

    if ($ParsedResponse -is [System.Collections.IDictionary] -and $ParsedResponse.Contains('findings')) {
        $hasFindings = $true
        $rawFindings = $ParsedResponse['findings']
    }
    elseif (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'findings') {
        $hasFindings = $true
        $rawFindings = $ParsedResponse.findings
    }
    elseif (
        (Test-JlReconObjectHasProperty -InputObject $ParsedResponse -Name 'report') -and
        $null -ne $ParsedResponse.report -and
        (Test-JlReconObjectHasProperty -InputObject $ParsedResponse.report -Name 'findings')
    ) {
        $hasFindings = $true
        $rawFindings = $ParsedResponse.report.findings
    }

    if (-not $hasFindings) {
        return [pscustomobject]@{
            Success = $false
            Error = "response for $CheckName is missing findings"
        }
    }

    if ($null -eq $rawFindings) {
        $rawFindings = @()
    }

    if ($rawFindings -is [string] -or $rawFindings -isnot [System.Collections.IEnumerable]) {
        return [pscustomobject]@{
            Success = $false
            Error = "response for $CheckName has a non-array findings property"
        }
    }

    $index = 0
    foreach ($finding in @($rawFindings)) {
        if ($null -eq $finding) {
            return [pscustomobject]@{
                Success = $false
                Error = "finding at index $index for $CheckName was null"
            }
        }

        if (-not (Test-JlReconObjectHasProperty -InputObject $finding -Name 'severity')) {
            return [pscustomobject]@{
                Success = $false
                Error = "finding at index $index for $CheckName is missing severity"
            }
        }

        if (-not (Test-JlReconObjectHasProperty -InputObject $finding -Name 'description')) {
            return [pscustomobject]@{
                Success = $false
                Error = "finding at index $index for $CheckName is missing description"
            }
        }

        if (-not (Test-JlReconObjectHasProperty -InputObject $finding -Name 'recommendation')) {
            return [pscustomobject]@{
                Success = $false
                Error = "finding at index $index for $CheckName is missing recommendation"
            }
        }

        $index++
    }

    return [pscustomobject]@{
        Success = $true
        Error = $null
    }
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
        [object]$Ticket,

        [Parameter()]
        [string[]]$StrategyOrder = @('subagent', 'herdr', 'session'),

        [Parameter()]
        [int]$TimeoutSeconds = 30
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
                })
        }
        else {
            try {
                $invocation = Invoke-JlReconStrategyHandler -Handler $StrategyHandlers[$strategy] -CheckName $CheckName -Ticket $Ticket -TimeoutSeconds $TimeoutSeconds
                $attempts.Add([pscustomobject]@{
                        Strategy = $strategy
                        Status = 'success'
                        Category = $null
                        Error = $null
                        FailureReason = $null
                        ElapsedMilliseconds = $invocation.ElapsedMilliseconds
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
                $attempts.Add([pscustomobject]@{
                        Strategy = $strategy
                        Status = 'failed'
                        Category = 'timeout'
                        Error = $_.Exception.Message
                        FailureReason = Get-JlReconCheckFailureReasonText -Category 'timeout' -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail $_.Exception.Message
                        ElapsedMilliseconds = 0
                    })
            }
            catch [System.Net.WebException] {
                $attempts.Add([pscustomobject]@{
                        Strategy = $strategy
                        Status = 'failed'
                        Category = 'network'
                        Error = $_.Exception.Message
                        FailureReason = Get-JlReconCheckFailureReasonText -Category 'network' -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail $_.Exception.Message
                        ElapsedMilliseconds = 0
                    })
            }
            catch [System.Net.Http.HttpRequestException] {
                $attempts.Add([pscustomobject]@{
                        Strategy = $strategy
                        Status = 'failed'
                        Category = 'network'
                        Error = $_.Exception.Message
                        FailureReason = Get-JlReconCheckFailureReasonText -Category 'network' -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail $_.Exception.Message
                        ElapsedMilliseconds = 0
                    })
            }
            catch {
                $category = Get-JlReconCheckFailureCategory -Message $_.Exception.Message
                $attempts.Add([pscustomobject]@{
                        Strategy = $strategy
                        Status = 'failed'
                        Category = $category
                        Error = $_.Exception.Message
                        FailureReason = Get-JlReconCheckFailureReasonText -Category $category -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail $_.Exception.Message
                        ElapsedMilliseconds = 0
                    })
            }
        }
    }

    $failureCategory = Get-JlReconAggregateFailureCategory -Attempts @($attempts)

    return [pscustomobject]@{
        CheckName = $CheckName
        Status = 'failed'
        Strategy = $null
        Response = $null
        Attempts = @($attempts)
        Error = 'All fallback strategies failed.'
        FailureCategory = $failureCategory
        FailureReason = Get-JlReconCheckFailureReasonText -Category $failureCategory -CheckName $CheckName -TimeoutSeconds $TimeoutSeconds -Detail 'All fallback strategies failed.'
        TimeoutSeconds = $TimeoutSeconds
    }
}

function ConvertFrom-JlReconCheckResponseResult {
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
            Error = "response for $CheckName was null"
            FailureCategory = 'parse'
        }
    }

    $parsedResponse = $Response

    if ($Response -is [string]) {
        try {
            $parsedResponse = $Response | ConvertFrom-Json -Depth 20
        }
        catch {
            return [pscustomobject]@{
                Success = $false
                Findings = @()
                Error = $_.Exception.Message
                FailureCategory = 'parse'
            }
        }
    }

    $schemaValidation = Test-JlReconCheckResponseSchema -CheckName $CheckName -ParsedResponse $parsedResponse
    if (-not $schemaValidation.Success) {
        return [pscustomobject]@{
            Success = $false
            Findings = @()
            Error = $schemaValidation.Error
            FailureCategory = 'parse'
        }
    }

    $rawFindings = @()

    if ($parsedResponse -is [System.Collections.IDictionary] -and $parsedResponse.Contains('findings')) {
        $rawFindings = @($parsedResponse['findings'])
    }
    elseif ($parsedResponse.PSObject.Properties.Name -contains 'findings') {
        $rawFindings = @($parsedResponse.findings)
    }
    elseif ($parsedResponse.PSObject.Properties.Name -contains 'report' -and $null -ne $parsedResponse.report -and $parsedResponse.report.PSObject.Properties.Name -contains 'findings') {
        $rawFindings = @($parsedResponse.report.findings)
    }

    $normalizedFindings = foreach ($finding in $rawFindings) {
        if ($null -ne $finding) {
            $severityValue = Get-JlReconObjectValue -InputObject $finding -Name 'severity'
            $severity = if ($null -ne $severityValue) {
                $severityValue.ToString().ToLowerInvariant()
            }
            else {
                'minor'
            }

            $descriptionValue = Get-JlReconObjectValue -InputObject $finding -Name 'description'
            $findingValue = Get-JlReconObjectValue -InputObject $finding -Name 'finding'
            $messageValue = Get-JlReconObjectValue -InputObject $finding -Name 'message'
            $description = if ($null -ne $descriptionValue) {
                $descriptionValue.ToString()
            }
            elseif ($null -ne $findingValue) {
                $findingValue.ToString()
            }
            elseif ($null -ne $messageValue) {
                $messageValue.ToString()
            }
            else {
                ''
            }

            $recommendationValue = Get-JlReconObjectValue -InputObject $finding -Name 'recommendation'
            $recommendation = if ($null -ne $recommendationValue) {
                $recommendationValue.ToString()
            }
            else {
                $null
            }

            $fileValue = Get-JlReconObjectValue -InputObject $finding -Name 'file'
            $pathValue = Get-JlReconObjectValue -InputObject $finding -Name 'path'
            $file = if ($null -ne $fileValue) {
                $fileValue.ToString()
            }
            elseif ($null -ne $pathValue) {
                $pathValue.ToString()
            }
            else {
                $null
            }

            $lineValue = Get-JlReconObjectValue -InputObject $finding -Name 'line'
            $line = if ($null -ne $lineValue) {
                [int]$lineValue
            }
            else {
                $null
            }

            $columnValue = Get-JlReconObjectValue -InputObject $finding -Name 'column'
            $column = if ($null -ne $columnValue) {
                [int]$columnValue
            }
            else {
                $null
            }

            $locationValue = Get-JlReconObjectValue -InputObject $finding -Name 'location'
            $location = if ($null -ne $locationValue) {
                $locationValue.ToString()
            }
            else {
                $null
            }

            [pscustomobject]@{
                Severity = $severity
                Check = $CheckName
                Finding = $description
                Recommendation = $recommendation
                File = $file
                Line = $line
                Column = $column
                Location = $location
            }
        }
    }

    return [pscustomobject]@{
        Success = $true
        Findings = @($normalizedFindings)
        Error = $null
        FailureCategory = $null
    }
}

function ConvertFrom-JlReconCheckResponse {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$CheckName,

        [Parameter()]
        [AllowNull()]
        [object]$Response
    )

    $result = ConvertFrom-JlReconCheckResponseResult -CheckName $CheckName -Response $Response
    $findings = @(@($result.Findings) | Where-Object { $null -ne $_ })
    return ,$findings
}

function Invoke-JlReconMode2CheckRequest {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Request,

        [Parameter(Mandatory)]
        [hashtable]$StrategyHandlers,

        [Parameter()]
        [AllowNull()]
        [object]$Ticket,

        [Parameter()]
        [int]$DefaultTimeoutSeconds = 30
    )

    $resolvedRequest = ConvertTo-JlReconCheckRequest -Request $Request -DefaultTimeoutSeconds $DefaultTimeoutSeconds

    try {
        $result = Invoke-JlReconCheckWithFallback -CheckName $resolvedRequest.Name -StrategyHandlers $StrategyHandlers -Ticket $Ticket -StrategyOrder $resolvedRequest.StrategyOrder -TimeoutSeconds $resolvedRequest.TimeoutSeconds

        if ($result.Status -ne 'success') {
            $warningDetail = @(
                @($result.Attempts) |
                ForEach-Object { $_.Error } |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
            ) | Select-Object -First 1

            if ([string]::IsNullOrWhiteSpace($warningDetail)) {
                $warningDetail = if (-not [string]::IsNullOrWhiteSpace($result.FailureReason)) { $result.FailureReason } else { $result.Error }
            }

            $warning = New-JlReconCheckWarning -CheckName $resolvedRequest.Name -FailureCategory $result.FailureCategory -TimeoutSeconds $resolvedRequest.TimeoutSeconds -Detail $warningDetail
            Write-Warning $warning

            return New-JlReconFailedCheckResult `
                -CheckName $resolvedRequest.Name `
                -Strategy $result.Strategy `
                -Response $result.Response `
                -Attempts @($result.Attempts) `
                -Error $result.Error `
                -FailureCategory $result.FailureCategory `
                -Warning $warning `
                -TimeoutSeconds $resolvedRequest.TimeoutSeconds
        }

        $parseResult = ConvertFrom-JlReconCheckResponseResult -CheckName $result.CheckName -Response $result.Response
        if (-not $parseResult.Success) {
            $warning = New-JlReconCheckWarning -CheckName $result.CheckName -FailureCategory $parseResult.FailureCategory -TimeoutSeconds $resolvedRequest.TimeoutSeconds -Detail $parseResult.Error
            Write-Warning $warning

            return New-JlReconFailedCheckResult `
                -CheckName $result.CheckName `
                -Strategy $result.Strategy `
                -Response $result.Response `
                -Attempts @($result.Attempts) `
                -Error $parseResult.Error `
                -FailureCategory $parseResult.FailureCategory `
                -Warning $warning `
                -TimeoutSeconds $resolvedRequest.TimeoutSeconds
        }

        $result | Add-Member -NotePropertyName ParsedFindings -NotePropertyValue @($parseResult.Findings) -Force
        $result | Add-Member -NotePropertyName Warning -NotePropertyValue $null -Force
        $result | Add-Member -NotePropertyName Failed -NotePropertyValue $false -Force
        return $result
    }
    catch [System.TimeoutException] {
        $warning = New-JlReconCheckWarning -CheckName $resolvedRequest.Name -FailureCategory 'timeout' -TimeoutSeconds $resolvedRequest.TimeoutSeconds -Detail $_.Exception.Message
        Write-Warning $warning

        return New-JlReconFailedCheckResult `
            -CheckName $resolvedRequest.Name `
            -Error $_.Exception.Message `
            -FailureCategory 'timeout' `
            -Warning $warning `
            -TimeoutSeconds $resolvedRequest.TimeoutSeconds
    }
    catch [System.Net.WebException] {
        $warning = New-JlReconCheckWarning -CheckName $resolvedRequest.Name -FailureCategory 'network' -TimeoutSeconds $resolvedRequest.TimeoutSeconds -Detail $_.Exception.Message
        Write-Warning $warning

        return New-JlReconFailedCheckResult `
            -CheckName $resolvedRequest.Name `
            -Error $_.Exception.Message `
            -FailureCategory 'network' `
            -Warning $warning `
            -TimeoutSeconds $resolvedRequest.TimeoutSeconds
    }
    catch [System.Net.Http.HttpRequestException] {
        $warning = New-JlReconCheckWarning -CheckName $resolvedRequest.Name -FailureCategory 'network' -TimeoutSeconds $resolvedRequest.TimeoutSeconds -Detail $_.Exception.Message
        Write-Warning $warning

        return New-JlReconFailedCheckResult `
            -CheckName $resolvedRequest.Name `
            -Error $_.Exception.Message `
            -FailureCategory 'network' `
            -Warning $warning `
            -TimeoutSeconds $resolvedRequest.TimeoutSeconds
    }
    catch {
        $warning = New-JlReconCheckWarning -CheckName $resolvedRequest.Name -FailureCategory 'error' -TimeoutSeconds $resolvedRequest.TimeoutSeconds -Detail $_.Exception.Message
        Write-Warning $warning

        return New-JlReconFailedCheckResult `
            -CheckName $resolvedRequest.Name `
            -Error $_.Exception.Message `
            -FailureCategory 'error' `
            -Warning $warning `
            -TimeoutSeconds $resolvedRequest.TimeoutSeconds
    }
}

function Invoke-JlReconMode2Checks {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object[]]$CheckRequests,

        [Parameter(Mandatory)]
        [hashtable]$StrategyHandlers,

        [Parameter()]
        [AllowNull()]
        [object]$Ticket,

        [Parameter()]
        [int]$TimeoutSeconds = 30
    )

    Write-Information "Starting Mode 2 checks (timeout: ${TimeoutSeconds}s)"

    $results = [System.Collections.Generic.List[object]]::new()
    $successfulChecks = [System.Collections.Generic.List[object]]::new()
    $failedChecks = [System.Collections.Generic.List[object]]::new()
    $findings = [System.Collections.Generic.List[object]]::new()
    $warnings = [System.Collections.Generic.List[string]]::new()

    foreach ($request in $CheckRequests) {
        $result = Invoke-JlReconMode2CheckRequest -Request $request -StrategyHandlers $StrategyHandlers -Ticket $Ticket -DefaultTimeoutSeconds $TimeoutSeconds

        if ($result.Status -eq 'success') {
            $successfulChecks.Add($result)
            $results.Add($result)

            foreach ($finding in $result.ParsedFindings) {
                $findings.Add($finding)
            }
        }
        else {
            $failedChecks.Add($result)
            $results.Add($result)

            if (-not [string]::IsNullOrWhiteSpace($result.Warning)) {
                $warnings.Add($result.Warning)
            }
        }
    }

    $checksStatus = if ($successfulChecks.Count -eq 0) {
        'unavailable'
    }
    elseif ($failedChecks.Count -gt 0) {
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
        AnySucceeded = $successfulChecks.Count -gt 0
        AllFailed = $successfulChecks.Count -eq 0
        PartialFailure = $successfulChecks.Count -gt 0 -and $failedChecks.Count -gt 0
        FailureSummary = Get-JlReconFailedChecksSummary -FailedChecks @($failedChecks)
        ChecksStatus = $checksStatus
        TimeoutSeconds = $TimeoutSeconds
        WarningMessages = @($warnings)
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

    return $text.Replace('|', '\|').Replace("`r`n", '<br>').Replace("`n", '<br>').Replace("`r", '<br>')
}

function Get-JlReconFindingLocationText {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Finding
    )

    $locationValue = Get-JlReconObjectValue -InputObject $Finding -Name 'Location'
    if (-not [string]::IsNullOrWhiteSpace($locationValue)) {
        return $locationValue
    }

    $fileValue = Get-JlReconObjectValue -InputObject $Finding -Name 'File'
    $lineValue = Get-JlReconObjectValue -InputObject $Finding -Name 'Line'
    $columnValue = Get-JlReconObjectValue -InputObject $Finding -Name 'Column'

    if (-not [string]::IsNullOrWhiteSpace($fileValue)) {
        if ($null -ne $lineValue -and $null -ne $columnValue) {
            return "${fileValue}:${lineValue}:${columnValue}"
        }

        if ($null -ne $lineValue) {
            return "${fileValue}:${lineValue}"
        }

        return $fileValue
    }

    if ($null -ne $lineValue -and $null -ne $columnValue) {
        return "line ${lineValue}:${columnValue}"
    }

    if ($null -ne $lineValue) {
        return "line $lineValue"
    }

    return $null
}

function Format-JlReconMode2FindingsTable {
    [CmdletBinding()]
    param(
        [Parameter()]
        [object[]]$Findings
    )

    $findings = @($Findings)
    if ($findings.Count -eq 0) {
        return 'No findings.'
    }

    $severityRank = @{
        critical = 0
        major = 1
        minor = 2
        nit = 3
    }

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add('| Severity | Check | Finding | Recommendation |')
    $lines.Add('| --- | --- | --- | --- |')

    $sortedFindings = $findings | Sort-Object @{ Expression = {
                if ($severityRank.ContainsKey($_.Severity)) { $severityRank[$_.Severity] } else { 99 }
            } }, Check, Finding

    foreach ($finding in $sortedFindings) {
        $findingText = $finding.Finding
        $location = Get-JlReconFindingLocationText -Finding $finding

        if (-not [string]::IsNullOrWhiteSpace($location)) {
            if ([string]::IsNullOrWhiteSpace($findingText)) {
                $findingText = "Location: $location"
            }
            else {
                $findingText = "$findingText ($location)"
            }
        }

        $lines.Add(
            "| $(ConvertTo-JlReconMarkdownCell -Value $finding.Severity) | $(ConvertTo-JlReconMarkdownCell -Value $finding.Check) | $(ConvertTo-JlReconMarkdownCell -Value $findingText) | $(ConvertTo-JlReconMarkdownCell -Value $finding.Recommendation) |"
        )
    }

    return ($lines -join [Environment]::NewLine)
}

function ConvertTo-JlReconMode2Decision {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [string]$Decision
    )

    if ([string]::IsNullOrWhiteSpace($Decision)) {
        return $null
    }

    $normalized = $Decision.Trim().ToLowerInvariant()

    switch -Regex ($normalized) {
        '^approve' { return 'approve' }
        '^override' { return 'override' }
        '^cancel' { return 'cancel' }
        '^proceed' { return 'proceed' }
        default { return $null }
    }
}

function Resolve-JlReconMode2Decision {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [scriptblock]$DecisionProvider,

        [Parameter()]
        [string[]]$AllowedDecisions = @('approve', 'override', 'cancel'),

        [Parameter()]
        [string]$Prompt = 'Review Mode 2 quality checks.',

        [Parameter()]
        [AllowNull()]
        [System.Collections.Generic.List[object]]$AuditTrail,

        [Parameter()]
        [hashtable]$AuditContext = @{},

        [Parameter()]
        [int]$MaxAttempts = 10
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        $rawDecision = & $DecisionProvider $Prompt $AllowedDecisions
        $decision = ConvertTo-JlReconMode2Decision -Decision $rawDecision

        if ($null -ne $decision -and $AllowedDecisions -contains $decision) {
            return Add-JlReconAuditTrailEntry -AuditTrail $AuditTrail -Entry ($AuditContext + @{
                    AuditType = 'decision'
                    Decision = $decision
                    Prompt = $Prompt
                    Attempt = $attempt
                })
        }
    }

    throw "A valid Mode 2 decision was not provided after $MaxAttempts attempts."
}

function Get-JlReconMode2DecisionPrompt {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [object]$CheckRun,

        [Parameter()]
        [AllowNull()]
        [string]$FindingsTable
    )

    $checksStatus = Get-JlReconMode2ChecksStatus -CheckRun $CheckRun
    $lines = [System.Collections.Generic.List[string]]::new()

    switch ($checksStatus) {
        'unavailable' {
            $reason = if ([string]::IsNullOrWhiteSpace($CheckRun.FailureSummary)) {
                'All quality checks failed'
            }
            else {
                $CheckRun.FailureSummary
            }

            $lines.Add("⚠️ Quality checks unavailable: $reason")

            if (-not [string]::IsNullOrWhiteSpace($FindingsTable)) {
                $lines.Add('')
                $lines.Add('Available findings:')
                $lines.Add($FindingsTable)
            }

            $lines.Add('')
            $lines.Add('Would you like to:')
            $lines.Add('1. Proceed without checks and record the resolution')
            $lines.Add('2. Cancel and revise the ticket')
            $lines.Add('3. Override and record anyway')
            $lines.Add('')
            $lines.Add('(User can always override and proceed)')
            return ($lines -join [Environment]::NewLine)
        }
        'partial' {
            $availableFindings = if ([string]::IsNullOrWhiteSpace($FindingsTable)) {
                'No successful checks returned findings.'
            }
            else {
                $FindingsTable
            }

            $lines.Add("⚠️ Some quality checks failed: $($CheckRun.FailureSummary)")
            $lines.Add('')
            $lines.Add('Available findings:')
            $lines.Add($availableFindings)
            $lines.Add('')
            $lines.Add('Would you like to:')
            $lines.Add('1. Approve and record resolution')
            $lines.Add('2. Override and record anyway')
            $lines.Add('3. Cancel and revise')
            $lines.Add('')
            $lines.Add('(Proceed with available findings)')
            return ($lines -join [Environment]::NewLine)
        }
        default {
            if ([string]::IsNullOrWhiteSpace($FindingsTable)) {
                $lines.Add('✅ Quality checks completed with no findings.')
            }
            else {
                $lines.Add('Available findings:')
                $lines.Add($FindingsTable)
            }

            $lines.Add('')
            $lines.Add('Would you like to:')
            $lines.Add('1. Approve and record resolution')
            $lines.Add('2. Override and record anyway')
            $lines.Add('3. Cancel resolution')
            return ($lines -join [Environment]::NewLine)
        }
    }
}

function Invoke-JlReconMode2ResolutionWorkflow {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object]$Ticket,

        [Parameter()]
        [AllowNull()]
        [object]$Config,

        [Parameter()]
        [object[]]$CheckRequests = @('jl-adversarial-reviewer'),

        [Parameter()]
        [hashtable]$StrategyHandlers = @{},

        [Parameter(Mandatory)]
        [scriptblock]$DecisionProvider,

        [Parameter(Mandatory)]
        [scriptblock]$ResolutionRecorder,

        [Parameter()]
        [System.Collections.Generic.List[object]]$AuditTrail = [System.Collections.Generic.List[object]]::new()
    )

    $ticketId = if ($Ticket.PSObject.Properties.Name -contains 'Id') { $Ticket.Id } else { $null }
    $timeoutSeconds = Get-JlReconMode2ChecksTimeoutSeconds -Config $Config

    if (-not (Get-JlReconMode2ChecksEnabled -Config $Config)) {
        $checksAuditEntry = Add-JlReconAuditTrailEntry -AuditTrail $AuditTrail -Entry @{
            AuditType = 'checks'
            TicketId = $ticketId
            ChecksStatus = 'disabled'
            TimeoutSeconds = $timeoutSeconds
            FindingsCount = 0
            FailureSummary = 'Quality checks disabled by configuration.'
            WarningMessages = @()
        }

        $resolutionResult = [pscustomobject]@{
            Decision = 'approve'
            ChecksStatus = 'disabled'
            Findings = @()
            FindingsTable = $null
            WarningMessages = @()
            AuditTrail = @($AuditTrail)
        }

        & $ResolutionRecorder $Ticket $resolutionResult

        return [pscustomobject]@{
            Status = 'resolved'
            Decision = 'approve'
            ChecksStatus = 'disabled'
            Findings = @()
            FindingsTable = $null
            WarningMessages = @()
            ResolutionRecorded = $true
            AuditTrail = @($AuditTrail)
            CheckRun = $null
            ChecksAuditEntry = $checksAuditEntry
            DecisionPrompt = $null
        }
    }

    $checkRun = Invoke-JlReconMode2Checks -CheckRequests $CheckRequests -StrategyHandlers $StrategyHandlers -Ticket $Ticket -TimeoutSeconds $timeoutSeconds
    $checksStatus = Get-JlReconMode2ChecksStatus -CheckRun $checkRun
    $findings = @($checkRun.Findings)
    $findingsTable = if ($findings.Count -gt 0) {
        Format-JlReconMode2FindingsTable -Findings $findings
    }
    else {
        $null
    }

    $checksAuditEntry = Add-JlReconAuditTrailEntry -AuditTrail $AuditTrail -Entry @{
        AuditType = 'checks'
        TicketId = $ticketId
        ChecksStatus = $checksStatus
        TimeoutSeconds = $timeoutSeconds
        FindingsCount = $findings.Count
        FailureSummary = if ([string]::IsNullOrWhiteSpace($checkRun.FailureSummary)) { $null } else { $checkRun.FailureSummary }
        FailedChecks = @($checkRun.FailedChecks | ForEach-Object { $_.CheckName })
        WarningMessages = @($checkRun.WarningMessages)
    }

    $allowedDecisions = if ($checkRun.AllFailed) {
        @('proceed', 'override', 'cancel')
    }
    else {
        @('approve', 'override', 'cancel')
    }

    $decisionPrompt = Get-JlReconMode2DecisionPrompt -CheckRun $checkRun -FindingsTable $findingsTable
    $decision = Resolve-JlReconMode2Decision `
        -DecisionProvider $DecisionProvider `
        -AllowedDecisions $allowedDecisions `
        -Prompt $decisionPrompt `
        -AuditTrail $AuditTrail `
        -AuditContext @{
            TicketId = $ticketId
            ChecksStatus = $checksStatus
            FailedChecks = @($checkRun.FailedChecks | ForEach-Object { $_.CheckName })
        }

    if ($decision.Decision -eq 'cancel') {
        return [pscustomobject]@{
            Status = 'returned-to-resolve-step'
            Decision = 'cancel'
            ChecksStatus = $checksStatus
            Findings = $findings
            FindingsTable = $findingsTable
            WarningMessages = @($checkRun.WarningMessages)
            ResolutionRecorded = $false
            AuditTrail = @($AuditTrail)
            CheckRun = $checkRun
            ChecksAuditEntry = $checksAuditEntry
            DecisionPrompt = $decisionPrompt
        }
    }

    $resolutionResult = [pscustomobject]@{
        Decision = $decision.Decision
        ChecksStatus = $checksStatus
        Findings = $findings
        FindingsTable = $findingsTable
        WarningMessages = @($checkRun.WarningMessages)
        AuditTrail = @($AuditTrail)
    }

    & $ResolutionRecorder $Ticket $resolutionResult

    return [pscustomobject]@{
        Status = 'resolved'
        Decision = $decision.Decision
        ChecksStatus = $checksStatus
        Findings = $findings
        FindingsTable = $findingsTable
        WarningMessages = @($checkRun.WarningMessages)
        ResolutionRecorded = $true
        AuditTrail = @($AuditTrail)
        CheckRun = $checkRun
        ChecksAuditEntry = $checksAuditEntry
        DecisionPrompt = $decisionPrompt
    }
}
