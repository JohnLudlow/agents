param(
    [Parameter(Mandatory=$true)] [string]$IncitingIssue,
    [Parameter(Mandatory=$true)] [string]$Title,
    [string]$Body = "",
    [string[]]$Labels = @("recon:map"),
    [string]$Repo = ""
)
# Creates a Recon map as a native sub-issue of the inciting issue.
$ghArgs = @(
  "issue", "create",
  "--title" ,$Title,
  "--parent" ,$IncitingIssue
)

if ($Body) {
  $ghArgs += @("--body",$Body)
}

foreach ($l in $Labels) {
  $ghArgs += @("--label",$l)
}

if ($Repo) {
  $ghArgs += @("--repo",$Repo)
}

& gh @ghArgs
