#!/bin/bash
# Bash script to build and package eds-avatar-bff for distribution

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
SKIP_BUILD=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--skip-build]"
            echo "  --skip-build    Skip the npm build step"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Get project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${GREEN}📦 Packaging eds-avatar-bff...${NC}"

# Get git commit hash
GIT_COMMIT=$(git rev-parse --short HEAD)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to get git commit hash${NC}" >&2
    exit 1
fi

ARCHIVE_NAME="../eds-avatar-bff_${GIT_COMMIT}.tar.xz"
echo -e "${YELLOW}Creating archive: $ARCHIVE_NAME${NC}"

# Build the project unless skipped
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}🔨 Building project...${NC}"
    if ! npm run build; then
        echo -e "${RED}❌ Build failed${NC}" >&2
        exit 1
    fi
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ dist directory not found. Run build first or use --skip-build flag.${NC}" >&2
    exit 1
fi

# Remove existing archive if it exists
if [ -f "$ARCHIVE_NAME" ]; then
    rm -f "$ARCHIVE_NAME"
    echo -e "${YELLOW}Removed existing archive${NC}"
fi

# Create tar.xz archive
echo -e "${BLUE}📦 Creating tar.xz archive...${NC}"
if ! tar -cJf "$ARCHIVE_NAME" dist package.json package-lock.json .env.example; then
    echo -e "${RED}❌ Failed to create tar.xz archive${NC}" >&2
    exit 1
fi

# Get archive size
if command -v du >/dev/null 2>&1; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
elif command -v ls >/dev/null 2>&1; then
    ARCHIVE_SIZE=$(ls -lh "$ARCHIVE_NAME" | awk '{print $5}')
else
    ARCHIVE_SIZE="unknown"
fi

echo -e "${GREEN}✅ Package created successfully!${NC}"
echo -e "${CYAN}📁 Archive: $ARCHIVE_NAME ($ARCHIVE_SIZE)${NC}"
echo -e "${GREEN}🚀 Ready for distribution!${NC}"