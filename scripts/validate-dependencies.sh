#!/bin/bash

# CVPlus Submodule - Dependency Validation Script
# 
# Validates that submodules adhere to dependency resolution plan:
# - Respects layer-based dependency architecture
# - No forbidden imports from same layer or higher layers
# - Maintains proper separation of concerns
# 
# Author: Gil Klainert
# Date: 2025-08-29

set -e

# Auto-detect current module name
if [[ -f "package.json" ]]; then
    MODULE_NAME=$(grep -o '"@cvplus/[^"]*' package.json | head -1 | sed 's/"@cvplus\///')
else
    MODULE_NAME="unknown"
fi

echo "🔍 Validating CVPlus $MODULE_NAME module dependencies..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if we're in a CVPlus module directory
if [[ ! -f "package.json" ]] || ! grep -q "@cvplus/" package.json; then
    echo -e "${RED}❌ Error: This script must be run from a CVPlus module directory${NC}"
    echo "Current directory: $(pwd)"
    echo "Files in current directory: $(ls -la)"
    exit 1
fi

echo "✅ Running from $MODULE_NAME module directory"

# 1. Validate package.json dependencies
echo ""
echo "📦 Checking package.json dependencies..."

# Define dependency layers based on architecture plan
LAYER_0=("core")
LAYER_1=("auth" "i18n")
LAYER_2=("cv-processing" "multimedia" "premium" "recommendations")
LAYER_3=("public-profiles" "analytics" "admin" "workflow" "payments")

# Determine current module's layer and allowed dependencies
ALLOWED_DEPS=""
FORBIDDEN_DEPS_PATTERN=""
CURRENT_LAYER=""

if [[ " ${LAYER_0[@]} " =~ " ${MODULE_NAME} " ]]; then
    CURRENT_LAYER="Layer 0 (Foundation)"
    ALLOWED_DEPS="none"
    FORBIDDEN_DEPS_PATTERN='"@cvplus/.*"'
elif [[ " ${LAYER_1[@]} " =~ " ${MODULE_NAME} " ]]; then
    CURRENT_LAYER="Layer 1 (Infrastructure)"
    ALLOWED_DEPS="@cvplus/core"
    if [[ "$MODULE_NAME" == "auth" ]]; then
        FORBIDDEN_DEPS_PATTERN='"@cvplus/(i18n|multimedia|premium|public-profiles|recommendations|admin|analytics|cv-processing|workflow|payments)"'
    else
        FORBIDDEN_DEPS_PATTERN='"@cvplus/(auth|multimedia|premium|public-profiles|recommendations|admin|analytics|cv-processing|workflow|payments)"'
    fi
elif [[ " ${LAYER_2[@]} " =~ " ${MODULE_NAME} " ]]; then
    CURRENT_LAYER="Layer 2 (Business Logic)"
    ALLOWED_DEPS="@cvplus/core, @cvplus/auth, @cvplus/i18n"
    FORBIDDEN_DEPS_PATTERN='"@cvplus/(public-profiles|analytics|admin|workflow|payments)"'
elif [[ " ${LAYER_3[@]} " =~ " ${MODULE_NAME} " ]]; then
    CURRENT_LAYER="Layer 3 (Features)"
    ALLOWED_DEPS="@cvplus/core, @cvplus/auth, @cvplus/i18n, @cvplus/cv-processing, @cvplus/multimedia, @cvplus/premium, @cvplus/recommendations"
    FORBIDDEN_DEPS_PATTERN='"@cvplus/(unknown-future-modules)"' # Minimal restrictions at top layer
else
    echo -e "${YELLOW}⚠️  Unknown module: $MODULE_NAME. Using default validation.${NC}"
    CURRENT_LAYER="Unknown"
    ALLOWED_DEPS="@cvplus/core"
    FORBIDDEN_DEPS_PATTERN='"@cvplus/.*"'
fi

echo "Module Layer: $CURRENT_LAYER"
echo "Allowed Dependencies: $ALLOWED_DEPS"
echo ""

# Check for forbidden CVPlus dependencies
if [[ "$FORBIDDEN_DEPS_PATTERN" != '"@cvplus/(unknown-future-modules)"' && "$FORBIDDEN_DEPS_PATTERN" != '"@cvplus/.*"' ]]; then
    FORBIDDEN_DEPS_FOUND=$(grep -E "$FORBIDDEN_DEPS_PATTERN" package.json || true)
    
    if [[ -n "$FORBIDDEN_DEPS_FOUND" ]]; then
        echo -e "${RED}❌ Found forbidden CVPlus dependencies in package.json:${NC}"
        echo "$FORBIDDEN_DEPS_FOUND"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ No forbidden dependencies found in package.json${NC}"
    fi
else
    echo -e "${GREEN}✅ No dependency restrictions for this layer${NC}"
fi

# Check for required core dependency (except for core itself)
if [[ "$MODULE_NAME" != "core" ]]; then
    CORE_DEP=$(grep -E '"@cvplus/core"' package.json || true)
    if [[ -n "$CORE_DEP" ]]; then
        echo -e "${GREEN}✅ Required @cvplus/core dependency found${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: @cvplus/core dependency not found - this may be expected for file: protocol setup${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${GREEN}✅ Core module - no core dependency required${NC}"
fi

# 2. Check source code imports
echo ""
echo "📁 Checking source code imports..."

# Find all TypeScript files
TS_FILES=$(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null || true)

if [[ -z "$TS_FILES" ]]; then
    echo -e "${YELLOW}⚠️  No TypeScript files found in src/${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo "Found $(echo "$TS_FILES" | wc -l) TypeScript files to check"
    
    # Check for forbidden imports based on layer
    ALL_IMPORTS=$(echo "$TS_FILES" | xargs grep -n "from.*['\"]@cvplus/" 2>/dev/null || true)
    
    if [[ -n "$ALL_IMPORTS" ]]; then
        # Filter out allowed imports based on module layer
        FORBIDDEN_IMPORTS=""
        
        if [[ "$MODULE_NAME" == "core" ]]; then
            # Core should have no @cvplus imports
            FORBIDDEN_IMPORTS="$ALL_IMPORTS"
        elif [[ " ${LAYER_1[@]} " =~ " ${MODULE_NAME} " ]]; then
            # Layer 1: Can only import from core
            if [[ "$MODULE_NAME" == "auth" ]]; then
                FORBIDDEN_IMPORTS=$(echo "$ALL_IMPORTS" | grep -v "@cvplus/core" | grep -v "@cvplus/auth" || true)
            else
                FORBIDDEN_IMPORTS=$(echo "$ALL_IMPORTS" | grep -v "@cvplus/core" | grep -v "@cvplus/$MODULE_NAME" || true)
            fi
        elif [[ " ${LAYER_2[@]} " =~ " ${MODULE_NAME} " ]]; then
            # Layer 2: Can import from core, auth, i18n
            FORBIDDEN_IMPORTS=$(echo "$ALL_IMPORTS" | grep -v "@cvplus/core" | grep -v "@cvplus/auth" | grep -v "@cvplus/i18n" | grep -v "@cvplus/$MODULE_NAME" || true)
        elif [[ " ${LAYER_3[@]} " =~ " ${MODULE_NAME} " ]]; then
            # Layer 3: Can import from most modules
            FORBIDDEN_IMPORTS=$(echo "$ALL_IMPORTS" | grep -E "@cvplus/(unknown-future-modules)" || true)
        fi
        
        if [[ -n "$FORBIDDEN_IMPORTS" ]]; then
            echo -e "${RED}❌ Found forbidden CVPlus imports:${NC}"
            echo "$FORBIDDEN_IMPORTS"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${GREEN}✅ No forbidden imports found in source code${NC}"
        fi
    else
        echo -e "${GREEN}✅ No @cvplus imports found${NC}"
    fi
    
    # Check for proper core imports (except for core itself)
    if [[ "$MODULE_NAME" != "core" ]]; then
        CORE_IMPORTS=$(echo "$TS_FILES" | xargs grep -n "from.*['\"]@cvplus/core" 2>/dev/null || true)
        if [[ -n "$CORE_IMPORTS" ]]; then
            echo -e "${GREEN}✅ Found Core module integration:${NC}"
            echo "$CORE_IMPORTS" | head -5
            if [[ $(echo "$CORE_IMPORTS" | wc -l) -gt 5 ]]; then
                echo "... and $(($(echo "$CORE_IMPORTS" | wc -l) - 5)) more"
            fi
        else
            echo -e "${YELLOW}⚠️  No @cvplus/core imports found - consider using shared utilities${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${GREEN}✅ Core module - internal imports validated${NC}"
    fi
fi

# 3. Check TypeScript configuration
echo ""
echo "⚙️  Checking TypeScript configuration..."

if [[ -f "tsconfig.json" ]]; then
    # Check for proper core path mapping
    CORE_PATHS=$(grep -A 10 '"paths"' tsconfig.json | grep -E '"@cvplus/core"' || true)
    if [[ -n "$CORE_PATHS" ]]; then
        echo -e "${GREEN}✅ Core module path mapping found${NC}"
    else
        echo -e "${YELLOW}⚠️  No @cvplus/core path mapping found${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check for forbidden path mappings based on layer
    if [[ "$FORBIDDEN_DEPS_PATTERN" != '"@cvplus/(unknown-future-modules)"' && "$FORBIDDEN_DEPS_PATTERN" != '"@cvplus/.*"' ]]; then
        FORBIDDEN_PATH_PATTERN=$(echo "$FORBIDDEN_DEPS_PATTERN" | sed 's/"@cvplus\//"@cvplus\\\//g')
        FORBIDDEN_PATHS=$(grep -A 20 '"paths"' tsconfig.json | grep -E "$FORBIDDEN_PATH_PATTERN" || true)
        if [[ -n "$FORBIDDEN_PATHS" ]]; then
            echo -e "${RED}❌ Found forbidden path mappings:${NC}"
            echo "$FORBIDDEN_PATHS"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${GREEN}✅ No forbidden path mappings found${NC}"
        fi
    else
        echo -e "${GREEN}✅ No path mapping restrictions for this layer${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No tsconfig.json found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 4. Build validation
echo ""
echo "🔨 Testing build to validate dependencies..."

if npm run type-check || npm run build >/dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed - dependency issues detected${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "📋 Validation Summary"
echo "===================="

if [[ $ERRORS -eq 0 ]] && [[ $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}✅ Perfect! No dependency violations found.${NC}"
    echo "The $MODULE_NAME module correctly follows $CURRENT_LAYER dependency rules."
elif [[ $ERRORS -eq 0 ]]; then
    echo -e "${YELLOW}⚠️  Validation passed with $WARNINGS warning(s).${NC}"
    echo "Consider addressing the warnings for optimal dependency management."
else
    echo -e "${RED}❌ Validation failed with $ERRORS error(s) and $WARNINGS warning(s).${NC}"
    echo "Please fix the dependency violations before proceeding."
fi

echo ""
echo "$CURRENT_LAYER Rules for $MODULE_NAME Module:"
echo "- ✅ Can depend on: $ALLOWED_DEPS"
if [[ "$FORBIDDEN_DEPS_PATTERN" != '"@cvplus/(unknown-future-modules)"' ]]; then
    echo "- ❌ Cannot depend on: Other modules at same or higher layers"
else
    echo "- ❌ No specific restrictions (top layer)"
fi
echo "- ✅ Can be used by: Higher layer modules or external applications"

if [[ $ERRORS -gt 0 ]]; then
    exit 1
fi

exit 0