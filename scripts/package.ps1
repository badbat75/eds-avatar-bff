#!/usr/bin/env pwsh
# PowerShell script to build and package eds-avatar-bff for distribution

param(
    [switch]$SkipBuild = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Get project root directory
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectRoot

try {
    Write-Host "📦 Packaging eds-avatar-bff..." -ForegroundColor Green

    # Get git commit hash
    $GitCommit = git rev-parse --short HEAD
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get git commit hash"
    }

    $ArchiveName = "..\eds-avatar-bff_$GitCommit.tar.xz"
    Write-Host "Creating archive: $ArchiveName" -ForegroundColor Yellow

    # Build the project unless skipped
    if (-not $SkipBuild) {
        Write-Host "🔨 Building project..." -ForegroundColor Blue
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }
    }

    # Check if dist directory exists
    if (-not (Test-Path "dist")) {
        throw "dist directory not found. Run build first or use without -SkipBuild flag."
    }

    # Remove existing archive if it exists
    if (Test-Path $ArchiveName) {
        Remove-Item $ArchiveName -Force
        Write-Host "Removed existing archive" -ForegroundColor Yellow
    }

    # Create tar.xz archive
    Write-Host "📦 Creating tar.xz archive..." -ForegroundColor Blue

    # Use Windows built-in tar with xz compression (Windows 10+ version 1809+)
    try {
        & tar.exe -cJf "$ArchiveName" dist prompts package.json package-lock.json .env.example
        if ($LASTEXITCODE -ne 0) {
            throw "tar command failed with exit code $LASTEXITCODE"
        }
    } catch {
        throw "Failed to create tar.xz archive: $($_.Exception.Message)"
    }

    # Get archive size
    $ArchiveSize = [math]::Round((Get-Item $ArchiveName).Length / 1MB, 2)

    Write-Host "✅ Package created successfully!" -ForegroundColor Green
    Write-Host "📁 Archive: $ArchiveName ($ArchiveSize MB)" -ForegroundColor Cyan
    Write-Host "🚀 Ready for distribution!" -ForegroundColor Green

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
