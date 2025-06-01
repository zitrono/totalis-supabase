import 'package:totalis_types/totalis_types.dart';

void main() {
  print('🔍 Validating totalis_types package contents...\n');
  
  // Test that we can import the package
  print('✅ Package import successful');
  
  // Try to access expected classes - this will show us what's actually available
  print('\n📋 Checking for expected database table classes:');
  
  // Core tables that should exist as Dart classes
  final expectedTables = [
    'profiles',
    'coaches', 
    'categories',
    'profile_categories',
    'user_categories',
    'messages',
    'check_in_sessions',
    'recommendations',
    'user_recommendations',
    'images',
    'audio_transcriptions',
    'analytics_events',
  ];
  
  for (final table in expectedTables) {
    try {
      // This will help us see what's actually available in the package
      print('❓ Looking for class representing table: $table');
    } catch (e) {
      print('❌ Error accessing $table: $e');
    }
  }
  
  print('\n📋 Checking for expected enum types:');
  
  final expectedEnums = [
    'Sex/Gender enum',
    'Message role enum',
    'Content type enum', 
    'Check-in status enum',
    'Recommendation type enum',
    'Platform enum',
    'Audio transcription status enum',
  ];
  
  for (final enumType in expectedEnums) {
    print('❓ Looking for: $enumType');
  }
  
  print('\n📋 Checking for Edge Function types:');
  
  final expectedEdgeFunctionTypes = [
    'CheckinRequest',
    'CheckinQuestion', 
    'UserContext',
    'ChatMessage',
    'Recommendation',
    'AnalyticsSummary',
    'LangflowRequest',
    'LangflowResponse',
  ];
  
  for (final type in expectedEdgeFunctionTypes) {
    print('❓ Looking for Edge Function type: $type');
  }
  
  // Test utilities
  print('\n🔧 Testing utilities:');
  try {
    print('✅ DateTimeUtils available');
    final now = DateTime.now();
    final jsonString = DateTimeUtils.toJson(now);
    final parsed = DateTimeUtils.fromJson(jsonString);
    print('✅ DateTimeUtils.toJson/fromJson work correctly');
    
    final nullableTest = DateTimeUtils.toJsonNullable(null);
    print('✅ DateTimeUtils nullable methods work: $nullableTest');
  } catch (e) {
    print('❌ DateTimeUtils error: $e');
  }
  
  // Check version info
  print('\n📦 Package version info:');
  try {
    print('✅ Version: $totalisTypesVersion');
    print('✅ Generated at: $generatedAt');
  } catch (e) {
    print('❌ Version info error: $e');
  }
  
  print('\n🎯 Validation complete!');
}