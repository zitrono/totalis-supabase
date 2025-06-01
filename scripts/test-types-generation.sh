#!/bin/bash

# Test Types Generation Script
# This script tests the complete types generation workflow locally

set -e

echo "🧪 Testing Totalis Types Generation Workflow"
echo "============================================="

# Change to project root
cd "$(dirname "$0")/.."

# Clean up any previous test runs
echo "🧹 Cleaning up previous test runs..."
rm -rf temp/ test-publish/

# Create temp directories
echo "📁 Creating temp directories..."
mkdir -p temp/database
mkdir -p test-publish/totalis_types/lib

# Test 1: Generate Database Types
echo "🔧 Testing database types generation..."
cd temp/database

# Create supadart config (using environment variables if available)
SUPABASE_URL="${SUPABASE_URL:-https://qdqbrqnqttyjegiupvri.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcWJycW5xdHR5amVnaXVwdnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY5MTE5NTEsImV4cCI6MjAzMjQ4Nzk1MX0.6MKRM0oVK7SnZiILbTb0MZUKpMSQy0CHZLLIUGqlK3w}"

cat > supadart.yaml << EOF
supabase_url: $SUPABASE_URL
supabase_anon_key: $SUPABASE_ANON_KEY
dart_format: true
output: .
separated: true
dart_class: true
include_views: true
include_enums: true
EOF

echo "  → Running supadart..."
if command -v supadart &> /dev/null; then
    supadart
    echo "  ✅ Database types generated"
else
    echo "  ⚠️ supadart not found, installing..."
    dart pub global activate supadart
    supadart
    echo "  ✅ Database types generated"
fi

cd ../..

# Test 2: Build Edge Function Parser
echo "🔧 Testing edge function parser build..."
cd tools/edge-function-parser

if [ ! -d "node_modules" ]; then
    echo "  → Installing dependencies..."
    npm ci
fi

echo "  → Building parser..."
npm run build
echo "  ✅ Edge function parser built"

cd ../..

# Test 3: Generate Edge Function Types
echo "🔧 Testing edge function types generation..."
cd tools/edge-function-parser
node dist/parser.js \
    --input ../../supabase/functions \
    --output ../../temp
echo "  ✅ Edge function types generated"

cd ../..

# Test 4: Calculate Test Version
TEST_VERSION="1.0.999"
echo "🔢 Using test version: $TEST_VERSION"

# Test 5: Prepare Package Directory
echo "📦 Testing package preparation..."

# Copy and update pubspec template
envsubst < package-template/pubspec.yaml.template > test-publish/totalis_types/pubspec.yaml
sed -i.bak "s/VERSION_PLACEHOLDER/$TEST_VERSION/g" test-publish/totalis_types/pubspec.yaml

# Copy and update README template
envsubst < package-template/README.md.template > test-publish/totalis_types/README.md
sed -i.bak "s/VERSION_PLACEHOLDER/$TEST_VERSION/g" test-publish/totalis_types/README.md
sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/g" test-publish/totalis_types/README.md

# Copy LICENSE
cp package-template/LICENSE.template test-publish/totalis_types/LICENSE

# Copy and update CHANGELOG
envsubst < package-template/CHANGELOG.md.template > test-publish/totalis_types/CHANGELOG.md
sed -i.bak "s/VERSION_PLACEHOLDER/$TEST_VERSION/g" test-publish/totalis_types/CHANGELOG.md
sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/g" test-publish/totalis_types/CHANGELOG.md

echo "  ✅ Package files prepared"

# Test 6: Combine Types
echo "🔄 Testing types combination..."
node tools/combiner/combine-types.js \
    temp/database \
    temp/edge_function_types.dart \
    test-publish/totalis_types/lib/totalis_types.dart \
    $TEST_VERSION
echo "  ✅ Types combined"

# Test 7: Install Dependencies and Validate
echo "📚 Testing package validation..."
cd test-publish/totalis_types

# Get dependencies
flutter pub get

# Check package size
SIZE=$(du -sk . | cut -f1)
echo "  → Package size: ${SIZE}KB"
if [ $SIZE -gt 500 ]; then
    echo "  ⚠️ WARNING: Package size exceeds 500KB"
else
    echo "  ✅ Package size is acceptable"
fi

# Test 8: Dry Run Publish
echo "🧪 Testing dry run publish..."
echo "  → Running flutter pub publish --dry-run..."
flutter pub publish --dry-run
echo "  ✅ Dry run publish successful"

cd ../..

# Test 9: Show Generated Types Summary
echo "📊 Generated Types Summary:"
echo "  → Combined types file size: $(wc -c < test-publish/totalis_types/lib/totalis_types.dart) bytes"
echo "  → Total lines: $(wc -l < test-publish/totalis_types/lib/totalis_types.dart)"

# Count classes in the generated file
EDGE_CLASSES=$(grep "^class " test-publish/totalis_types/lib/totalis_types.dart | wc -l)
echo "  → Total Dart classes: $EDGE_CLASSES"

echo ""
echo "🎉 All tests completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "  1. Enable OIDC publishing on pub.dev admin page"
echo "  2. Run actual workflow to test end-to-end"
echo "  3. Verify package publishes correctly"
echo ""
echo "🔗 Admin URL: https://pub.dev/packages/totalis_types/admin"
echo "🏷️ Tag pattern: types-v{{version}}"
echo "📁 Repository: zitrono/totalis"