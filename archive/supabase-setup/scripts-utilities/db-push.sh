#!/bin/bash
# Script to push database migrations

cd /Users/zitrono/dev/totalis-supabase

echo "Pushing database migrations..."
echo "When prompted for password, enter: 4-ever-young-"
echo ""

# Use expect to handle password prompt
if command -v expect &> /dev/null; then
    expect -c '
    spawn npx supabase db push
    expect "Enter your database password:"
    send "4-ever-young-\r"
    expect eof
    '
else
    echo "Please enter password when prompted: 4-ever-young-"
    npx supabase db push
fi