Describe 'Azure DevOps map and ticket tags' {
    BeforeAll {
        Import-Module Pester -MinimumVersion 6.0 -ErrorAction Stop
        . (Join-Path $PSScriptRoot 'label-helper-harness.ps1')
        $script:scriptRoot = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts'
        $script:mapHelper = Join-Path $script:scriptRoot 'apply-ado-map-tags.ps1'
        $script:ticketHelper = Join-Path $script:scriptRoot 'apply-ado-ticket-tags.ps1'
    }

    It 'passes sorted map tags to System.Tags, then inherits them on a <_> ticket' -ForEach @('research', 'prototype', 'quiz-requirements', 'quiz-understanding', 'learn', 'prerequisite') {
        $map = Invoke-LabelHelper -Path $script:mapHelper -Parameters @{
            Organization = 'https://dev.azure.com/example'
            Project = 'Agents'
            WorkItemId = 12
            ConfiguredTags = 'recon:map,planning,area-auth,planning'
        }

        $map.Errors | Should -BeNullOrEmpty
        $map.Calls.Count | Should -Be 3
        $map.Calls[2] | Should -Contain 'System.Tags=area-auth;planning;recon:map'
        $inherited = ($map.Calls[2] | Where-Object { $_ -like 'System.Tags=*' }) -replace '^System.Tags=', ''

        $ticket = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
            Organization = 'https://dev.azure.com/example'
            Project = 'Agents'
            WorkItemId = 42
            Type = $_
            ConfiguredTags = 'type:question,planning'
            InheritedTags = $inherited.Replace(';', ',')
        }

        $ticket.Errors | Should -BeNullOrEmpty
        $ticket.Calls.Count | Should -Be 3
        $expectedTags = @('area-auth', 'planning', 'recon:map', "recon:$_", 'type:question') | Sort-Object -Unique
        $ticket.Calls[2] | Should -Contain "System.Tags=$($expectedTags -join ';')"
    }

    It 'replaces configured map tags with the override' {
        $result = Invoke-LabelHelper -Path $script:mapHelper -Parameters @{
            Organization = 'https://dev.azure.com/example'
            Project = 'Agents'
            WorkItemId = 12
            ConfiguredTags = 'planning'
            UserOverride = 'zeta,priority-high,zeta'
        }

        $result.Errors | Should -BeNullOrEmpty
        $result.Calls[2] | Should -Contain 'System.Tags=priority-high;zeta'
    }

    It 'replaces configured, inherited and required ticket tags with the override' {
        $result = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
            Organization = 'https://dev.azure.com/example'
            Project = 'Agents'
            WorkItemId = 42
            Type = 'quiz-requirements'
            ConfiguredTags = 'configured'
            InheritedTags = 'recon:map'
            UserOverride = 'zeta,priority-high,zeta'
        }

        $result.Errors | Should -BeNullOrEmpty
        $result.Calls[2] | Should -Contain 'System.Tags=priority-high;zeta'
    }

    It 'sets an empty map tag field rather than inventing a default' {
        $result = Invoke-LabelHelper -Path $script:mapHelper -Parameters @{
            Organization = 'https://dev.azure.com/example'
            Project = 'Agents'
            WorkItemId = 12
        }

        $result.Errors | Should -BeNullOrEmpty
        $result.Calls[2] | Should -Contain 'System.Tags='
    }

    It 'sets only the required ticket tag with no configured or inherited tags' {
        $result = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
            Organization = 'https://dev.azure.com/example'
            Project = 'Agents'
            WorkItemId = 42
            Type = 'research'
        }

        $result.Errors | Should -BeNullOrEmpty
        $result.Calls[2] | Should -Contain 'System.Tags=recon:research'
    }

    It 'does not update tags when the work item lookup fails' {
        $result = Invoke-LabelHelper -Path $script:ticketHelper -ExitCodes @{ show = 1 } -Parameters @{
            Organization = 'https://dev.azure.com/example'
            Project = 'Agents'
            WorkItemId = 42
            Type = 'learn'
        }

        $result.Calls.Count | Should -Be 2
        $result.Calls[1] | Should -Contain 'show'
    }

    It 'does not report success when tag update fails' {
        $result = Invoke-LabelHelper -Path $script:ticketHelper -ExitCodes @{ update = 1 } -Parameters @{
            Organization = 'https://dev.azure.com/example'
            Project = 'Agents'
            WorkItemId = 42
            Type = 'prerequisite'
        }

        $result.Calls.Count | Should -Be 3
        $result.Output | Should -Not -Match 'Applied tags'
    }

    It 'rejects unsupported ticket type <_> before contacting az' -ForEach @('quiz', 'task', 'invalid') {
        $result = Invoke-LabelHelper -Path $script:ticketHelper -Parameters @{
            Organization = 'https://dev.azure.com/example'
            Project = 'Agents'
            WorkItemId = 42
            Type = $_
        }

        $result.Calls | Should -BeNullOrEmpty
        $helperLiteral = "'" + $script:ticketHelper.Replace("'", "''") + "'"
        $typeLiteral = "'" + $_.Replace("'", "''") + "'"
        $command = "function az { throw 'Unexpected az call' }; & $helperLiteral -Organization 'https://dev.azure.com/example' -Project 'Agents' -WorkItemId 42 -Type $typeLiteral"
        $diagnostic = & pwsh -NoLogo -NoProfile -Command $command 2>&1
        $LASTEXITCODE | Should -Be 1
        $diagnostic | Should -Match "Invalid --type '$_'"
    }
}
