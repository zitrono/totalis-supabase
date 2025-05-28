#!/bin/bash

# Script to help identify migrations that don't follow naming convention
# This is for documentation only - do not rename existing migrations in production

echo "Checking migration naming convention..."
echo ""
echo "Migrations not following convention (YYYYMMDDHHMMSS_prefix_description.sql):"
echo ""

cd supabase/migrations

for file in *.sql; do
    if [ -f "$file" ]; then
        if ! [[ "$file" =~ ^[0-9]{14}_(feat_|fix_|refactor_|hf_)[a-z0-9_]+\.sql$ ]]; then
            echo "  - $file"
            
            # Suggest a new name based on content
            if grep -qi "create table\|add column" "$file"; then
                prefix="feat_"
            elif grep -qi "fix\|correct\|update" "$file"; then
                prefix="fix_"
            elif grep -qi "drop\|alter\|refactor" "$file"; then
                prefix="refactor_"
            else
                prefix="feat_"
            fi
            
            # Extract timestamp and description
            timestamp="${file:0:14}"
            desc="${file:15}"
            desc="${desc%.sql}"
            desc=$(echo "$desc" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr '-' '_')
            
            suggested="${timestamp}_${prefix}${desc}.sql"
            echo "    Suggested: $suggested"
            echo ""
        fi
    fi
done

echo ""
echo "Note: DO NOT rename existing migrations in production!"
echo "This is for reference only. New migrations should follow the convention."