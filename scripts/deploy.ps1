#!/usr/bin/env pwsh
# deploy.ps1 - Deploy eds-avatar-bff to remote server
# Usage: .\scripts\deploy.ps1 [-ConfigFile <path>] [-SkipBuild] [-DryRun]

param(
    [string]$ConfigFile = "$PSScriptRoot\deploy.conf",
    [switch]$SkipBuild = $false,
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$DebugPreference = "SilentlyContinue"
$VerbosePreference = "SilentlyContinue"

# Setup logging directory and file path early
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logDir = Join-Path $ProjectRoot "logs"
$logFile = Join-Path $logDir "deploy-$timestamp.log"

# Create logs directory if it doesn't exist
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Function to write only to log file
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"

    # Only write to log file
    try {
        Add-Content -Path $logFile -Value $logEntry -ErrorAction SilentlyContinue
    } catch {
        # Fallback if log file is locked - silent failure
    }
}

# Function to write only to log file (for detailed output)
function Write-LogOnly {
    param([string]$Message, [string]$Level = "INFO")
    $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"

    try {
        Add-Content -Path $logFile -Value $logEntry -ErrorAction SilentlyContinue
    } catch {
        # Fallback if log file is locked
        Write-Warning "Failed to write to log file: $_"
    }
}

# Function to show deployment steps on stdout and log to file
function Write-Step {
    param([string]$Message)
    # Show step on console
    Write-Host "▶ $Message"
    # Also log to file
    Write-Log $Message "STEP"
}

# Function to show completion message on stdout and log to file
function Write-Complete {
    param([string]$Message)
    # Show completion on console
    Write-Host "✓ $Message" -ForegroundColor Green
    # Also log to file
    Write-Log $Message "SUCCESS"
}

# Silent output functions (log only)
function Write-Info { param([string]$Message) Write-Log $Message "INFO" }
function Write-Success { param([string]$Message) Write-Log $Message "SUCCESS" }
function Write-Error { param([string]$Message) Write-Log $Message "ERROR" }
function Write-Warning { param([string]$Message) Write-Log $Message "WARNING" }
function Write-DryRun { param([string]$Message) Write-Log "[DRY RUN] $Message" "DRY-RUN" }

Write-Log "EDS Avatar BFF - Deployment Script Started"
Write-Log ""

# Load configuration
if (-not (Test-Path $ConfigFile)) {
    Write-Log "Configuration file not found: $ConfigFile" "ERROR"
    Write-Log "Please create a configuration file based on deploy.conf.example" "ERROR"
    exit 1
}

Write-Log "Loading configuration from: $ConfigFile"
$config = @{}
Get-Content $ConfigFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $key = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        if ($value) {
            $config[$key] = $value
        }
    }
}

# Validate required configuration
$requiredKeys = @('SSH_HOST', 'SSH_USER', 'REMOTE_DEPLOY_DIR', 'DEPLOY_USER')
foreach ($key in $requiredKeys) {
    if (-not $config.ContainsKey($key) -or -not $config[$key]) {
        Write-Log "Missing required configuration: $key" "ERROR"
        exit 1
    }
}

# Set defaults for optional configuration
if (-not $config.ContainsKey('SSH_PORT')) { $config['SSH_PORT'] = '22' }
if (-not $config.ContainsKey('BUILD_OUTPUT')) { $config['BUILD_OUTPUT'] = 'dist' }
if (-not $config.ContainsKey('PACKAGE_NAME')) { $config['PACKAGE_NAME'] = 'eds-avatar-bff' }
if (-not $config.ContainsKey('BACKUP_DIR')) { $config['BACKUP_DIR'] = '/var/backups/eds-avatar-bff' }
if (-not $config.ContainsKey('KEEP_BACKUPS')) { $config['KEEP_BACKUPS'] = '5' }
if (-not $config.ContainsKey('REMOTE_NODE_ENV')) { $config['REMOTE_NODE_ENV'] = 'production' }

# Display configuration
Write-Info "Deployment Configuration:"
Write-Info "  Host: $($config['SSH_USER'])@$($config['SSH_HOST']):$($config['SSH_PORT'])"
Write-Info "  Deploy to: $($config['REMOTE_DEPLOY_DIR'])"
Write-Info "  Backup to: $($config['BACKUP_DIR'])"
Write-Info ""

if ($DryRun) {
    Write-Warning "Running in DRY RUN mode - no actual changes will be made"
    Write-Info ""
}

# Change to project directory for building
Push-Location $ProjectRoot

$backupFile = $null  # Initialize to avoid undefined variable error

Write-Log "Deployment started from: $env:COMPUTERNAME by $env:USERNAME"
Write-Log "Log file: $logFile"

# Function to execute SSH commands with verbose logging
function Invoke-SSHCommand {
    param(
        [string]$Command,
        [string]$StepName,
        [bool]$IgnoreErrors = $false
    )

    Write-Log "Executing SSH command for: $StepName"
    Write-Log "Command: $Command"

    # Setup remote log file
    $remoteLogFile = "/tmp/eds-avatar-deploy-$timestamp.log"

    # Build SSH arguments (no verbose flags)
    $sshArgs = @()
    $sshArgs += "-p"
    $sshArgs += $config['SSH_PORT']

    if ($config.ContainsKey('SSH_KEY_PATH') -and $config['SSH_KEY_PATH']) {
        $sshArgs += "-i"
        $sshArgs += $config['SSH_KEY_PATH']
    }

    $sshArgs += "$($config['SSH_USER'])@$($config['SSH_HOST'])"

    # Wrap command with logging
    $wrappedCommand = "echo '=== $StepName started at \$(date) ===' >> $remoteLogFile && " +
                     "($Command) 2>&1 | tee -a $remoteLogFile && " +
                     "echo '=== $StepName completed at \$(date) ===' >> $remoteLogFile"

    $sshArgs += $wrappedCommand

    if (-not $DryRun) {
        Write-Log "Executing: $StepName"

        # Execute command and capture output
        $output = & ssh $sshArgs 2>&1
        $exitCode = $LASTEXITCODE

        # Log all output to file only
        foreach ($line in $output) {
            Write-LogOnly "REMOTE: $line"
        }

        Write-LogOnly "SSH command exit code: $exitCode"

        if ($exitCode -ne 0 -and -not $IgnoreErrors) {
            # Download remote log for debugging
            $scpArgs = @()
            $scpArgs += "-P"
            $scpArgs += $config['SSH_PORT']
            if ($config.ContainsKey('SSH_KEY_PATH') -and $config['SSH_KEY_PATH']) {
                $scpArgs += "-i"
                $scpArgs += $config['SSH_KEY_PATH']
            }
            $scpArgs += "$($config['SSH_USER'])@$($config['SSH_HOST']):$remoteLogFile"
            $scpArgs += (Join-Path $logDir "remote-$timestamp.log")

            & scp $scpArgs 2>$null

            throw "SSH command failed with exit code $exitCode"
        }
    } else {
        Write-DryRun "SSH command: $wrappedCommand"
    }
}

try {
    # Step 1: Build and package
    if (-not $SkipBuild) {
        Write-Step "Building project"
        if (-not $DryRun) {
            npm run build
            if ($LASTEXITCODE -ne 0) {
                throw "Build failed"
            }
        } else {
            Write-DryRun "npm run build"
        }
    } else {
        Write-Warning "Skipping build step"
    }

    # Step 2: Create package using package.ps1
    Write-Step "Creating deployment package"
    $packageScript = Join-Path $PSScriptRoot "package.ps1"

    if (-not $DryRun) {
        # Call package.ps1 and capture the package path
        & $packageScript -SkipBuild:$true
        if ($LASTEXITCODE -ne 0) {
            throw "Package creation failed"
        }

        # Find the latest package file
        $packagePattern = "$($config['PACKAGE_NAME'])_*.tar.xz"
        $packageFile = Get-ChildItem -Path ".." -Filter $packagePattern |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

        if (-not $packageFile) {
            throw "Package file not found"
        }

        $packagePath = $packageFile.FullName
        Write-Success "Package created: $($packageFile.Name)"
    } else {
        Write-DryRun ".\scripts\package.ps1 -SkipBuild"
        $packagePath = "..\$($config['PACKAGE_NAME'])_dummy.tar.xz"
    }

    # Step 3: Transfer package to server
    Write-Step "Transferring package to server"
    $remoteTempPath = "/tmp/$(Split-Path -Leaf $packagePath)"

    # Build scp arguments as array (no verbose flags)
    $scpArgs = @()
    $scpArgs += "-P"
    $scpArgs += $config['SSH_PORT']

    if ($config.ContainsKey('SSH_KEY_PATH') -and $config['SSH_KEY_PATH']) {
        $scpArgs += "-i"
        $scpArgs += $config['SSH_KEY_PATH']
    }

    $scpArgs += $packagePath
    $scpArgs += "$($config['SSH_USER'])@$($config['SSH_HOST']):$remoteTempPath"

    if (-not $DryRun) {
        Write-Log "Uploading package to: $remoteTempPath"

        # Execute SCP and capture output
        $scpOutput = & scp $scpArgs 2>&1
        $scpExitCode = $LASTEXITCODE

        # Log all output to file
        foreach ($line in $scpOutput) {
            Write-LogOnly "SCP: $line"
        }

        Write-LogOnly "SCP exit code: $scpExitCode"

        if ($scpExitCode -ne 0) {
            throw "Failed to transfer package to server (exit code: $scpExitCode)"
        }
        Write-Success "Package transferred successfully"
    } else {
        Write-DryRun "scp -P $($config['SSH_PORT']) $packagePath $($config['SSH_USER'])@$($config['SSH_HOST']):$remoteTempPath"
    }

    # Step 4: Backup current deployment
    Write-Step "Backing up current deployment"
    $backupTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "$($config['BACKUP_DIR'])/backup-$backupTimestamp.tar.xz"

    $backupCommand = "sudo -u $($config['DEPLOY_USER']) mkdir -pv $($config['BACKUP_DIR']) && " +
                    "if [ -d $($config['REMOTE_DEPLOY_DIR'])/dist ]; then " +
                    "cd $($config['REMOTE_DEPLOY_DIR']) && " +
                    "sudo -u $($config['DEPLOY_USER']) tar -czvf $backupFile dist propmpts package.json .env 2>/dev/null || true && " +
                    "echo 'Backup created: $backupFile'; " +
                    "else " +
                    "echo 'No existing deployment to backup'; " +
                    "fi"

    try {
        Invoke-SSHCommand -Command $backupCommand -StepName "Backup Current Deployment" -IgnoreErrors $true
    } catch {
        if (-not $Force) {
            Write-Warning "Backup command had issues, but continuing..."
        }
    }

    # Step 5: Stop services before deployment
    Write-Step "Stopping services"

    $stopCommand = "cd $($config['REMOTE_DEPLOY_DIR'])"


    # Stop systemd if configured
    if ($config.ContainsKey('SYSTEMD_SERVICE') -and $config['SYSTEMD_SERVICE']) {
        $stopCommand += " && if systemctl is-active --quiet $($config['SYSTEMD_SERVICE']); then " +
                       "echo 'Stopping systemd service: $($config['SYSTEMD_SERVICE'])' && " +
                       "sudo systemctl stop $($config['SYSTEMD_SERVICE']) || true; " +
                       "fi"
    }

    try {
        Invoke-SSHCommand -Command $stopCommand -StepName "Stop Services" -IgnoreErrors $true
        Write-Info "Services stopped (or were not running)"
    } catch {
        Write-Warning "Error stopping services, but continuing..."
    }

    # Step 5b: Deploy new package
    Write-Step "Deploying new package"

    $deployCommand = "cd $($config['REMOTE_DEPLOY_DIR']) && " +
                    "sudo -u $($config['DEPLOY_USER']) rm -rfv dist.old && " +
                    "if [ -d dist ]; then sudo -u $($config['DEPLOY_USER']) mv -v dist dist.old; fi && " +
                    "if [ -d prompts ]; then sudo -u $($config['DEPLOY_USER']) mv -v prompts prompts.old; fi && " +
                    "sudo -u $($config['DEPLOY_USER']) tar -xvf $remoteTempPath && " +
                    "sudo -u $($config['DEPLOY_USER']) mkdir -pv prompts"

    # Install npm dependencies if package.json changed
    $deployCommand += " && if [ -f package.json ]; then " +
                      "echo 'Installing npm dependencies...' && " +
                      "sudo -u $($config['DEPLOY_USER']) NODE_ENV=$($config['REMOTE_NODE_ENV']) npm ci --production; " +
                      "fi"


    # Handle systemd if configured
    if ($config.ContainsKey('SYSTEMD_SERVICE') -and $config['SYSTEMD_SERVICE']) {
        $deployCommand += " && echo 'Starting/restarting systemd service: $($config['SYSTEMD_SERVICE'])' && " +
                         "sudo systemctl restart $($config['SYSTEMD_SERVICE']) && " +
                         "sudo systemctl enable $($config['SYSTEMD_SERVICE'])"
    }

    Invoke-SSHCommand -Command $deployCommand -StepName "Deploy New Package"
    Write-Success "New version deployed successfully"

    # Step 6: Restart services
    Write-Step "Restarting services"

    $restartCommand = "cd $($config['REMOTE_DEPLOY_DIR'])"


    # Start systemd service if configured and not already handled above
    if ($config.ContainsKey('SYSTEMD_SERVICE') -and $config['SYSTEMD_SERVICE']) {
        $restartCommand += " && echo 'Ensuring systemd service is running: $($config['SYSTEMD_SERVICE'])' && " +
                          "sudo systemctl status $($config['SYSTEMD_SERVICE']) --no-pager || " +
                          "sudo systemctl start $($config['SYSTEMD_SERVICE'])"
    }

    try {
        Invoke-SSHCommand -Command $restartCommand -StepName "Restart Services" -IgnoreErrors $true
        Write-Success "Services restarted successfully"
    } catch {
        Write-Warning "Service restart had issues, but continuing..."
    }

    # Step 7: Clean up old backups
    Write-Step "Cleaning up old backups"
    # More robust cleanup: find files, sort by modification time, keep newest N, delete rest
    $keepCount = [int]$config['KEEP_BACKUPS']
    $cleanupOldBackupsCommand = "cd $($config['BACKUP_DIR']) && " +
                               "ls -1t backup-*.tar.xz 2>/dev/null | " +
                               "tail -n +$(($keepCount + 1)) | " +
                               "while IFS= read -r file; do [ -f `"`$file`" ] && sudo -u $($config['DEPLOY_USER']) rm -fv `"`$file`"; done"

    try {
        Invoke-SSHCommand -Command $cleanupOldBackupsCommand -StepName "Cleanup Old Backups" -IgnoreErrors $true
    } catch {
        Write-Warning "Error cleaning up old backups, but continuing..."
    }

    # Step 8: Verify deployment
    Write-Step "Verifying deployment"

    $verifyCommand = "cd $($config['REMOTE_DEPLOY_DIR']) && " +
                    "if [ -f dist/index.js ]; then " +
                    "echo 'Deployment verified: dist/index.js exists' && " +
                    "if [ -f deploy-info.json ]; then cat deploy-info.json; fi; " +
                    "else " +
                    "echo 'ERROR: dist/index.js not found!' && exit 1; " +
                    "fi"


    if ($config.ContainsKey('SYSTEMD_SERVICE') -and $config['SYSTEMD_SERVICE']) {
        $verifyCommand += " && systemctl status $($config['SYSTEMD_SERVICE']) --no-pager 2>/dev/null || true"
    }

    try {
        Invoke-SSHCommand -Command $verifyCommand -StepName "Verify Deployment"
    } catch {
        Write-Warning "Verification had issues"
    }

    # Step 9: Clean up deployment files
    Write-Step "Cleaning up deployment files"

    # Remove remote temp package
    $cleanupTempCommand = "sudo -u $($config['DEPLOY_USER']) rm -fv $remoteTempPath 2>/dev/null || true"

    try {
        Invoke-SSHCommand -Command $cleanupTempCommand -StepName "Cleanup Remote Temp Files" -IgnoreErrors $true
        Write-Info "Remote temp package cleaned up"
    } catch {
        Write-Warning "Error cleaning up remote temp files"
    }

    # Clean up local package file
    if (-not $DryRun -and $packagePath -and (Test-Path $packagePath)) {
        Remove-Item $packagePath -Force
        Write-Log "Local package file cleaned up: $packagePath"
    } elseif ($DryRun) {
        Write-DryRun "Remove local package file: $packagePath"
    }

    Write-Complete "Deployment completed successfully!"
    Write-Info "Server: $($config['SSH_HOST'])"
    Write-Info "Path: $($config['REMOTE_DEPLOY_DIR'])"

    if ($config.ContainsKey('PM2_APP_NAME') -and $config['PM2_APP_NAME']) {
        Write-Info "PM2 App: $($config['PM2_APP_NAME'])"
    }

    if ($config.ContainsKey('SYSTEMD_SERVICE') -and $config['SYSTEMD_SERVICE']) {
        Write-Info "Service: $($config['SYSTEMD_SERVICE'])"
    }

    Write-Info "Log file: $logFile"
    Write-Info ""

} catch {
    $errorMessage = $_.Exception.Message
    Write-Log "Deployment failed: $errorMessage" "ERROR"
    Write-Error "Deployment failed: $errorMessage"

    # Attempt rollback if deployment failed
    if (-not $DryRun -and $backupFile) {
        Write-Warning "Attempting to rollback..."
        Write-Log "Starting rollback procedure" "WARNING"

        $rollbackCommand = "cd $($config['REMOTE_DEPLOY_DIR']) && " +
                          "if [ -d dist.old ]; then " +
                          "sudo -u $($config['DEPLOY_USER']) rm -rfv dist && " +
                          "sudo -u $($config['DEPLOY_USER']) mv -v dist.old dist && " +
                          "if [ -d prompts.old ]; then " +
                          "sudo -u $($config['DEPLOY_USER']) rm -rfv prompts && " +
                          "sudo -u $($config['DEPLOY_USER']) mv -v prompts.old prompts && " +
                          "echo 'Rollback completed'; " +
                          "fi"

        try {
            Invoke-SSHCommand -Command $rollbackCommand -StepName "Rollback Deployment" -IgnoreErrors $true
            Write-Log "Rollback completed" "WARNING"
        } catch {
            Write-Log "Rollback failed: $($_.Exception.Message)" "ERROR"
        }
    }

    # Clean up files even if deployment failed
    if ($packagePath -and (Test-Path $packagePath)) {
        Remove-Item $packagePath -Force -ErrorAction SilentlyContinue
        Write-Log "Local package file cleaned up after error: $packagePath"
    }

    # Try to clean up remote temp file
    if ($remoteTempPath) {
        try {
            $cleanupErrorCommand = "rm -fv $remoteTempPath 2>/dev/null || true"
            Invoke-SSHCommand -Command $cleanupErrorCommand -StepName "Cleanup After Error" -IgnoreErrors $true
            Write-Log "Remote temp file cleaned up after error: $remoteTempPath"
        } catch {
            Write-Log "Failed to clean up remote temp file: $($_.Exception.Message)" "WARNING"
        }
    }

    Write-Log "Deployment process ended with errors. Check log for details: $logFile" "ERROR"

    exit 1
} finally {
    Pop-Location
}
