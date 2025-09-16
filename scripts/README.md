# EDS Avatar BFF Deployment Scripts

This directory contains PowerShell scripts for packaging and deploying the EDS Avatar BFF service to remote servers.

## Scripts

### `package.ps1`
Creates a compressed archive of the built application for deployment.

**Usage:**
```powershell
.\scripts\package.ps1 [-SkipBuild]
```

**Options:**
- `-SkipBuild`: Skip the build step and package existing dist folder

**Output:**
- Creates a tar.xz archive named `eds-avatar-bff_<git-hash>.tar.xz` in the parent directory
- Includes: dist/, package.json, package-lock.json, prompts/, .env.example

### `deploy.ps1`
Deploys the application to a remote server via SSH.

**Usage:**
```powershell
.\scripts\deploy.ps1 [-ConfigFile <path>] [-SkipBuild] [-DryRun] [-Force]
```

**Options:**
- `-ConfigFile`: Path to configuration file (default: `scripts\deploy.conf`)
- `-SkipBuild`: Skip the build step
- `-DryRun`: Show what would be done without making changes
- `-Force`: Continue even if backup fails

**Process:**
1. Build the application (unless skipped)
2. Create deployment package
3. Transfer package to server via SSH
4. Backup current deployment
5. Extract new package
6. Install npm dependencies
7. Restart service (systemd if configured)
8. Clean up old backups
9. Verify deployment

## Configuration

### Setting up deployment configuration

1. Copy the example configuration:
```powershell
Copy-Item scripts\deploy.conf.example scripts\deploy.conf
```

2. Edit `deploy.conf` with your server details:
```ini
# SSH Connection
SSH_HOST=your-server.com
SSH_USER=deploy
SSH_PORT=22

# Deployment paths
REMOTE_DEPLOY_DIR=/var/www/eds-avatar-bff
BACKUP_DIR=/var/backups/eds-avatar-bff

# Deployment user (all deployment commands run as this user)
DEPLOY_USER=eds-avatar-bff

# Optional: systemd service
# SYSTEMD_SERVICE=eds-avatar-bff.service
```

### Server Prerequisites

The remote server should have:
- SSH access with the configured user
- Node.js and npm installed
- Write permissions to deployment directory
- tar and xz utilities for archive extraction
- systemd service configured (optional)

### First-time Server Setup

1. Create deployment directory:
```bash
ssh deploy@server "mkdir -p /var/www/eds-avatar-bff"
```

2. Create backup directory:
```bash
ssh deploy@server "sudo mkdir -p /var/backups/eds-avatar-bff && sudo chown deploy:deploy /var/backups/eds-avatar-bff"
```

3. If using systemd, create service file `/etc/systemd/system/eds-avatar-bff.service`:
```ini
[Unit]
Description=EDS Avatar BFF Service
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/eds-avatar-bff
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl enable eds-avatar-bff.service
```

## Deployment Workflow

### Standard Deployment
```powershell
# Full deployment with build
.\scripts\deploy.ps1

# Skip build if already built
.\scripts\deploy.ps1 -SkipBuild

# Test deployment without making changes
.\scripts\deploy.ps1 -DryRun
```

### Manual Package Creation
```powershell
# Create package only
.\scripts\package.ps1

# Package will be created as ..\eds-avatar-bff_<git-hash>.tar.xz
```

### Rollback

If deployment fails, the script automatically attempts to rollback by restoring the previous dist folder.

For manual rollback, restore from backup:
```bash
ssh deploy@server "cd /var/www/eds-avatar-bff && tar -xf /var/backups/eds-avatar-bff/backup-<timestamp>.tar.xz"
```

## AI Prompt Management

The AI assistant prompt is stored in `prompts/ai-assistant.txt` and is:
- Included in deployment packages
- Hot-reloaded when changed on the server
- Can be edited directly on the server without redeployment

To update the prompt on a deployed server:
```bash
ssh deploy@server "nano /var/www/eds-avatar-bff/prompts/ai-assistant.txt"
```

The BFF service will automatically detect and reload the changed prompt.

## Troubleshooting

### Permission Denied
- Ensure SSH key is properly configured
- Check user has write permissions to deployment directory

### Build Fails
- Run `npm install` locally
- Check Node.js version compatibility
- Review TypeScript errors with `npm run typecheck`

### Service Won't Start
- Check logs: `journalctl -u eds-avatar-bff`
- Verify .env file is configured on server
- Check Node.js version on server

### Package Creation Fails
- Ensure Git is installed and repository is initialized
- Check available disk space
- Verify tar and xz utilities are available

## Security Notes

- Never commit `deploy.conf` to version control (it's in .gitignore)
- Use SSH keys instead of passwords for authentication
- Restrict deployment user permissions on the server
- Keep backups in a secure location with appropriate permissions
- Regularly clean up old backups to save disk space