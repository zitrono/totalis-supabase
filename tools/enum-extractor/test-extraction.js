#!/usr/bin/env node

const { extractEnums } = require('./extract-enums');
const fs = require('fs');
const path = require('path');

/**
 * Test script for enum extraction
 * Validates the extraction process and compares with expected enums
 */

async function testExtraction() {
  console.log('🧪 Testing enum extraction...');
  
  const testConfigPath = path.join(__dirname, 'test-supadart.yaml');
  
  try {
    // Extract enums to test config
    const extractedEnums = await extractEnums(testConfigPath);
    
    // Expected enums based on our database schema
    const expectedEnums = [
      'sex',
      'role', 
      'content_type',
      'status',
      'recommendation_type',
      'interaction_type',
      'platform',
      'transcription_status',
      'log_level'
    ];
    
    console.log('\n📋 Validation Results:');
    
    // Check if all expected enums were found
    let allFound = true;
    expectedEnums.forEach(enumName => {
      if (extractedEnums[enumName]) {
        console.log(`  ✅ ${enumName}: [${extractedEnums[enumName].join(', ')}]`);
      } else {
        console.log(`  ❌ ${enumName}: NOT FOUND`);
        allFound = false;
      }
    });
    
    // Check for unexpected enums
    const extractedNames = Object.keys(extractedEnums);
    const unexpected = extractedNames.filter(name => !expectedEnums.includes(name));
    if (unexpected.length > 0) {
      console.log(`\n🔍 Additional enums found:`);
      unexpected.forEach(name => {
        console.log(`  📝 ${name}: [${extractedEnums[name].join(', ')}]`);
      });
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  Expected: ${expectedEnums.length}`);
    console.log(`  Found: ${extractedNames.length}`);
    console.log(`  Status: ${allFound ? '✅ ALL EXPECTED ENUMS FOUND' : '❌ MISSING ENUMS'}`);
    
    // Verify config file was created correctly
    if (fs.existsSync(testConfigPath)) {
      console.log(`  📁 Config file: ✅ Created successfully`);
      
      // Clean up test file
      fs.unlinkSync(testConfigPath);
      console.log(`  🧹 Test file cleaned up`);
    } else {
      console.log(`  📁 Config file: ❌ Not created`);
      allFound = false;
    }
    
    return allFound;
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  testExtraction()
    .then((success) => {
      if (success) {
        console.log('\n🎉 All tests passed! Enum extraction is working correctly.');
        process.exit(0);
      } else {
        console.log('\n❌ Some tests failed. Check the output above for details.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error.message);
      process.exit(1);
    });
}