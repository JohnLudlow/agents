Describe 'Markdown map and ticket labels' {
    BeforeAll {
        Import-Module Pester -MinimumVersion 6.0 -ErrorAction Stop
        . (Join-Path $PSScriptRoot 'label-helper-harness.ps1')
        $script:scriptRoot = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts'
        $script:mapHelper = Join-Path $script:scriptRoot 'record-markdown-map-labels.ps1'
        $script:ticketHelper = Join-Path $script:scriptRoot 'record-markdown-ticket-labels.ps1'

        function Get-RecordedLabels {
            param([string]$Path)

            $content = [System.IO.File]::ReadAllText($Path)
            $match = [regex]::Match($content, '(?m)^labels:\r?\n((?:  - "[^\r\n]*"\r?\n?)+)')
            if (-not $match.Success) { return @() }
            return @([regex]::Matches($match.Groups[1].Value, '(?m)^  - "([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
        }
    }

    BeforeEach {
        $testDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "recon-labels-$([guid]::NewGuid().ToString('N'))"
        [void][System.IO.Directory]::CreateDirectory($testDirectory)
        $script:mapPath = Join-Path $testDirectory 'map.md'
        $script:ticketPath = Join-Path $testDirectory 'ticket.md'
    }

    AfterEach {
        Remove-Item -LiteralPath (Split-Path -Parent $script:mapPath) -Recurse -Force
    }

    It 'records sorted map labels and inherits them into a <_> ticket' -ForEach @('quiz', 'research', 'prototype', 'task') {
        $map = Invoke-LabelHelper -Path $script:mapHelper -Parameters @{
            FilePath = $script:mapPath
            Labels = 'recon:map,planning,area-auth,planning'
            Title = 'Map'
        }

        $map.Errors | Should -BeNullOrEmpty
        Get-RecordedLabels $script:mapPath | Should -Be @('area-auth', 'planning', 'recon:map')
        $inherited = (Get-RecordedLabels $script:mapPath) -join ','

        $ticket = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
            FilePath = $script:ticketPath
            Type = $_
            Labels = 'type:question,planning'
            InheritedLabels = $inherited
            Parent = $script:mapPath
        }

        $ticket.Errors | Should -BeNullOrEmpty
        Test-Path -LiteralPath $script:ticketPath | Should -BeTrue
        Get-RecordedLabels $script:ticketPath | Should -Be @('area-auth', 'planning', 'recon:map', "recon:$_", 'type:question')
        [System.IO.File]::ReadAllText($script:ticketPath) | Should -Match "(?m)^type: `"$_`"$"
    }

    It 'writes a YAML empty list for an empty map label set' {
        $result = Invoke-LabelHelper -Path $script:mapHelper -Parameters @{ FilePath = $script:mapPath }

        $result.Errors | Should -BeNullOrEmpty
        Test-Path -LiteralPath $script:mapPath | Should -BeTrue
        [System.IO.File]::ReadAllText($script:mapPath) | Should -Match '(?m)^labels: \[\]$'
    }

    It 'replaces map labels with the override' {
        $result = Invoke-LabelHelper -Path $script:mapHelper -Parameters @{
            FilePath = $script:mapPath
            Labels = 'planning'
            UserOverride = 'zeta,priority-high,zeta'
        }

        $result.Errors | Should -BeNullOrEmpty
        Get-RecordedLabels $script:mapPath | Should -Be @('priority-high', 'zeta')
    }

    It 'preserves existing one-line map frontmatter and body when adding labels' {
        [System.IO.File]::WriteAllText($script:mapPath, "---`nstatus: `"Open`"`n---`n# Existing map")
        $result = Invoke-LabelHelper -Path $script:mapHelper -Parameters @{
            FilePath = $script:mapPath
            Labels = 'planning'
        }

        $result.Errors | Should -BeNullOrEmpty
        Get-RecordedLabels $script:mapPath | Should -Be @('planning')
        $content = [System.IO.File]::ReadAllText($script:mapPath)
        $content | Should -Match '(?m)^status: "Open"$'
        $content | Should -Match '(?m)^# Existing map$'
    }

    It 'records only override labels on a ticket, preserving existing content' {
        [System.IO.File]::WriteAllText($script:ticketPath, "---`nstatus: `"Open`"`n---`n# Existing body")
        $result = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
            FilePath = $script:ticketPath
            Type = 'task'
            Labels = 'configured'
            InheritedLabels = 'recon:map'
            UserOverride = 'zeta,priority-high,zeta'
        }

        $result.Errors | Should -BeNullOrEmpty
        Get-RecordedLabels $script:ticketPath | Should -Be @('priority-high', 'zeta')
        $content = [System.IO.File]::ReadAllText($script:ticketPath)
        $content | Should -Match '(?m)^status: "Open"$'
        $content | Should -Match '(?m)^# Existing body$'
    }

    It 'records the required ticket label with no configured or inherited labels' {
        $result = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
            FilePath = $script:ticketPath
            Type = 'research'
        }

        $result.Errors | Should -BeNullOrEmpty
        Test-Path -LiteralPath $script:ticketPath | Should -BeTrue
        Get-RecordedLabels $script:ticketPath | Should -Be @('recon:research')
    }

    It 'does not create a file for an invalid ticket type' {
        $result = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
            FilePath = $script:ticketPath
            Type = 'invalid'
        }

        Test-Path -LiteralPath $script:ticketPath | Should -BeFalse
    }

    It 'accepts the documented ConfiguredLabels alias on the issue-management copy' {
        $skillsRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
        $helper = Join-Path $skillsRoot 'jl-issue-management' 'scripts' 'record-markdown-ticket-labels.ps1'
        $result = Invoke-LabelHelper -Path $helper -Parameters @{
            FilePath = $script:ticketPath
            Type = 'task'
            ConfiguredLabels = 'configured'
            InheritedLabels = 'recon:map'
        }

        $result.Errors | Should -BeNullOrEmpty
        Get-RecordedLabels $script:ticketPath | Should -Be @('configured', 'recon:map', 'recon:task')
    }

    It 'writes an empty list in the issue-management map copy' {
        $skillsRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
        $helper = Join-Path $skillsRoot 'jl-issue-management' 'scripts' 'record-markdown-map-labels.ps1'
        $result = Invoke-LabelHelper -Path $helper -Parameters @{ FilePath = $script:mapPath }

        $result.Errors | Should -BeNullOrEmpty
        [System.IO.File]::ReadAllText($script:mapPath) | Should -Match '(?m)^labels: \[\]$'
    }
}
