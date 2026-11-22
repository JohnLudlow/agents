<#
.SYNOPSIS
Applies deterministic tags to an Azure DevOps map work item via az boards.

.DESCRIPTION
Uses configured tags or a user override to build a sorted unique tag set, validates
Azure CLI availability and work item existence, then updates System.Tags using the
Azure DevOps semicolon-delimited tag format.

.PARAMETER Organization
Azure DevOps organization URL.

.PARAMETER Project
Azure DevOps project name.

.PARAMETER WorkItemId
Map work item ID to update.

.PARAMETER ConfiguredTags
Comma-separated configured tags for the map.

.PARAMETER UserOverride
Comma-separated tags that replace the entire computed tag set.

.PARAMETER VerboseOutput
Prints diagnostic output.

.PARAMETER DryRun
Shows what would be applied without changing the work item.

.EXAMPLE
.\scripts\apply-ado-map-tags.ps1 -Organization https://dev.azure.com/contoso -Project Agents -WorkItemId 123 -ConfiguredTags "map,recon" -DryRun

.NOTES
Requires Azure CLI with the Azure DevOps extension (az boards) available.
#>
[CmdletBinding(PositionalBinding = $false)]
param(
    [Parameter(Mandatory = $false)]
    [string]$Organization,

    [Parameter(Mandatory = $false)]
    [string]$Project,

    [Parameter(Mandatory = $false)]
    [int]$WorkItemId,

    [Parameter(Mandatory = $false)]
    [string]$ConfiguredTags,

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

function Split-Tags {
    param([AllowNull()][string]$InputTags)

    if ([string]::IsNullOrWhiteSpace($InputTags)) {
        return @()
    }

    return $InputTags.Split(',') |
        ForEach-Object { $_.Trim() } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}

function Get-FinalTags {
    param(
        [AllowNull()][string]$Override,
        [AllowNull()][string]$Configured
    )

    if (-not [string]::IsNullOrWhiteSpace($Override)) {
        return Split-Tags -InputTags $Override |
            Sort-Object -Unique
    }

    return Split-Tags -InputTags $Configured |
        Sort-Object -Unique
}

function Test-AzAvailable {
    $azCommand = Get-Command az -ErrorAction SilentlyContinue
    if ($null -eq $azCommand) {
        Write-ErrorMessage "Azure CLI 'az' is required but was not found in PATH."
        return $false
    }

    return $true
}

function Test-AzBoardsExtensionAvailable {
    $result = Invoke-AzCommand -Arguments @(
        'boards', 'work-item', '--help',
        '--only-show-errors'
    )

    if ($result.ExitCode -ne 0) {
        $message = if ($result.Output) { ($result.Output | Out-String).Trim() } else { 'Unknown Azure CLI error.' }
        Write-ErrorMessage "Azure CLI Azure DevOps extension with 'az boards' support is required. $message"
        return $false
    }

    return $true
}

function Test-RequiredParameters {
    if ([string]::IsNullOrWhiteSpace($Organization) -or
        [string]::IsNullOrWhiteSpace($Project) -or
        $WorkItemId -le 0) {
        Write-ErrorMessage "Missing required parameters. --organization, --project, and --work-item-id are required."
        return $false
    }

    return $true
}

function Invoke-AzCommand {
    param([string[]]$Arguments)

    $output = & az @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    return @{
        Output   = $output
        ExitCode = $exitCode
    }
}

function Test-WorkItemExists {
    Write-VerboseMessage "Verifying work item #$WorkItemId exists in project '$Project'."
    $result = Invoke-AzCommand -Arguments @(
        'boards', 'work-item', 'show',
        '--id', $WorkItemId,
        '--org', $Organization,
        '--only-show-errors'
    )

    if ($result.ExitCode -ne 0) {
        $message = if ($result.Output) { ($result.Output | Out-String).Trim() } else { 'Unknown Azure CLI error.' }
        Write-ErrorMessage "Unable to view work item #$WorkItemId. Check the ID, organization, project, authentication, and az boards availability. $message"
        return $false
    }

    return $true
}

function Set-WorkItemTags {
    param([string[]]$Tags)

    $tagValue = $Tags -join ';'
    Write-VerboseMessage "Applying tags: ${tagValue}"

    $result = Invoke-AzCommand -Arguments @(
        'boards', 'work-item', 'update',
        '--id', $WorkItemId,
        '--org', $Organization,
        '--fields', "System.Tags=$tagValue",
        '--only-show-errors'
    )

    if ($result.ExitCode -ne 0) {
        $message = if ($result.Output) { ($result.Output | Out-String).Trim() } else { 'Unknown Azure CLI error.' }
        Write-ErrorMessage "Failed to apply tags to work item #$WorkItemId. $message"
        return $false
    }

    Write-Host "Applied tags to work item #$WorkItemId in project '${Project}': ${tagValue}"
    return $true
}

if (-not (Test-RequiredParameters)) {
    exit 1
}

if (-not (Test-AzAvailable)) {
    exit 1
}

if (-not (Test-AzBoardsExtensionAvailable)) {
    exit 1
}

$finalTags = @(Get-FinalTags -Override $UserOverride -Configured $ConfiguredTags)
$tagValue = $finalTags -join ';'

if ($VerboseOutput) {
    if (-not [string]::IsNullOrWhiteSpace($UserOverride)) {
        Write-VerboseMessage 'Using user override tags only.'
    }
    else {
        Write-VerboseMessage 'Computed final tag set from configured tags.'
    }

    if ([string]::IsNullOrWhiteSpace($tagValue)) {
        Write-VerboseMessage 'Final tags: <none>'
    }
    else {
        Write-VerboseMessage "Final tags: $tagValue"
    }
}

if (-not (Test-WorkItemExists)) {
    exit 1
}

if ($DryRun) {
    Write-Host "Dry run: would apply tags to work item #$WorkItemId in project '${Project}': $(if ([string]::IsNullOrWhiteSpace($tagValue)) { '<none>' } else { $tagValue })"
    exit 0
}

if (-not (Set-WorkItemTags -Tags $finalTags)) {
    exit 1
}

exit 0
