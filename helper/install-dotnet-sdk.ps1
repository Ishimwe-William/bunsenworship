# PowerShell script to download and install .NET SDK for building PowerPoint Helper
# Checks if .NET SDK is installed, and if not, downloads and installs it automatically

$ErrorActionPreference = "Stop"

$DOTNET_CHANNEL = "8.0"
$DOTNET_INSTALL_DIR = "$env:LOCALAPPDATA\Microsoft\dotnet"
$DOTNET_EXECUTABLE = "$DOTNET_INSTALL_DIR\dotnet.exe"

Write-Host "Checking for .NET SDK..." -ForegroundColor Cyan

# 1. Check if global dotnet has an SDK installed
try {
    $globalSdks = & dotnet --list-sdks 2>$null
    if ($globalSdks -and $globalSdks.Count -gt 0) {
        Write-Host "Found global .NET SDK: $($globalSdks[0])" -ForegroundColor Green
        exit 0
    }
} catch {
    # dotnet command not in PATH or failed
}

# 2. Check if local dotnet installation has an SDK
if (Test-Path $DOTNET_EXECUTABLE) {
    try {
        $localSdks = & $DOTNET_EXECUTABLE --list-sdks 2>$null
        if ($localSdks -and $localSdks.Count -gt 0) {
            Write-Host "Found local .NET SDK: $($localSdks[0])" -ForegroundColor Green
            # Ensure current process PATH has it
            $env:DOTNET_ROOT = $DOTNET_INSTALL_DIR
            $env:PATH = "$DOTNET_INSTALL_DIR;$env:PATH"
            exit 0
        }
    } catch {
        Write-Host "Local dotnet.exe found but not functional, reinstalling..." -ForegroundColor Yellow
    }
}

Write-Host ".NET SDK not found. Installing .NET $DOTNET_CHANNEL SDK..." -ForegroundColor Yellow

# Download dotnet-install.ps1 script
$installScript = "$env:TEMP\dotnet-install.ps1"
$installScriptUrl = "https://dot.net/v1/dotnet-install.ps1"

Write-Host "Downloading dotnet-install script..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $installScriptUrl -OutFile $installScript -UseBasicParsing
} catch {
    Write-Host "Failed to download dotnet-install script: $_" -ForegroundColor Red
    exit 1
}

# Run the installation script
Write-Host "Installing .NET SDK (Channel $DOTNET_CHANNEL)..." -ForegroundColor Cyan
try {
    & $installScript -Channel $DOTNET_CHANNEL -InstallDir $DOTNET_INSTALL_DIR
} catch {
    Write-Host "Failed to install .NET SDK: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $installScript -Force -ErrorAction SilentlyContinue
}

# Add to PATH and DOTNET_ROOT for current session
$env:DOTNET_ROOT = $DOTNET_INSTALL_DIR
$env:PATH = "$DOTNET_INSTALL_DIR;$env:PATH"

# Persist to User environment variables
try {
    $currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentUserPath -notlike "*$DOTNET_INSTALL_DIR*") {
        [Environment]::SetEnvironmentVariable("Path", "$DOTNET_INSTALL_DIR;$currentUserPath", "User")
        Write-Host "Added $DOTNET_INSTALL_DIR to User PATH." -ForegroundColor Green
    }
    [Environment]::SetEnvironmentVariable("DOTNET_ROOT", $DOTNET_INSTALL_DIR, "User")
} catch {
    Write-Host "Notice: Could not persist environment variables to registry ($_) - current session updated." -ForegroundColor Yellow
}

# Verify installation and configure NuGet source
if (Test-Path $DOTNET_EXECUTABLE) {
    try {
        $sdks = & $DOTNET_EXECUTABLE --list-sdks 2>&1
        Write-Host "Successfully installed .NET SDK:" -ForegroundColor Green
        Write-Host "$sdks" -ForegroundColor Green
        Write-Host "Location: $DOTNET_INSTALL_DIR" -ForegroundColor Green

        # Ensure nuget.org source exists
        try {
            & $DOTNET_EXECUTABLE nuget add source "https://api.nuget.org/v3/index.json" --name "nuget.org" 2>$null
        } catch {}
    } catch {
        Write-Host "dotnet.exe found but verification failed: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "dotnet.exe not found after installation" -ForegroundColor Red
    exit 1
}

Write-Host "Run 'npm run build:helper' to build the PowerPoint helper." -ForegroundColor Cyan
