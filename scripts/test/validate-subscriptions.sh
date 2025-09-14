#!/bin/bash

# Premium Subscription Validation Script
# Validates subscription logic, billing calculations, and business rules

set -e

echo "📊 Starting Premium Subscription Validation..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the premium directory
if [[ ! -f "package.json" ]] || ! grep -q "@cvplus/premium" package.json; then
    print_error "This script must be run from the premium submodule directory"
    exit 1
fi

# Initialize validation counter
VALIDATIONS_PASSED=0
VALIDATIONS_TOTAL=0

run_validation() {
    local validation_name="$1"
    local validation_command="$2"
    
    print_info "Validating: $validation_name"
    VALIDATIONS_TOTAL=$((VALIDATIONS_TOTAL + 1))
    
    if eval "$validation_command"; then
        print_status "$validation_name validation passed"
        VALIDATIONS_PASSED=$((VALIDATIONS_PASSED + 1))
    else
        print_error "$validation_name validation failed"
        return 1
    fi
}

# Setup test environment
print_status "Setting up subscription validation environment..."
export NODE_ENV=test

# Validate subscription business logic
print_status "Validating subscription business logic..."

run_validation "Subscription creation logic" "npm run test -- --testPathPattern=subscription-creation --silent"
run_validation "Subscription upgrade logic" "npm run test -- --testPathPattern=subscription-upgrade --silent"
run_validation "Subscription downgrade logic" "npm run test -- --testPathPattern=subscription-downgrade --silent"
run_validation "Subscription cancellation logic" "npm run test -- --testPathPattern=subscription-cancellation --silent"

# Validate billing calculations
print_status "Validating billing calculations..."

run_validation "Proration calculations" "npm run test -- --testPathPattern=proration --silent"
run_validation "Tax calculations" "npm run test -- --testPathPattern=tax-calculation --silent"
run_validation "Discount applications" "npm run test -- --testPathPattern=discount --silent"
run_validation "Credit applications" "npm run test -- --testPathPattern=credit --silent"
run_validation "Invoice generation" "npm run test -- --testPathPattern=invoice --silent"

# Validate subscription lifecycle
print_status "Validating subscription lifecycle scenarios..."

run_validation "Trial to paid conversion" "npm run test -- --testPathPattern=trial-conversion --silent"
run_validation "Payment failure handling" "npm run test -- --testPathPattern=payment-failure --silent"
run_validation "Subscription reactivation" "npm run test -- --testPathPattern=reactivation --silent"
run_validation "Account suspension logic" "npm run test -- --testPathPattern=suspension --silent"

# Validate business rules
print_status "Validating business rules and constraints..."

run_validation "Subscription tier restrictions" "npm run test -- --testPathPattern=tier-restrictions --silent"
run_validation "Feature entitlement rules" "npm run test -- --testPathPattern=entitlements --silent"
run_validation "Usage limit enforcement" "npm run test -- --testPathPattern=usage-limits --silent"
run_validation "Concurrent subscription rules" "npm run test -- --testPathPattern=concurrent-subscriptions --silent"

# Validate data consistency
print_status "Validating data consistency and integrity..."

run_validation "Subscription data integrity" "npm run test -- --testPathPattern=data-integrity --silent"
run_validation "Billing history consistency" "npm run test -- --testPathPattern=billing-consistency --silent"
run_validation "Payment record accuracy" "npm run test -- --testPathPattern=payment-accuracy --silent"
run_validation "Audit trail completeness" "npm run test -- --testPathPattern=audit-trail --silent"

# Validate edge cases
print_status "Validating edge cases and error scenarios..."

run_validation "Invalid subscription states" "npm run test -- --testPathPattern=invalid-states --silent"
run_validation "Race condition handling" "npm run test -- --testPathPattern=race-conditions --silent"
run_validation "Network failure recovery" "npm run test -- --testPathPattern=network-failure --silent"
run_validation "Data corruption recovery" "npm run test -- --testPathPattern=corruption-recovery --silent"

# Validate compliance requirements
print_status "Validating compliance and regulatory requirements..."

run_validation "PCI DSS compliance" "npm run test -- --testPathPattern=pci-compliance --silent"
run_validation "GDPR data handling" "npm run test -- --testPathPattern=gdpr-compliance --silent"
run_validation "Financial regulations" "npm run test -- --testPathPattern=financial-regulations --silent"
run_validation "Data retention policies" "npm run test -- --testPathPattern=data-retention --silent"

# Generate validation report
echo ""
print_status "Subscription Validation Summary:"
print_status "Validations Passed: $VALIDATIONS_PASSED"
print_status "Validations Total: $VALIDATIONS_TOTAL"

if [ $VALIDATIONS_PASSED -eq $VALIDATIONS_TOTAL ]; then
    print_status "All subscription validations passed! ✨"
    print_status "Premium subscription system is compliant and ready for production."
    
    # Generate detailed validation report
    echo ""
    print_info "Generating detailed validation report..."
    
    cat > subscription-validation-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "validations": {
    "total": $VALIDATIONS_TOTAL,
    "passed": $VALIDATIONS_PASSED,
    "failed": $((VALIDATIONS_TOTAL - VALIDATIONS_PASSED))
  },
  "categories": {
    "business_logic": "✅ PASSED",
    "billing_calculations": "✅ PASSED", 
    "lifecycle_management": "✅ PASSED",
    "business_rules": "✅ PASSED",
    "data_consistency": "✅ PASSED",
    "edge_cases": "✅ PASSED",
    "compliance": "✅ PASSED"
  },
  "compliance_status": "FULLY_COMPLIANT",
  "production_ready": true,
  "recommendations": [
    "Continue regular validation testing",
    "Monitor real-world subscription patterns",
    "Update validation tests as business rules evolve"
  ]
}
EOF
    
    print_status "Validation report saved to: subscription-validation-report.json"
    
else
    VALIDATIONS_FAILED=$((VALIDATIONS_TOTAL - VALIDATIONS_PASSED))
    print_error "$VALIDATIONS_FAILED validations failed."
    print_error "Subscription system requires fixes before production deployment."
    
    # Generate failure report
    cat > subscription-validation-failures.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "FAILED",
  "validations": {
    "total": $VALIDATIONS_TOTAL,
    "passed": $VALIDATIONS_PASSED,
    "failed": $VALIDATIONS_FAILED
  },
  "production_ready": false,
  "action_required": "Fix failing validations before deployment"
}
EOF
    
    print_error "Failure report saved to: subscription-validation-failures.json"
    exit 1
fi

print_status "Subscription validation completed successfully!"