#!/usr/bin/env node
import { Project, InterfaceDeclaration, TypeAliasDeclaration, EnumDeclaration } from 'ts-morph';
import { createGenerator } from 'ts-json-schema-generator';
import { quicktype, InputData, JSONSchemaInput } from 'quicktype-core';
import * as fs from 'fs';
import * as path from 'path';

interface ParsedType {
  name: string;
  dartCode: string;
  functionName: string;
  typeCategory: 'request' | 'response' | 'shared' | 'enum';
}

export async function parseEdgeFunctionsEnhanced(functionsDir: string, outputDir: string): Promise<void> {
  console.log(`Enhanced Edge Function Parsing from: ${functionsDir}`);
  
  // Initialize ts-morph project
  const project = new Project({
    compilerOptions: {
      target: 4, // ES2017
      module: 1, // CommonJS
      skipLibCheck: true,
      allowJs: true,
    },
    skipAddingFilesFromTsConfig: true,
  });

  const allTypes: ParsedType[] = [];
  const allInterfaces: InterfaceDeclaration[] = [];
  const allTypeAliases: TypeAliasDeclaration[] = [];
  const allEnums: EnumDeclaration[] = [];

  // First pass: Collect all TypeScript definitions
  console.log('🔍 Collecting TypeScript definitions...');
  
  // Parse shared types first
  const sharedTypesPath = path.join(functionsDir, '_shared/types.ts');
  if (fs.existsSync(sharedTypesPath)) {
    console.log('📁 Processing _shared/types.ts');
    const sharedFile = project.addSourceFileAtPath(sharedTypesPath);
    allInterfaces.push(...sharedFile.getInterfaces());
    allTypeAliases.push(...sharedFile.getTypeAliases());
    allEnums.push(...sharedFile.getEnums());
  }

  // Parse each function directory
  const functionDirs = fs.readdirSync(functionsDir)
    .filter(name => !name.startsWith('_') && !name.startsWith('.'))
    .filter(name => fs.statSync(path.join(functionsDir, name)).isDirectory());

  for (const functionName of functionDirs) {
    const indexPath = path.join(functionsDir, functionName, 'index.ts');
    if (fs.existsSync(indexPath)) {
      console.log(`📁 Processing function: ${functionName}`);
      
      const sourceFile = project.addSourceFileAtPath(indexPath);
      allInterfaces.push(...sourceFile.getInterfaces());
      allTypeAliases.push(...sourceFile.getTypeAliases());  
      allEnums.push(...sourceFile.getEnums());
    }
  }

  console.log(`📊 Found ${allInterfaces.length} interfaces, ${allTypeAliases.length} type aliases, ${allEnums.length} enums`);

  // Second pass: Generate comprehensive Dart code using enhanced extraction
  console.log('🔄 Generating enhanced Dart types...');

  // Process interfaces with complete property extraction
  for (const iface of allInterfaces) {
    const dartCode = await generateEnhancedDartFromInterface(iface);
    if (dartCode) {
      allTypes.push({
        name: iface.getName(),
        dartCode,
        functionName: determineSourceFunction(iface, functionsDir),
        typeCategory: categorizeType(iface.getName())
      });
    }
  }

  // Process type aliases
  for (const typeAlias of allTypeAliases) {
    const dartCode = await generateEnhancedDartFromTypeAlias(typeAlias);
    if (dartCode) {
      allTypes.push({
        name: typeAlias.getName(),
        dartCode,
        functionName: determineSourceFunction(typeAlias, functionsDir),
        typeCategory: categorizeType(typeAlias.getName())
      });
    }
  }

  // Process enums  
  for (const enumDecl of allEnums) {
    const dartCode = generateEnhancedDartFromEnum(enumDecl);
    if (dartCode) {
      allTypes.push({
        name: enumDecl.getName(),
        dartCode,
        functionName: determineSourceFunction(enumDecl, functionsDir),
        typeCategory: 'enum'
      });
    }
  }

  // Generate combined Dart file
  const dartCode = generateCombinedDartFile(allTypes);
  
  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Write the output file
  const outputPath = path.join(outputDir, 'edge_function_types.dart');
  fs.writeFileSync(outputPath, dartCode);
  
  console.log(`✅ Generated ${allTypes.length} types to: ${outputPath}`);
}

function determineSourceFunction(node: any, functionsDir: string): string {
  const sourceFile = node.getSourceFile();
  const filePath = sourceFile.getFilePath();
  
  if (filePath.includes('_shared/types.ts')) {
    return '_shared';
  }
  
  // Extract function name from path
  const relativePath = path.relative(functionsDir, filePath);
  const pathParts = relativePath.split(path.sep);
  return pathParts[0] || 'unknown';
}

function categorizeType(typeName: string): 'request' | 'response' | 'shared' | 'enum' {
  const lowerName = typeName.toLowerCase();
  if (lowerName.includes('request') || lowerName.includes('req')) return 'request';
  if (lowerName.includes('response') || lowerName.includes('resp')) return 'response';
  if (lowerName.includes('enum') || typeName.endsWith('Type') || typeName.endsWith('Status')) return 'enum';
  return 'shared';
}

async function generateEnhancedDartFromInterface(iface: InterfaceDeclaration): Promise<string | null> {
  try {
    const interfaceName = iface.getName();
    
    // Use comprehensive property extraction methods from ts-morph
    const properties = iface.getProperties();
    const methods = iface.getMethods();
    const callSignatures = iface.getCallSignatures();
    const constructSignatures = iface.getConstructSignatures();
    
    // Generate properties with enhanced type mapping
    const dartProperties = properties.map(prop => {
      const name = prop.getName();
      const typeNode = prop.getTypeNode();
      const isOptional = prop.hasQuestionToken();
      
      // Enhanced type mapping
      let dartType = 'String';
      if (typeNode) {
        const typeText = typeNode.getText();
        dartType = mapTypeScriptToDart(typeText);
      }
      
      const nullableSuffix = isOptional ? '?' : '';
      return `  final ${dartType}${nullableSuffix} ${name};`;
    }).join('\n');

    // Include method signatures as comments for documentation
    const methodComments = methods.length > 0 ? 
      '\n  // Methods:\n' + methods.map(method => 
        `  // ${method.getName()}(${method.getParameters().map(p => p.getText()).join(', ')})`
      ).join('\n') : '';

    const constructor = `  ${interfaceName}({\n` + 
      properties.map(prop => {
        const name = prop.getName();
        const isOptional = prop.hasQuestionToken();
        const required = isOptional ? '' : 'required ';
        return `    ${required}this.${name},`;
      }).join('\n') + '\n  });';

    const fromJson = `  factory ${interfaceName}.fromJson(Map<String, dynamic> json) => ${interfaceName}(\n` +
      properties.map(prop => {
        const name = prop.getName();
        const typeNode = prop.getTypeNode();
        const jsonAccessor = generateJsonAccessor(name, typeNode?.getText() || 'string');
        return `        ${name}: ${jsonAccessor},`;
      }).join('\n') + '\n      );';

    const toJson = `  Map<String, dynamic> toJson() => {\n` +
      properties.map(prop => {
        const name = prop.getName();
        return `        '${name}': ${name},`;
      }).join('\n') + '\n      };';

    return `class ${interfaceName} {${methodComments}
${dartProperties}

${constructor}

${fromJson}

${toJson}
}`;
  } catch (error) {
    console.warn(`Failed to generate Dart for interface ${iface.getName()}:`, error);
    return null;
  }
}

function mapTypeScriptToDart(typeText: string): string {
  // Enhanced TypeScript to Dart type mapping
  if (typeText.includes('string')) return 'String';
  if (typeText.includes('number')) return 'int';
  if (typeText.includes('boolean')) return 'bool';
  if (typeText.includes('any')) return 'Map<String, dynamic>';
  if (typeText.includes('[]')) return 'List<dynamic>';
  if (typeText.includes('Array<string>')) return 'List<String>';
  if (typeText.includes('Array<number>')) return 'List<int>';
  if (typeText.includes('Array<boolean>')) return 'List<bool>';
  if (typeText.includes('Date')) return 'DateTime';
  if (typeText.includes('Record<string,')) return 'Map<String, dynamic>';
  if (typeText.includes('Promise<')) return 'Future<dynamic>';
  
  // Handle union types
  if (typeText.includes('|')) {
    return 'dynamic'; // Fall back to dynamic for complex unions
  }
  
  return 'String'; // Default fallback
}

function generateJsonAccessor(propertyName: string, typeText: string): string {
  if (typeText.includes('Date')) {
    return `json['${propertyName}'] != null ? DateTime.parse(json['${propertyName}']) : null`;
  }
  return `json['${propertyName}']`;
}

async function generateEnhancedDartFromTypeAlias(typeAlias: TypeAliasDeclaration): Promise<string | null> {
  try {
    const aliasName = typeAlias.getName();
    const typeNode = typeAlias.getTypeNode();
    
    if (typeNode) {
      const typeText = typeNode.getText();
      
      // Handle union types as enums
      if (typeText.includes('|')) {
        const unionTypes = typeText.split('|')
          .map(t => t.trim().replace(/['"]/g, ''))
          .filter(t => t && !t.includes('null') && !t.includes('undefined'));
        
        if (unionTypes.length > 1) {
          return `enum ${aliasName} {
${unionTypes.map(type => `  ${type},`).join('\n')}
}`;
        }
      }
      
      // Handle simple type mappings
      const dartType = mapTypeScriptToDart(typeText);
      return `typedef ${aliasName} = ${dartType};`;
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to generate Dart for type alias ${typeAlias.getName()}:`, error);
    return null;
  }
}

function generateEnhancedDartFromEnum(enumDecl: EnumDeclaration): string | null {
  try {
    const enumName = enumDecl.getName();
    const members = enumDecl.getMembers();
    
    const dartMembers = members.map((member: any) => {
      const name = member.getName();
      const value = member.getValue();
      return `  ${name}('${value || name}')`;
    }).join(',\n');

    return `enum ${enumName} {
${dartMembers};

  const ${enumName}(this.value);
  final String value;
}`;
  } catch (error) {
    console.warn(`Failed to generate Dart for enum ${enumDecl.getName()}:`, error);
    return null;
  }
}

function generateCombinedDartFile(types: ParsedType[]): string {
  const requestTypes = types.filter(t => t.typeCategory === 'request');
  const responseTypes = types.filter(t => t.typeCategory === 'response');
  const sharedTypes = types.filter(t => t.typeCategory === 'shared');
  const enumTypes = types.filter(t => t.typeCategory === 'enum');

  const sections = [
    '// Enhanced Edge Function Types - Auto Generated',
    '// DO NOT EDIT - This file is automatically generated',
    '// Generated with improved interface extraction and type mapping',
    '',
    'import \'package:json_annotation/json_annotation.dart\';',
    '',
    'part \'edge_function_types.g.dart\';',
    '',
  ];

  if (enumTypes.length > 0) {
    sections.push('// ======================');
    sections.push('// ENUMS');
    sections.push('// ======================');
    enumTypes.forEach(type => {
      sections.push(`// From ${type.functionName}`);
      sections.push(type.dartCode);
      sections.push('');
    });
  }

  if (sharedTypes.length > 0) {
    sections.push('// ======================');
    sections.push('// SHARED TYPES');
    sections.push('// ======================');
    sharedTypes.forEach(type => {
      sections.push(`// From ${type.functionName}`);
      sections.push(type.dartCode);
      sections.push('');
    });
  }

  if (requestTypes.length > 0) {
    sections.push('// ======================');
    sections.push('// REQUEST TYPES');
    sections.push('// ======================');
    requestTypes.forEach(type => {
      sections.push(`// From ${type.functionName}`);
      sections.push(type.dartCode);
      sections.push('');
    });
  }

  if (responseTypes.length > 0) {
    sections.push('// ======================');
    sections.push('// RESPONSE TYPES');
    sections.push('// ======================');
    responseTypes.forEach(type => {
      sections.push(`// From ${type.functionName}`);
      sections.push(type.dartCode);
      sections.push('');
    });
  }

  sections.push('// ======================');
  sections.push('// STATISTICS');
  sections.push('// ======================');
  sections.push(`// Total types generated: ${types.length}`);
  sections.push(`// Enums: ${enumTypes.length}`);
  sections.push(`// Shared: ${sharedTypes.length}`);  
  sections.push(`// Requests: ${requestTypes.length}`);
  sections.push(`// Responses: ${responseTypes.length}`);

  return sections.join('\n');
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');

  if (inputIndex === -1 || outputIndex === -1) {
    console.error('Usage: node enhanced-parser.js --input <functions_dir> --output <output_dir>');
    process.exit(1);
  }

  const functionsDir = args[inputIndex + 1];
  const outputDir = args[outputIndex + 1];

  parseEdgeFunctionsEnhanced(functionsDir, outputDir)
    .then(() => {
      console.log('✅ Enhanced Edge Function parsing completed successfully');
    })
    .catch((error) => {
      console.error('❌ Error parsing Edge Functions:', error);
      process.exit(1);
    });
}