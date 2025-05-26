#!/bin/bash

# Database connection details
DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.qdqbrqnqttyjegiupvri"
DB_PASSWORD="4-ever-young-"

# Connection string
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Applying trigger fix..."

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "psql not found. Trying with Docker..."
    
    # Try with Docker PostgreSQL client
    docker run --rm -i postgres:15 psql "${DATABASE_URL}" < scripts/fix-user-trigger.sql
else
    # Use local psql
    psql "${DATABASE_URL}" < scripts/fix-user-trigger.sql
fi

echo "Done!"