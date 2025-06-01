#!/usr/bin/env node
import { Project, InterfaceDeclaration, TypeAliasDeclaration, Node } from 'ts-morph';
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

export async function parseEdgeFunctions(functionsDir: string, outputDir: string): Promise<void> {
  console.log(`Parsing Edge Functions from: ${functionsDir}`);
  
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

  // Add all TypeScript files from functions directory
  const functionDirs = fs.readdirSync(functionsDir)
    .filter(name => !name.startsWith('_') && !name.startsWith('.'))
    .filter(name => fs.statSync(path.join(functionsDir, name)).isDirectory());

  const allTypes: ParsedType[] = [];

  // Parse shared types first
  const sharedTypesPath = path.join(functionsDir, '_shared/types.ts');
  if (fs.existsSync(sharedTypesPath)) {
    const sharedFile = project.addSourceFileAtPath(sharedTypesPath);
    const sharedTypes = await extractTypesFromFile(sharedFile, '_shared');
    allTypes.push(...sharedTypes);
  }

  // Parse each function directory
  for (const functionName of functionDirs) {
    const indexPath = path.join(functionsDir, functionName, 'index.ts');
    if (fs.existsSync(indexPath)) {
      console.log(`Processing function: ${functionName}`);
      
      const sourceFile = project.addSourceFileAtPath(indexPath);
      const functionTypes = await extractTypesFromFile(sourceFile, functionName);
      allTypes.push(...functionTypes);
    }
  }

  // Generate combined Dart file
  const dartCode = generateCombinedDartFile(allTypes);
  
  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Write the output file
  const outputPath = path.join(outputDir, 'edge_function_types.dart');
  fs.writeFileSync(outputPath, dartCode);
  
  console.log(`Generated ${allTypes.length} types to: ${outputPath}`);
}

async function extractTypesFromFile(sourceFile: any, functionName: string): Promise<ParsedType[]> {
  const types: ParsedType[] = [];
  
  try {
    // Extract interfaces
    const interfaces = sourceFile.getInterfaces();
    for (const iface of interfaces) {
      const dartCode = await generateDartFromInterface(iface);
      if (dartCode) {
        types.push({
          name: iface.getName(),
          dartCode,
          functionName,
          typeCategory: categorizeType(iface.getName())
        });
      }
    }

    // Extract type aliases
    const typeAliases = sourceFile.getTypeAliases();
    for (const typeAlias of typeAliases) {
      const dartCode = await generateDartFromTypeAlias(typeAlias);
      if (dartCode) {
        types.push({
          name: typeAlias.getName(),
          dartCode,
          functionName,
          typeCategory: categorizeType(typeAlias.getName())
        });
      }
    }

    // Extract enums
    const enums = sourceFile.getEnums();
    for (const enumDecl of enums) {
      const dartCode = generateDartFromEnum(enumDecl);
      if (dartCode) {
        types.push({
          name: enumDecl.getName(),
          dartCode,
          functionName,
          typeCategory: 'enum'
        });
      }
    }
  } catch (error) {
    console.warn(`Error processing ${functionName}:`, error);
  }

  return types;
}

function categorizeType(typeName: string): 'request' | 'response' | 'shared' | 'enum' {
  const lowerName = typeName.toLowerCase();
  if (lowerName.includes('request') || lowerName.includes('req')) return 'request';
  if (lowerName.includes('response') || lowerName.includes('resp')) return 'response';
  if (lowerName.includes('enum') || typeName.endsWith('Type') || typeName.endsWith('Status')) return 'enum';
  return 'shared';
}

async function generateDartFromInterface(iface: InterfaceDeclaration): Promise<string | null> {
  try {
    // Generate a simple Dart class manually from the interface
    const interfaceName = iface.getName();
    const properties = iface.getProperties();
    
    const dartProperties = properties.map(prop => {
      const name = prop.getName();
      const typeNode = prop.getTypeNode();
      const isOptional = prop.hasQuestionToken();
      
      // Simple type mapping
      let dartType = 'String';
      if (typeNode) {
        const typeText = typeNode.getText();
        if (typeText.includes('string')) dartType = 'String';
        else if (typeText.includes('number')) dartType = 'int';
        else if (typeText.includes('boolean')) dartType = 'bool';
        else if (typeText.includes('any')) dartType = 'Map<String, dynamic>';
        else if (typeText.includes('[]')) dartType = 'List<dynamic>';
      }
      
      const nullableSuffix = isOptional ? '?' : '';
      return `  final ${dartType}${nullableSuffix} ${name};`;
    }).join('\n');

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
        return `        ${name}: json['${name}'],`;
      }).join('\n') + '\n      );';

    const toJson = `  Map<String, dynamic> toJson() => {\n` +
      properties.map(prop => {
        const name = prop.getName();
        return `        '${name}': ${name},`;
      }).join('\n') + '\n      };';

    return `class ${interfaceName} {
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

async function generateDartFromTypeAlias(typeAlias: TypeAliasDeclaration): Promise<string | null> {
  try {
    // For simple type aliases, just generate a typedef
    const aliasName = typeAlias.getName();
    const typeNode = typeAlias.getTypeNode();
    
    if (typeNode) {
      const typeText = typeNode.getText();
      
      // Handle union types
      if (typeText.includes('|')) {
        const unionTypes = typeText.split('|').map(t => t.trim().replace(/['"]/g, ''));
        return `enum ${aliasName} {
${unionTypes.map(type => `  ${type},`).join('\n')}
}`;
      }
      
      // Handle simple type mappings
      let dartType = 'String';
      if (typeText.includes('string')) dartType = 'String';
      else if (typeText.includes('number')) dartType = 'int';
      else if (typeText.includes('boolean')) dartType = 'bool';
      
      return `typedef ${aliasName} = ${dartType};`;
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to generate Dart for type alias ${typeAlias.getName()}:`, error);
    return null;
  }
}

function generateDartFromEnum(enumDecl: any): string | null {
  try {
    const enumName = enumDecl.getName();
    const members = enumDecl.getMembers();
    
    const dartMembers = members.map((member: any) => {
      const name = member.getName();
      const value = member.getValue() || `'${name}'`;
      return `  ${name}(${value})`;
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
    '// Edge Function Types - Auto Generated',
    '// DO NOT EDIT - This file is automatically generated',
    '',
    'import \'package:json_annotation/json_annotation.dart\';',
    '',
    'part \'edge_function_types.g.dart\';',
    '',
  ];

  if (enumTypes.length > 0) {
    sections.push('// Enums');
    enumTypes.forEach(type => {
      sections.push(`// From ${type.functionName}`);
      sections.push(type.dartCode);
      sections.push('');
    });
  }

  if (sharedTypes.length > 0) {
    sections.push('// Shared Types');
    sharedTypes.forEach(type => {
      sections.push(`// From ${type.functionName}`);
      sections.push(type.dartCode);
      sections.push('');
    });
  }

  if (requestTypes.length > 0) {
    sections.push('// Request Types');
    requestTypes.forEach(type => {
      sections.push(`// From ${type.functionName}`);
      sections.push(type.dartCode);
      sections.push('');
    });
  }

  if (responseTypes.length > 0) {
    sections.push('// Response Types');
    responseTypes.forEach(type => {
      sections.push(`// From ${type.functionName}`);
      sections.push(type.dartCode);
      sections.push('');
    });
  }

  return sections.join('\n');
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');

  if (inputIndex === -1 || outputIndex === -1) {
    console.error('Usage: node parser.js --input <functions_dir> --output <output_dir>');
    process.exit(1);
  }

  const functionsDir = args[inputIndex + 1];
  const outputDir = args[outputIndex + 1];

  parseEdgeFunctions(functionsDir, outputDir)
    .then(() => {
      console.log('Edge Function parsing completed successfully');
    })
    .catch((error) => {
      console.error('Error parsing Edge Functions:', error);
      process.exit(1);
    });
}