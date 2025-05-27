#!/bin/bash

# Edge Function Deployment Script
# Deploys Supabase edge functions without Docker using the --use-api flag

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() {
    echo -e "${RED}Error: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check for required environment variables
check_env_vars() {
    local missing_vars=()
    
    if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        missing_vars+=("SUPABASE_ACCESS_TOKEN")
    fi
    
    if [ -z "$SUPABASE_PROJECT_ID" ]; then
        missing_vars+=("SUPABASE_PROJECT_ID")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "To set these variables:"
        echo "  export SUPABASE_ACCESS_TOKEN='your-access-token'"
        echo "  export SUPABASE_PROJECT_ID='your-project-id'"
        echo ""
        echo "You can get these values from:"
        echo "  - SUPABASE_ACCESS_TOKEN: https://app.supabase.com/account/tokens"
        echo "  - SUPABASE_PROJECT_ID: Dashboard → Settings → General"
        exit 1
    fi
}

# Deploy function
deploy_function() {
    local function_name=$1
    
    print_info "Deploying edge function: $function_name"
    
    # Check if function directory exists
    if [ ! -d "supabase/functions/$function_name" ]; then
        print_error "Function directory not found: supabase/functions/$function_name"
        exit 1
    fi
    
    # Deploy using supabase CLI with --use-api flag
    if npx supabase functions deploy "$function_name" \
        --project-ref "$SUPABASE_PROJECT_ID" \
        --use-api; then
        print_success "Successfully deployed $function_name"
    else
        print_error "Failed to deploy $function_name"
        exit 1
    fi
}

# Main script
main() {
    # Change to project root
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    cd "$SCRIPT_DIR/.."
    
    print_info "Starting edge function deployment..."
    
    # Check environment variables
    check_env_vars
    
    # Deploy checkin-process function
    deploy_function "checkin-process"
    
    print_success "Deployment completed successfully!"
    echo ""
    echo "Function URL: https://${SUPABASE_PROJECT_ID}.functions.supabase.co/checkin-process"
}

# Run main function
main "$@"