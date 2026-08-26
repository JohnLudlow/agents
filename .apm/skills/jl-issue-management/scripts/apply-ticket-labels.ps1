<#
.SYNOPSIS
Applies deterministic labels to a GitHub issue via gh CLI.

.DESCRIPTION
Combines configured labels, inherited labels, and a recon:<type> label into a
sorted unique set. If UserOverride is provided, it replaces the entire computed
label set. The script validates gh availability and issue existence before
applying labels.

.PARAMETER Repo
GitHub repository in owner/name format.

.PARAMETER TicketNumber
Issue or ticket number to update.

.PARAMETER Type
Ticket type. Valid values: quiz, research, prototype, task.

.PARAMETER ConfiguredLabels
Comma-separated labels configured for the ticket type.

.PARAMETER InheritedLabels
Comma-separated labels inherited from a parent mapping.

.PARAMETER UserOverride
Comma-separated labels that replace the entire computed label set.

.PARAMETER VerboseOutput
Prints diagnostic output.

.PARAMETER DryRun
Shows the labels that would be applied without changing the issue.

.EXAMPLE
.\scripts\apply-ticket-labels.ps1 -Repo JohnLudlow/agents -TicketNumber 154 -Type task -ConfiguredLabels "enhancement,triage" -InheritedLabels "needs-review" -DryRun
#>
[CmdletBinding(PositionalBinding = $false)]
param(
    [Parameter(Mandatory = $false)]
    [string]$Repo,

    [Parameter(Mandatory = $false)]
    [int]$TicketNumber,

    [Parameter(Mandatory = $false)]
    [string]$Type,

    [Parameter(Mandatory = $false)]
    [string]$ConfiguredLabels,

    [Parameter(Mandatory = $false)]
    [string]$InheritedLabels,

    [Parameter(Mandatory = $false)]
    [string]$UserOverride,

    [switch]$VerboseOutput,

    [switch]$DryRun
)

function Write-VerboseMessage {
    param([string]$Message)
    if ($VerboseOutput) {
        Write-Host $Message
    }
}

function Write-ErrorMessage {
    param([string]$Message)
    [Console]::Error.WriteLine("Error: $Message")
}

function Split-Labels {
    param([AllowNull()][string]$InputLabels)

    if ([string]::IsNullOrWhiteSpace($InputLabels)) {
        return @()
    }

    return $InputLabels.Split(',') |
        ForEach-Object { $_.Trim() } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}

function Get-FinalLabels {
    param(
        [AllowNull()][string]$Override,
        [AllowNull()][string]$Configured,
        [AllowNull()][string]$Inherited,
        [string]$TicketType
    )

    if (-not [string]::IsNullOrWhiteSpace($Override)) {
        return Split-Labels -InputLabels $Override |
            Sort-Object -Unique
    }

    return @(
        Split-Labels -InputLabels $Configured
        Split-Labels -InputLabels $Inherited
        "recon:$TicketType"
    ) |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Sort-Object -Unique
}

function Test-GhAvailable {
    $ghCommand = Get-Command gh -ErrorAction SilentlyContinue
    if ($null -eq $ghCommand) {
        Write-ErrorMessage "GitHub CLI 'gh' is required but was not found in PATH."
        return $false
    }

    return $true
}

function Test-TicketType {
    param([string]$TicketType)

    $validTypes = @('quiz', 'research', 'prototype', 'task')
    if ($validTypes -notcontains $TicketType) {
        Write-ErrorMessage "Invalid --type '$TicketType'. Expected one of: quiz, research, prototype, task."
        return $false
    }

    return $true
}

function Test-RequiredParameters {
    if ([string]::IsNullOrWhiteSpace($Repo) -or $TicketNumber -le 0 -or [string]::IsNullOrWhiteSpace($Type)) {
        Write-ErrorMessage "Missing required parameters. --repo, --ticket-number, and --type are required."
        return $false
    }

    return $true
}

function Test-TicketExists {
    Write-VerboseMessage "Verifying issue #$TicketNumber exists in $Repo"
    & gh issue view $TicketNumber --repo $Repo *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Unable to view issue #$TicketNumber in $Repo. Check the repo, ticket number, authentication, and gh permissions."
        return $false
    }

    return $true
}

function Set-TicketLabels {
    param([string[]]$Labels)

    if ($Labels.Count -eq 0) {
        Write-Host "No labels to apply to issue #$TicketNumber in ${Repo}."
        return $true
    }

    $labelCsv = ($Labels -join ',')
    Write-VerboseMessage "Applying labels: $labelCsv"
    & gh issue edit $TicketNumber --repo $Repo --add-label $labelCsv *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Failed to apply labels to issue #$TicketNumber in $Repo. gh issue edit returned an error."
        return $false
    }

    Write-Host "Applied labels to issue #$TicketNumber in ${Repo}: $labelCsv"
    return $true
}

if (-not (Test-RequiredParameters)) {
    exit 1
}

if (-not (Test-TicketType -TicketType $Type)) {
    exit 1
}

if (-not (Test-GhAvailable)) {
    exit 1
}

$finalLabels = @(Get-FinalLabels -Override $UserOverride -Configured $ConfiguredLabels -Inherited $InheritedLabels -TicketType $Type)
$labelCsv = $finalLabels -join ','

if ($VerboseOutput) {
    if (-not [string]::IsNullOrWhiteSpace($UserOverride)) {
        Write-VerboseMessage 'Using user override labels only.'
    }
    else {
        Write-VerboseMessage "Computed additive label set from configured, inherited, and recon:$Type."
    }

    if ([string]::IsNullOrWhiteSpace($labelCsv)) {
        Write-VerboseMessage 'Final labels: <none>'
    }
    else {
        Write-VerboseMessage "Final labels: $labelCsv"
    }
}

if (-not (Test-TicketExists)) {
    exit 1
}

if ($DryRun) {
    if ([string]::IsNullOrWhiteSpace($labelCsv)) {
        Write-Host "Dry run: would apply labels to issue #$TicketNumber in ${Repo}: <none>"
    }
    else {
        Write-Host "Dry run: would apply labels to issue #$TicketNumber in ${Repo}: $labelCsv"
    }
    exit 0
}

if (-not (Set-TicketLabels -Labels $finalLabels)) {
    exit 1
}

exit 0
