# Build script for PowerPoint Helper
# Builds the .NET console app and prepares it for bundling with Electron

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$helperDir = Join-Path $scriptDir "PowerPointHelper"
$outputDir = Join-Path $scriptDir "build"

Write-Host "Building PowerPoint Helper..." -ForegroundColor Green

# Locate dotnet executable with an SDK
$dotnetCmd = "dotnet"
$localDotnetDir = "$env:LOCALAPPDATA\Microsoft\dotnet"
$localDotnet = "$localDotnetDir\dotnet.exe"
$hasSdk = $false

# 1. Check if global dotnet has an SDK
try {
    $sdks = & dotnet --list-sdks 2>$null
    if ($sdks -and $sdks.Count -gt 0) {
        $hasSdk = $true
        $dotnetCmd = "dotnet"
    }
} catch {}

# 2. Check if local dotnet has an SDK
if (-not $hasSdk -and (Test-Path $localDotnet)) {
    try {
        $sdks = & $localDotnet --list-sdks 2>$null
        if ($sdks -and $sdks.Count -gt 0) {
            $hasSdk = $true
            $dotnetCmd = $localDotnet
            $env:DOTNET_ROOT = $localDotnetDir
            $env:PATH = "$localDotnetDir;$env:PATH"
        }
    } catch {}
}

# 3. If still no SDK, run install-dotnet-sdk.ps1
if (-not $hasSdk) {
    Write-Host ".NET SDK not found. Running helper/install-dotnet-sdk.ps1..." -ForegroundColor Yellow
    & "$scriptDir\install-dotnet-sdk.ps1"
    if (Test-Path $localDotnet) {
        $dotnetCmd = $localDotnet
        $env:DOTNET_ROOT = $localDotnetDir
        $env:PATH = "$localDotnetDir;$env:PATH"
    }
}

# Clean output directory
if (Test-Path $outputDir) {
    Remove-Item -Path $outputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $outputDir | Out-Null

# Build the .NET project
Push-Location $helperDir
try {
    & $dotnetCmd publish -c Release -r win-x64 --self-contained true -o $outputDir
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet publish failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

# Verify the executable was created
$exePath = Join-Path $outputDir "PowerPointHelper.exe"
if (-not (Test-Path $exePath)) {
    throw "PowerPointHelper.exe was not created at $exePath"
}

Write-Host "Build complete: $exePath" -ForegroundColor Green
Write-Host "File size: $((Get-Item $exePath).Length / 1MB) MB" -ForegroundColor Cyan
