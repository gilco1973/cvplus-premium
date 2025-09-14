#!/bin/bash

# Premium Payment Flow Testing Script
# Comprehensive testing of payment processing and billing operations

set -e

echo "💳 Starting Premium Payment Flow Tests..."

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

# Initialize test counter
TESTS_PASSED=0
TESTS_TOTAL=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_info "Running: $test_name"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if eval "$test_command"; then
        print_status "$test_name passed"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "$test_name failed"
        return 1
    fi
}

# Setup test environment
print_status "Setting up test environment..."
export NODE_ENV=test
export STRIPE_API_KEY=sk_test_dummy
export PAYPAL_CLIENT_ID=test_dummy

# Run payment processing tests
print_status "Testing payment processing capabilities..."

run_test "Payment validation tests" "npm run test -- --testPathPattern=payment-validation"
run_test "Stripe integration tests" "npm run test -- --testPathPattern=stripe"  
run_test "PayPal integration tests" "npm run test -- --testPathPattern=paypal"
run_test "Payment security tests" "npm run test -- --testPathPattern=payment-security"
run_test "Payment webhook tests" "npm run test -- --testPathPattern=webhook"

# Run subscription flow tests
print_status "Testing subscription lifecycle..."

run_test "Subscription creation tests" "npm run test -- --testPathPattern=subscription-creation"
run_test "Subscription upgrade tests" "npm run test -- --testPathPattern=subscription-upgrade"
run_test "Subscription cancellation tests" "npm run test -- --testPathPattern=subscription-cancellation"
run_test "Billing cycle tests" "npm run test -- --testPathPattern=billing-cycle"

# Run feature gating tests
print_status "Testing feature access control..."

run_test "Feature gate validation tests" "npm run test -- --testPathPattern=feature-gate"
run_test "Usage limit tests" "npm run test -- --testPathPattern=usage-limit"
run_test "Access control tests" "npm run test -- --testPathPattern=access-control"

# Run billing calculation tests
print_status "Testing billing calculations..."

run_test "Proration calculation tests" "npm run test -- --testPathPattern=proration"
run_test "Tax calculation tests" "npm run test -- --testPathPattern=tax-calculation"
run_test "Discount application tests" "npm run test -- --testPathPattern=discount"

# Run security tests
print_status "Testing security measures..."

run_test "Fraud detection tests" "npm run test -- --testPathPattern=fraud-detection"
run_test "PCI compliance tests" "npm run test -- --testPathPattern=pci-compliance"
run_test "Data encryption tests" "npm run test -- --testPathPattern=encryption"

# Run performance tests
print_status "Testing payment performance..."

run_test "Payment processing performance" "npm run test -- --testPathPattern=payment-performance"
run_test "Subscription query performance" "npm run test -- --testPathPattern=subscription-performance"

# Generate test report
echo ""
print_status "Payment Flow Test Summary:"
print_status "Tests Passed: $TESTS_PASSED"
print_status "Tests Total: $TESTS_TOTAL"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    print_status "All payment flow tests passed! ✨"
    print_status "Premium payment processing is ready for production."
else
    TESTS_FAILED=$((TESTS_TOTAL - TESTS_PASSED))
    print_error "$TESTS_FAILED tests failed. Please review and fix issues before deployment."
    exit 1
fi

# Generate coverage report for payment flows
if command -v npx &> /dev/null; then
    print_info "Generating payment flow coverage report..."
    npx jest --coverage --testPathPattern="payment|billing|subscription" --coverageReporters=text-summary
fi

print_status "Payment flow testing completed successfully!"