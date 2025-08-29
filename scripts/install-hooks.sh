#!/bin/bash
#
# Git Hook Installation Script for ASD (MAINT-003 TASK-004)
#
# Installs specification integrity validation hooks to prevent
# duplicate IDs and broken references from being committed.
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔧 Installing ASD Git Hooks${NC}"
echo -e "${BLUE}MAINT-003 TASK-004: Specification Integrity Validation${NC}\n"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Not in a git repository. Hooks will not be functional.${NC}"
    exit 1
fi

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
echo -e "${BLUE}📋 Installing pre-commit hook...${NC}"
if [ -f ".githooks/pre-commit" ]; then
    cp ".githooks/pre-commit" ".git/hooks/pre-commit"
    chmod +x ".git/hooks/pre-commit"
    echo -e "${GREEN}✅ Pre-commit hook installed${NC}"
else
    echo -e "${YELLOW}⚠️  Pre-commit hook source not found at .githooks/pre-commit${NC}"
fi

# Verify validation script exists
if [ ! -f "scripts/validate-spec-integrity.js" ]; then
    echo -e "${YELLOW}⚠️  Validation script not found at scripts/validate-spec-integrity.js${NC}"
    echo -e "${YELLOW}   Hook may not function properly${NC}"
fi

# Test hook installation
echo -e "\n${BLUE}🧪 Testing hook installation...${NC}"
if [ -x ".git/hooks/pre-commit" ]; then
    echo -e "${GREEN}✅ Pre-commit hook is installed and executable${NC}"
else
    echo -e "${YELLOW}⚠️  Pre-commit hook installation may have failed${NC}"
fi

echo -e "\n${GREEN}🎉 Hook installation complete!${NC}"
echo -e "\nThe pre-commit hook will now:"
echo -e "  ✓ Validate specification integrity before each commit"
echo -e "  ✓ Prevent duplicate specification IDs"
echo -e "  ✓ Check for broken inter-spec references"
echo -e "  ✓ Enforce structural consistency"

echo -e "\n${BLUE}💡 Usage:${NC}"
echo -e "  • Hooks run automatically on 'git commit'"
echo -e "  • To bypass validation: git commit --no-verify"
echo -e "  • To run validation manually: node scripts/validate-spec-integrity.js"

echo -e "\n${YELLOW}⚠️  Important:${NC}"
echo -e "  • Team members should run this script to install hooks"
echo -e "  • Hooks are local to each git clone and not versioned"
echo -e "  • Include this in your development setup documentation"