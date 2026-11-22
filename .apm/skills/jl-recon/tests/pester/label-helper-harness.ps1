function Invoke-LabelHelper {
    param(
        [string]$Path,
        [hashtable]$Parameters,
        [hashtable]$ExitCodes = @{},
        [string[]]$ExistingLabels = @()
    )

    $runspace = [runspacefactory]::CreateRunspace()
    $runspace.Open()
    $calls = [System.Collections.Generic.List[object]]::new()
    $runspace.SessionStateProxy.SetVariable('MockCalls', $calls)
    $runspace.SessionStateProxy.SetVariable('MockExitCodes', $ExitCodes)
    $runspace.SessionStateProxy.SetVariable('MockLabels', $ExistingLabels)
    $runspace.SessionStateProxy.SetVariable('HelperPath', $Path)
    $runspace.SessionStateProxy.SetVariable('HelperParameters', $Parameters)
    $powerShell = [powershell]::Create()
    $powerShell.Runspace = $runspace

    try {
        [void]$powerShell.AddScript(@'
function gh {
    $global:MockCalls.Add([string[]]@($args))
    $verb = if ($args[1] -eq 'view' -and $args -contains '--json') { 'labels' } else { $args[1] }
    $global:LASTEXITCODE = [int]$global:MockExitCodes[$verb]
    if ($args[1] -eq 'view' -and $args -contains '--json') {
        @{ labels = @($global:MockLabels | ForEach-Object { @{ name = $_ } }) } | ConvertTo-Json -Compress -Depth 4
    }
}

function az {
    $global:MockCalls.Add([string[]]@($args))
    $verb = if ($args -contains 'update') { 'update' } elseif ($args -contains 'show') { 'show' } else { 'help' }
    $global:LASTEXITCODE = [int]$global:MockExitCodes[$verb]
}

& $HelperPath @HelperParameters
'@)
        $output = $powerShell.Invoke()
        return [pscustomobject]@{
            Output = ($output | Out-String).Trim()
            Calls  = @($calls.ToArray())
            Errors = @($powerShell.Streams.Error | ForEach-Object { $_.ToString() })
        }
    }
    finally {
        $powerShell.Dispose()
        $runspace.Dispose()
    }
}
