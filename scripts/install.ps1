# Install script for johnludlow agents and skills
# Usage: .\install.ps1

param(
    [switch]$OpenCode,
    [switch]$CopilotCLI,
    [string]$InstallPath,
    [switch]$All
)

# If no options specified, install for all
if (-not $OpenCode -and -not $CopilotCLI -and -not $All) {
    $All = $true
}

if ($All) {
    $OpenCode = $true
    $CopilotCLI = $true
}

# Get default install paths
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $InstallPath) {
    if ($IsLinux -or $IsMacOS) {
        $InstallPath = "$HOME/.local/share/agents"
    } else {
        $InstallPath = "$env:APPDATA\opencode\agents"
    }
}

Write-Host "Installing johnludlow agents and skills to: $InstallPath" -ForegroundColor Green

# Create installation directory
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "Created installation directory" -ForegroundColor Yellow
}

# Install agents
Write-Host "`nInstalling agents..." -ForegroundColor Cyan
$agentDir = Join-Path $scriptPath ".github\agents"
$destAgentDir = Join-Path $InstallPath "agents"

if (-not (Test-Path $destAgentDir)) {
    New-Item -ItemType Directory -Path $destAgentDir -Force | Out-Null
}

Copy-Item "$agentDir\*.md" $destAgentDir -Force
Write-Host "Agents installed to: $destAgentDir" -ForegroundColor Green

# Install skills
Write-Host "`nInstalling skills..." -ForegroundColor Cyan
$skillDir = Join-Path $scriptPath ".github\skills"
$destSkillDir = Join-Path $InstallPath "skills"

if (-not (Test-Path $destSkillDir)) {
    New-Item -ItemType Directory -Path $destSkillDir -Force | Out-Null
}

Copy-Item "$skillDir\*.md" $destSkillDir -Force
Write-Host "Skills installed to: $destSkillDir" -ForegroundColor Green

# Install templates
Write-Host "`nInstalling templates..." -ForegroundColor Cyan
$templateDir = Join-Path $scriptPath "docs\templates"
$destTemplateDir = Join-Path $InstallPath "templates"

if (-not (Test-Path $destTemplateDir)) {
    New-Item -ItemType Directory -Path $destTemplateDir -Force | Out-Null
}

Copy-Item "$templateDir\*.md" $destTemplateDir -Force
Write-Host "Templates installed to: $destTemplateDir" -ForegroundColor Green

# Copilot CLI specific installation
if ($CopilotCLI) {
    Write-Host "`nSetting up Copilot CLI..." -ForegroundColor Cyan
    
    # Check if copilot CLI is installed
    $copilotCLI = Get-Command copilot -ErrorAction SilentlyContinue
    
    if ($copilotCLI) {
        Write-Host "Copilot CLI found at: $($copilotCLI.Source)" -ForegroundColor Green
        Write-Host "Note: Manually configure agents in your Copilot CLI settings" -ForegroundColor Yellow
    } else {
        Write-Host "Copilot CLI not found. Please install it first:" -ForegroundColor Yellow
        Write-Host "  npm install -g @github/copilot-cli" -ForegroundColor Gray
    }
}

# OpenCode specific installation
if ($OpenCode) {
    Write-Host "`nSetting up OpenCode..." -ForegroundColor Cyan
    
    # Check if opencode CLI is installed
    $opencodeCLI = Get-Command opencode -ErrorAction SilentlyContinue
    
    if ($opencodeCLI) {
        Write-Host "OpenCode found at: $($opencodeCLI.Source)" -ForegroundColor Green
        Write-Host "Note: Manually configure agents in your OpenCode settings" -ForegroundColor Yellow
    } else {
        Write-Host "OpenCode not found. Please install it first:" -ForegroundColor Yellow
        Write-Host "  npm install -g @anomalyco/opencode" -ForegroundColor Gray
    }
}

Write-Host "`nInstallation complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Configure your agent tool with the installed agents and skills"
Write-Host "2. Copy relevant agents from $destAgentDir to your tool's agent directory"
Write-Host "3. Copy relevant skills from $destSkillDir to your tool's skills directory"
Write-Host "`nFor more information, see the README.md in the repository"
