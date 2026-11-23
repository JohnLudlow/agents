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

  It 'records sorted map labels and inherits them into a <_> ticket' -ForEach @('research', 'prototype', 'quiz-requirements', 'quiz-understanding', 'learn', 'prerequisite') {
    $map = Invoke-LabelHelper -Path $script:mapHelper -Parameters @{
      FilePath = $script:mapPath
      Labels   = 'recon:map,planning,area-auth,planning'
      Title    = 'Map'
    }

    $map.Errors | Should -BeNullOrEmpty
    Get-RecordedLabels $script:mapPath | Should -Be @('area-auth', 'planning', 'recon:map')
    $inherited = (Get-RecordedLabels $script:mapPath) -join ','

    $ticket = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
      FilePath        = $script:ticketPath
      Type            = $_
      Labels          = 'type:question,planning'
      InheritedLabels = $inherited
      Parent          = $script:mapPath
    }

    $ticket.Errors | Should -BeNullOrEmpty
    Test-Path -LiteralPath $script:ticketPath | Should -BeTrue
    Get-RecordedLabels $script:ticketPath | Should -Be (@('area-auth', 'planning', 'recon:map', "recon:$_", 'type:question') | Sort-Object -Unique)
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
      FilePath     = $script:mapPath
      Labels       = 'planning'
      UserOverride = 'zeta,priority-high,zeta'
    }

    $result.Errors | Should -BeNullOrEmpty
    Get-RecordedLabels $script:mapPath | Should -Be @('priority-high', 'zeta')
  }

  It 'preserves existing one-line map frontmatter and body when adding labels' {
    [System.IO.File]::WriteAllText($script:mapPath, "---`nstatus: `"Open`"`n---`n# Existing map")
    $result = Invoke-LabelHelper -Path $script:mapHelper -Parameters @{
      FilePath = $script:mapPath
      Labels   = 'planning'
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
      FilePath        = $script:ticketPath
      Type            = 'quiz-requirements'
      Labels          = 'configured'
      InheritedLabels = 'recon:map'
      UserOverride    = 'zeta,priority-high,zeta'
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
      Type     = 'research'
    }

    $result.Errors | Should -BeNullOrEmpty
    Test-Path -LiteralPath $script:ticketPath | Should -BeTrue
    Get-RecordedLabels $script:ticketPath | Should -Be @('recon:research')
  }

  It 'does not create a file for an invalid ticket type' {
    $result = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
      FilePath = $script:ticketPath
      Type     = 'invalid'
    }

    Test-Path -LiteralPath $script:ticketPath | Should -BeFalse
  }

  It 'accepts the documented ConfiguredLabels alias on the issue-management copy' {
    $skillsRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
    $helper = Join-Path $skillsRoot 'jl-issue-management' 'scripts' 'record-markdown-ticket-labels.ps1'
    $result = Invoke-LabelHelper -Path $helper -Parameters @{
      FilePath         = $script:ticketPath
      Type             = 'prerequisite'
      ConfiguredLabels = 'configured'
      InheritedLabels  = 'recon:map'
    }

    $result.Errors | Should -BeNullOrEmpty
    Get-RecordedLabels $script:ticketPath | Should -Be @('configured', 'recon:map', 'recon:prerequisite')
  }

  It 'writes an empty list in the issue-management map copy' {
    $skillsRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
    $helper = Join-Path $skillsRoot 'jl-issue-management' 'scripts' 'record-markdown-map-labels.ps1'
    $result = Invoke-LabelHelper -Path $helper -Parameters @{ FilePath = $script:mapPath }

    $result.Errors | Should -BeNullOrEmpty
    [System.IO.File]::ReadAllText($script:mapPath) | Should -Match '(?m)^labels: \[\]$'
  }

  Context 'historical tickets are not relabeled' {
    BeforeAll {
      $script:skillsRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
      $script:copies = @('jl-recon', 'jl-issue-management') | ForEach-Object {
        Join-Path $script:skillsRoot $_ 'scripts' 'record-markdown-ticket-labels.ps1'
      }
    }

    It 'leaves a historical <_> file byte-for-byte unchanged' -ForEach @('quiz', 'task', 'map', 'Charting', 'Walked', 'Completed', 'Stale') {
      $original = "---`ntype: `"$_`"`nstatus: `"Charting`"`nlabels:`n  - `"legacy`"`n---`nHistorical body`n"
      foreach ($helper in $script:copies) {
        [System.IO.File]::WriteAllText($script:ticketPath, $original)
        $before = [System.IO.File]::ReadAllBytes($script:ticketPath)

        $result = Invoke-LabelHelper -Path $helper -Parameters @{ FilePath = $script:ticketPath; Type = $_; Labels = 'x'; Backup = $true }

        $result.Output | Should -Not -Match 'Recorded labels'
        [System.IO.File]::ReadAllBytes($script:ticketPath) | Should -Be $before
        Test-Path -LiteralPath ($script:ticketPath + '.bak') | Should -BeFalse
      }
    }

    It 'leaves a historical file unchanged for legacy type <_> with an override or dry run' -ForEach @('quiz', 'task') {
      $original = "---`ntype: `"$_`"`nstatus: `"Ready`"`n---`nHistorical body`n"
      foreach ($helper in $script:copies) {
        [System.IO.File]::WriteAllText($script:ticketPath, $original)
        $before = [System.IO.File]::ReadAllBytes($script:ticketPath)
        [void](Invoke-LabelHelper -Path $helper -Parameters @{ FilePath = $script:ticketPath; Type = $_; UserOverride = 'x' })
        [void](Invoke-LabelHelper -Path $helper -Parameters @{ FilePath = $script:ticketPath; Type = $_; DryRun = $true })
        [System.IO.File]::ReadAllBytes($script:ticketPath) | Should -Be $before
      }
    }

    It 'does not rewrite the historical Map status <_> when labels are recorded' -ForEach @('Charting', 'Walked', 'Completed', 'Stale') {
      foreach ($skill in @('jl-recon', 'jl-issue-management')) {
        $helper = Join-Path $script:skillsRoot $skill 'scripts' 'record-markdown-map-labels.ps1'
        [System.IO.File]::WriteAllText($script:mapPath, "---`ntype: `"map`"`nstatus: `"$_`"`n---`nHistorical Map`n")

        $result = Invoke-LabelHelper -Path $helper -Parameters @{ FilePath = $script:mapPath; Labels = 'recon:map' }

        $result.Errors | Should -BeNullOrEmpty
        [System.IO.File]::ReadAllText($script:mapPath) | Should -Match "(?m)^status: `"$_`"\r?$"
      }
    }

    It 'leaves the body of a historical Map (<name>) byte-identical when labels are recorded' -ForEach @(
      @{ name = 'CRLF'; body = "# Old Map`r`n`r`n| Step | Status |`r`n|---|---|`r`n| a | Charting |`r`n" }
      @{ name = 'trailing space'; body = "# Old Map`nTrailing space `n`n" }
      @{ name = 'unicode'; body = "# Old Map`n$([char]0x00E9)$([char]0x00E8) $([char]0x4E2D) text`n" }
      @{ name = 'no final newline'; body = "# Old Map`nlast line" }
    ) {
      $prefix = "---`ntype: `"map`"`nstatus: `"Walked`"`n---`n"
      $utf8 = New-Object System.Text.UTF8Encoding($false)
      foreach ($skill in @('jl-recon', 'jl-issue-management')) {
        $helper = Join-Path $script:skillsRoot $skill 'scripts' 'record-markdown-map-labels.ps1'
        [System.IO.File]::WriteAllText($script:mapPath, $prefix + $body, $utf8)

        $result = Invoke-LabelHelper -Path $helper -Parameters @{ FilePath = $script:mapPath; Labels = 'recon:map' }

        $result.Errors | Should -BeNullOrEmpty
        $after = [System.IO.File]::ReadAllBytes($script:mapPath)
        $text = $utf8.GetString($after)
        $closing = $text.IndexOf("`n---`n", 3)
        $closing | Should -BeGreaterThan 0
        $afterBody = $utf8.GetBytes($text.Substring($closing + 5))
        $afterBody | Should -Be $utf8.GetBytes($body)
      }
    }
  }
}
