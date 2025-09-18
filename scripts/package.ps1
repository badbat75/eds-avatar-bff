#!/usr/bin/env pwsh
# PowerShell script to build and package eds-avatar-bff for distribution

param(
    [switch]$SkipBuild = $false,
    [string]$DeploymentType = "code"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Get project root directory
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectRoot

try {
    Write-Host "📦 Packaging eds-avatar-bff ($DeploymentType deployment)..." -ForegroundColor Green

    # Get git commit hash
    $GitCommit = git rev-parse --short HEAD
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get git commit hash"
    }

    $ArchiveName = "..\eds-avatar-bff_${GitCommit}_${DeploymentType}.tar.xz"
    Write-Host "Creating archive: $ArchiveName" -ForegroundColor Yellow

    # Build the project unless skipped (only for code or all deployments)
    if (-not $SkipBuild -and ($DeploymentType -eq "code" -or $DeploymentType -eq "all")) {
        Write-Host "🔨 Building project..." -ForegroundColor Blue
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }
    }

    # Check if dist directory exists (only for code or all deployments)
    if (($DeploymentType -eq "code" -or $DeploymentType -eq "all") -and -not (Test-Path "dist")) {
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
        # Build file list based on deployment type
        $filesToInclude = @()

        switch ($DeploymentType) {
            "prompt" {
                $filesToInclude = @("prompts")
                if (Test-Path "package.json") { $filesToInclude += "package.json" }
                if (Test-Path ".env.example") { $filesToInclude += ".env.example" }
            }
            "code" {
                $filesToInclude = @("dist", "package.json")
                if (Test-Path "package-lock.json") { $filesToInclude += "package-lock.json" }
                if (Test-Path ".env.example") { $filesToInclude += ".env.example" }
            }
            "all" {
                $filesToInclude = @("dist", "prompts", "package.json")
                if (Test-Path "package-lock.json") { $filesToInclude += "package-lock.json" }
                if (Test-Path ".env.example") { $filesToInclude += ".env.example" }
            }
        }

        # Filter out files that don't exist
        $existingFiles = $filesToInclude | Where-Object { Test-Path $_ }

        if ($existingFiles.Count -eq 0) {
            throw "No files found to package for $DeploymentType deployment"
        }

        Write-Host "Including files: $($existingFiles -join ', ')" -ForegroundColor Cyan

        & tar.exe -cJf "$ArchiveName" @existingFiles
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
