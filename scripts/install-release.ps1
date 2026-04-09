#Requires -Version 5.1
<#
.SYNOPSIS
    Downloads, extracts, and installs @johnludlow/agents from a GitHub release.

.DESCRIPTION
    This script simplifies installation of @johnludlow/agents by:
    - Detecting the appropriate release asset for your system
    - Downloading the NPM package (.tgz)
    - Extracting and installing it locally or globally
    - Verifying the installation

.PARAMETER Version
    The release version to install (e.g., "1.0.0"). Defaults to "latest".

.PARAMETER Global
    Install globally instead of locally in the current directory.

.PARAMETER WorkingDirectory
    Temporary directory for downloads and extraction. Defaults to system temp.

.EXAMPLE
    # Install latest version locally
    ./install-release.ps1

    # Install specific version globally
    ./install-release.ps1 -Version "1.0.0" -Global

.NOTES
    Prerequisites:
    - PowerShell 5.1 or later
    - Node.js 22.0.0 or later
    - npm
#>

param(
    [string]$Version = "latest",
    [switch]$Global,
    [string]$WorkingDirectory = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ============================================================================
# Configuration
# ============================================================================

$REPO = "JohnLudlow/agents"
$PACKAGE_NAME = "@johnludlow/agents"
$GITHUB_API = "https://api.github.com/repos/$REPO"
$MIN_NODE_VERSION = "22.0.0"

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n$('=' * 70)" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "$('=' * 70)`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Compare-SemanticVersion {
    param([string]$Version1, [string]$Version2)
    
    $v1Parts = $Version1 -split '\.' | ForEach-Object { [int]$_ }
    $v2Parts = $Version2 -split '\.' | ForEach-Object { [int]$_ }
    
    for ($i = 0; $i -lt [Math]::Max($v1Parts.Count, $v2Parts.Count); $i++) {
        $v1 = if ($i -lt $v1Parts.Count) { $v1Parts[$i] } else { 0 }
        $v2 = if ($i -lt $v2Parts.Count) { $v2Parts[$i] } else { 0 }
        
        if ($v1 -lt $v2) { return -1 }
        if ($v1 -gt $v2) { return 1 }
    }
    return 0
}

function Test-NodeVersion {
    Write-Host "Checking Node.js version..."
    
    if (-not (Test-Command "node")) {
        Write-Error "Node.js is not installed or not in PATH"
        Write-Host "Please install Node.js $MIN_NODE_VERSION or later from https://nodejs.org/"
        exit 1
    }
    
    $nodeVersion = & node --version
    $nodeVersion = $nodeVersion.TrimStart('v')
    
    if ((Compare-SemanticVersion $nodeVersion $MIN_NODE_VERSION) -lt 0) {
        Write-Error "Node.js version $nodeVersion is below minimum required version $MIN_NODE_VERSION"
        exit 1
    }
    
    Write-Success "Node.js $nodeVersion is compatible"
}

function Test-NPM {
    Write-Host "Checking npm..."
    
    if (-not (Test-Command "npm")) {
        Write-Error "npm is not installed or not in PATH"
        exit 1
    }
    
    $npmVersion = & npm --version
    Write-Success "npm $npmVersion is available"
}

function Get-ReleaseInfo {
    param([string]$Version)
    
    Write-Host "Fetching release information from GitHub..."
    
    try {
        if ($Version -eq "latest") {
            $url = "$GITHUB_API/releases/latest"
        } else {
            $url = "$GITHUB_API/releases/tags/v$Version"
        }
        
        $release = Invoke-RestMethod -Uri $url -Headers @{
            "Accept" = "application/vnd.github.v3+json"
            "User-Agent" = "PowerShell-$PSVersion"
        }
        
        return $release
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Error "Release version '$Version' not found"
        } else {
            Write-Error "Failed to fetch release information: $($_.Exception.Message)"
        }
        exit 1
    }
}

function Get-DownloadUrl {
    param([object]$Release)
    
    Write-Host "Looking for NPM package in release assets..."
    
    $asset = $Release.assets | Where-Object { $_.name -match '\.tgz$' } | Select-Object -First 1
    
    if (-not $asset) {
        Write-Error "No NPM package (.tgz) found in release assets"
        Write-Host "Available assets:"
        $Release.assets | ForEach-Object { Write-Host "  - $($_.name)" }
        exit 1
    }
    
    Write-Success "Found package: $($asset.name)"
    return $asset.browser_download_url
}

function New-TempDirectory {
    $tempPath = if ($WorkingDirectory) { 
        Join-Path $WorkingDirectory "johnludlow-agents-install-$(Get-Random)"
    } else {
        Join-Path $env:TEMP "johnludlow-agents-install-$(Get-Random)"
    }
    
    $null = New-Item -ItemType Directory -Path $tempPath -Force
    return $tempPath
}

function Invoke-Download {
    param([string]$Url, [string]$Destination)
    
    Write-Host "Downloading from $Url..."
    
    try {
        $ProgressPreference = "Continue"
        Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
        $ProgressPreference = "SilentlyContinue"
        Write-Success "Downloaded to $Destination"
    } catch {
        Write-Error "Failed to download package: $($_.Exception.Message)"
        exit 1
    }
}

function Invoke-Extract {
    param([string]$TgzFile, [string]$ExtractPath)
    
    Write-Host "Extracting package..."
    
    try {
        # Use tar if available (PowerShell 7+) or fall back to 7-zip
        if (Get-Command tar -ErrorAction SilentlyContinue) {
            & tar -xzf $TgzFile -C $ExtractPath
        } else {
            # Try 7-Zip
            if (Get-Command 7z -ErrorAction SilentlyContinue) {
                & 7z x $TgzFile -o"$ExtractPath" -y | Out-Null
                # Extract tar from the resulting tar file
                $tarFile = Join-Path $ExtractPath "package.tar"
                if (Test-Path $tarFile) {
                    & 7z x $tarFile -o"$ExtractPath" -y | Out-Null
                    Remove-Item $tarFile -Force
                }
            } else {
                Write-Error "Neither tar nor 7-Zip found for extraction"
                Write-Host "Please install 7-Zip or upgrade to PowerShell 7+ with tar support"
                exit 1
            }
        }
        Write-Success "Extracted to $ExtractPath"
    } catch {
        Write-Error "Failed to extract package: $($_.Exception.Message)"
        exit 1
    }
}

function Invoke-NPMInstall {
    param([string]$PackagePath, [switch]$IsGlobal)
    
    Write-Host "Installing package with npm..."
    
    try {
        $installArgs = @()
        if ($IsGlobal) {
            $installArgs += "--global"
        }
        $installArgs += $PackagePath
        
        & npm install @installArgs
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "npm install failed with exit code $LASTEXITCODE"
            exit 1
        }
        
        Write-Success "Package installed successfully"
    } catch {
        Write-Error "Failed to install package: $($_.Exception.Message)"
        exit 1
    }
}

function Verify-Installation {
    Write-Host "Verifying installation..."
    
    try {
        $output = & npm list $PACKAGE_NAME 2>$null
        
        if ($LASTEXITCODE -eq 0 -and $output -match $PACKAGE_NAME) {
            Write-Success "Installation verified"
            return $true
        } else {
            Write-Warning "Could not verify installation. Please run: npm list $PACKAGE_NAME"
            return $false
        }
    } catch {
        Write-Warning "Could not verify installation: $($_.Exception.Message)"
        return $false
    }
}

function Show-PostInstallInstructions {
    Write-Header "Installation Complete!"
    
    Write-Host "Next steps:"
    Write-Host ""
    Write-Host "1. Verify installation:"
    Write-Host "   npm list @johnludlow/agents" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. Use the agents in your projects:"
    Write-Host "   - OpenCode: /agent johnludlow-feature-planner" -ForegroundColor Yellow
    Write-Host "   - Copilot: copilot chat -a johnludlow-feature-planner" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. For more information:"
    Write-Host "   - View README: https://github.com/$REPO#readme" -ForegroundColor Yellow
    Write-Host "   - View documentation: https://github.com/$REPO/blob/main/docs/" -ForegroundColor Yellow
    Write-Host ""
}

function Cleanup {
    param([string]$TempDir)
    
    if ($TempDir -and (Test-Path $TempDir)) {
        Write-Host "Cleaning up temporary files..."
        Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ============================================================================
# Main Installation Flow
# ============================================================================

Write-Header "Installing $PACKAGE_NAME"

# Validate prerequisites
Test-NodeVersion
Test-NPM

# Fetch release information
$release = Get-ReleaseInfo -Version $Version
Write-Success "Found release: $($release.tag_name) - $($release.name)"

# Get download URL
$downloadUrl = Get-DownloadUrl -Release $release

# Create temporary directory
$tempDir = New-TempDirectory
Write-Success "Created temporary directory: $tempDir"

try {
    # Download package
    $packageFile = Join-Path $tempDir "package.tgz"
    Invoke-Download -Url $downloadUrl -Destination $packageFile
    
    # Extract package
    $extractDir = Join-Path $tempDir "extracted"
    $null = New-Item -ItemType Directory -Path $extractDir -Force
    Invoke-Extract -TgzFile $packageFile -ExtractPath $extractDir
    
    # Find the package directory (usually "package")
    $packageDir = Join-Path $extractDir "package"
    if (-not (Test-Path $packageDir)) {
        # If no package subdirectory, use the extract directory
        $packageDir = $extractDir
    }
    
    # Install with npm
    Invoke-NPMInstall -PackagePath $packageDir -IsGlobal:$Global
    
    # Verify installation
    $verified = Verify-Installation
    
    # Show post-install instructions
    Show-PostInstallInstructions
    
    exit 0
    
} finally {
    # Always cleanup
    Cleanup -TempDir $tempDir
}
