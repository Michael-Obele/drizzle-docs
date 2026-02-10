import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const rootDir = join(import.meta.dir, '..');
const packageJsonPath = join(rootDir, 'package.json');
const mcpServerPath = join(rootDir, 'src/mastra/mcp/drizzle-docs-mcp.ts');

function syncVersions() {
  try {
    // Read package.json version
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version;

    if (!version) {
      console.error('❌ No version found in package.json');
      process.exit(1);
    }

    console.log(`🔄 Syncing version ${version} to MCP server...`);

    // Update MCP server file
    let mcpContent = readFileSync(mcpServerPath, 'utf-8');
    const versionRegex = /version:\s*"[^"]*"/;
    
    if (versionRegex.test(mcpContent)) {
      mcpContent = mcpContent.replace(versionRegex, `version: "${version}"`);
      writeFileSync(mcpServerPath, mcpContent);
      console.log('✅ Updated src/mastra/mcp/drizzle-docs-mcp.ts');
    } else {
      console.error('❌ Could not find version field in MCP server file');
    }

  } catch (error) {
    console.error('❌ Error syncing versions:', error);
    process.exit(1);
  }
}

syncVersions();
