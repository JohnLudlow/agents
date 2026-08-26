<#
.SYNOPSIS
Records deterministic labels in markdown YAML frontmatter for map files.
#>
[CmdletBinding(PositionalBinding = $false)]
param(
    [string]$FilePath,
    [string]$Labels,
    [string]$UserOverride,
    [string]$Title,
    [string]$Description,
    [switch]$VerboseOutput,
    [switch]$DryRun,
    [switch]$Backup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-VerboseMessage { param([string]$Message) if ($VerboseOutput) { Write-Host $Message } }
function Write-ErrorMessage { param([string]$Message) [Console]::Error.WriteLine("Error: $Message") }

function Split-LabelList {
    param([AllowNull()][string]$InputLabels)
    if ([string]::IsNullOrWhiteSpace($InputLabels)) { return @() }
    return @($InputLabels.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Sort-Object -Unique)
}

function ConvertTo-YamlScalar {
    param([AllowNull()][object]$Value)
    if ($null -eq $Value) { return 'null' }
    if ($Value -is [bool]) { return $Value.ToString().ToLowerInvariant() }
    if ($Value -is [ValueType] -and -not ($Value -is [char])) { return [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, '{0}', $Value) }
    return '"' + ([string]$Value).Replace('\', '\\').Replace('"', '\"') + '"'
}

function Parse-YamlScalar {
    param([string]$Text)
    $trimmed = $Text.Trim()
    if ($trimmed -eq 'null') { return $null }
    if ($trimmed -eq 'true') { return $true }
    if ($trimmed -eq 'false') { return $false }
    if ($trimmed.StartsWith('"') -and $trimmed.EndsWith('"')) { return $trimmed.Substring(1, $trimmed.Length - 2).Replace('\"', '"').Replace('\\', '\') }
    if ($trimmed.StartsWith('[') -and $trimmed.EndsWith(']')) {
        $inner = $trimmed.Substring(1, $trimmed.Length - 2).Trim()
        if ([string]::IsNullOrWhiteSpace($inner)) { return @() }
        return @($inner.Split(',') | ForEach-Object { Parse-YamlScalar -Text $_ })
    }
    return $trimmed
}

function Parse-Frontmatter {
    param([AllowNull()][string]$Content)

    $result = @{
        Frontmatter = [ordered]@{}
        Body = ''
    }

    if ([string]::IsNullOrEmpty($Content)) { return $result }

    $normalized = $Content.Replace("`r`n", "`n").Replace("`r", "`n").TrimEnd("`n")
    $match = [regex]::Match($normalized, '^(?s)---\n(.*?)\n---(?:\n(.*))?$')
    if (-not $match.Success) {
        if ($normalized.StartsWith('---')) {
            throw "Frontmatter opening delimiter found but closing '---' is missing."
        }
        $result.Body = $normalized
        return $result
    }

    $frontmatterText = $match.Groups[1].Value
    $result.Body = $match.Groups[2].Value
    $lines = if ([string]::IsNullOrEmpty($frontmatterText)) { @() } else { @($frontmatterText -split "`n") }

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) { continue }
        if ($line.StartsWith(' ') -or $line.StartsWith("`t")) { throw "Invalid YAML indentation near line '$line'." }
        $separatorIndex = $line.IndexOf(':')
        if ($separatorIndex -lt 0) { throw "Invalid YAML line '$line'. Expected key: value." }

        $key = $line.Substring(0, $separatorIndex).Trim()
        $valueText = $line.Substring($separatorIndex + 1).Trim()

        if ([string]::IsNullOrWhiteSpace($valueText)) {
            $items = @()
            while (($i + 1) -lt $lines.Count -and $lines[$i + 1].StartsWith('  - ')) {
                $i++
                $items += ,(Parse-YamlScalar -Text $lines[$i].Substring(4))
            }
            $result.Frontmatter[$key] = $items
            continue
        }

        $result.Frontmatter[$key] = Parse-YamlScalar -Text $valueText
    }

    return $result
}

function ConvertTo-YamlLines {
    param($Frontmatter)
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($entry in $Frontmatter.GetEnumerator()) {
        $key = [string]$entry.Key
        $value = $entry.Value
        if ($value -is [System.Collections.IEnumerable] -and -not ($value -is [string])) {
            $items = @($value)
            if ($items.Count -eq 0) { $lines.Add("${key}: []"); continue }
            $lines.Add("${key}:")
            foreach ($item in $items) { $lines.Add("  - $(ConvertTo-YamlScalar -Value $item)") }
            continue
        }
        $lines.Add("${key}: $(ConvertTo-YamlScalar -Value $value)")
    }
    return $lines
}

function Get-FileEncoding {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return New-Object System.Text.UTF8Encoding($false) }
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { return New-Object System.Text.UTF8Encoding($true) }
    return New-Object System.Text.UTF8Encoding($false)
}

try {
    if ([string]::IsNullOrWhiteSpace($FilePath)) { throw "--file-path is required." }

    $resolvedPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($FilePath)
    $labelsToUse = if (-not [string]::IsNullOrWhiteSpace($UserOverride)) { $UserOverride } else { $Labels }
    $finalLabels = Split-LabelList -InputLabels $labelsToUse
    Write-VerboseMessage "Final labels: $(if ($finalLabels.Count) { $finalLabels -join ', ' } else { '<none>' })"

    $exists = Test-Path -LiteralPath $resolvedPath
    $content = if ($exists) { [System.IO.File]::ReadAllText($resolvedPath) } else { '' }
    $encoding = Get-FileEncoding -Path $resolvedPath
    $parsed = Parse-Frontmatter -Content $content
    $frontmatter = [ordered]@{}
    foreach ($key in $parsed.Frontmatter.Keys) { $frontmatter[$key] = $parsed.Frontmatter[$key] }
    if (-not $frontmatter.Contains('title') -and -not [string]::IsNullOrWhiteSpace($Title)) { $frontmatter['title'] = $Title }
    if (-not $frontmatter.Contains('description') -and -not [string]::IsNullOrWhiteSpace($Description)) { $frontmatter['description'] = $Description }
    $frontmatter['labels'] = $finalLabels

    $body = if ($exists) { $parsed.Body } else { "`n" }
    $yamlLines = ConvertTo-YamlLines -Frontmatter $frontmatter
    $document = @('---') + $yamlLines + @('---', $body)
    $document = $document -join "`n"

    if ($DryRun) { Write-Host $document; exit 0 }

    $directory = Split-Path -Path $resolvedPath -Parent
    if ($directory -and -not (Test-Path -LiteralPath $directory)) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
    if ($Backup -and $exists) { Copy-Item -LiteralPath $resolvedPath -Destination ($resolvedPath + '.bak') -Force }
    [System.IO.File]::WriteAllText($resolvedPath, $document, $encoding)
    Write-Host "Recorded labels in $resolvedPath"
    exit 0
}
catch {
    Write-ErrorMessage $_.Exception.Message
    exit 1
}
