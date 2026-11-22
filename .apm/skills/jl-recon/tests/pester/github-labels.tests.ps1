Describe 'GitHub ticket labels' {
    BeforeAll {
        Import-Module Pester -MinimumVersion 6.0 -ErrorAction Stop
        . (Join-Path $PSScriptRoot 'label-helper-harness.ps1')
        $script:githubHelper = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts' 'apply-ticket-labels.ps1'
    }

    It 'combines configured, inherited and required labels once in sorted order for <_>' -ForEach @('quiz', 'research', 'prototype', 'task') {
        $result = Invoke-LabelHelper -Path $script:githubHelper -Parameters @{
            Repo = 'example/repo'
            TicketNumber = 42
            Type = $_
            ConfiguredLabels = 'type:question,planning'
            InheritedLabels = 'planning,recon:map,area-auth'
        }

        $result.Errors | Should -BeNullOrEmpty
        $result.Calls.Count | Should -Be 2
        $result.Calls[0] | Should -Be @('issue', 'view', '42', '--repo', 'example/repo')
        $result.Calls[1] | Should -Be @('issue', 'edit', '42', '--repo', 'example/repo', '--add-label', "area-auth,planning,recon:map,recon:$_,type:question")
    }

    It 'uses only the override, removing existing labels not in it' {
        $result = Invoke-LabelHelper -Path $script:githubHelper -ExistingLabels @('old-label', 'planning') -Parameters @{
            Repo = 'example/repo'
            TicketNumber = 42
            Type = 'task'
            ConfiguredLabels = 'configured'
            InheritedLabels = 'recon:map'
            UserOverride = 'zeta,priority-high,zeta'
        }

        $result.Errors | Should -BeNullOrEmpty
        ($result.Calls | Where-Object { $_[1] -eq 'view' -and $_ -contains '--json' }).Count | Should -BeGreaterThan 0
        $edits = @($result.Calls | Where-Object { $_[1] -eq 'edit' })
        $edits.Count | Should -BeGreaterThan 0
        $removed = @($edits | ForEach-Object {
            $call = $_
            for ($i = 0; $i -lt $call.Count - 1; $i++) {
                if ($call[$i] -eq '--remove-label') { $call[$i + 1] -split ',' }
            }
        })
        $removed | Should -Contain 'old-label'
        $removed | Should -Contain 'planning'
        ($edits | ForEach-Object { $_ -join ' ' }) -join ' ' | Should -Match '--add-label priority-high,zeta'
    }

    It 'applies only the required type label with empty configured and inherited input' {
        $result = Invoke-LabelHelper -Path $script:githubHelper -Parameters @{
            Repo = 'example/repo'
            TicketNumber = 42
            Type = 'research'
        }

        $result.Errors | Should -BeNullOrEmpty
        $result.Calls[1] | Should -Be @('issue', 'edit', '42', '--repo', 'example/repo', '--add-label', 'recon:research')
    }

    It 'does not edit if existing labels cannot be read for an override' {
        $result = Invoke-LabelHelper -Path $script:githubHelper -ExitCodes @{ labels = 1 } -Parameters @{
            Repo = 'example/repo'
            TicketNumber = 42
            Type = 'task'
            UserOverride = 'new-label'
        }

        $result.Calls.Count | Should -Be 2
        $result.Calls[1] | Should -Contain '--json'
    }

    It 'also replaces existing labels in the issue-management copy' {
        $skillsRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
        $helper = Join-Path $skillsRoot 'jl-issue-management' 'scripts' 'apply-ticket-labels.ps1'
        $result = Invoke-LabelHelper -Path $helper -ExistingLabels @('old-label') -Parameters @{
            Repo = 'example/repo'
            TicketNumber = 42
            Type = 'task'
            UserOverride = 'priority-high'
        }

        $result.Errors | Should -BeNullOrEmpty
        $result.Calls[2] | Should -Contain '--remove-label'
        $result.Calls[2] | Should -Contain 'old-label'
        $result.Calls[2] | Should -Contain 'priority-high'
    }

    It 'does not edit when the issue lookup fails' {
        $result = Invoke-LabelHelper -Path $script:githubHelper -ExitCodes @{ view = 1 } -Parameters @{
            Repo = 'example/repo'
            TicketNumber = 42
            Type = 'quiz'
        }

        $result.Calls.Count | Should -Be 1
    }

    It 'does not report success when the issue edit fails' {
        $result = Invoke-LabelHelper -Path $script:githubHelper -ExitCodes @{ edit = 1 } -Parameters @{
            Repo = 'example/repo'
            TicketNumber = 42
            Type = 'task'
        }

        $result.Calls.Count | Should -Be 2
        $result.Output | Should -Not -Match 'Applied labels'
    }

    It 'does not call gh for an invalid ticket type' {
        $result = Invoke-LabelHelper -Path $script:githubHelper -Parameters @{
            Repo = 'example/repo'
            TicketNumber = 42
            Type = 'invalid'
        }

        $result.Calls | Should -BeNullOrEmpty
    }
}
