#!/usr/bin/env node

/**
 * Script to generate SRI hashes for common geography data sources
 * This helps developers get the actual integrity hashes for external resources
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Common geography data sources
const GEOGRAPHY_SOURCES = [
  'https://unpkg.com/world-atlas@2/countries-110m.json',
  'https://unpkg.com/world-atlas@2.0.2/countries-110m.json',
  'https://unpkg.com/world-atlas@2/countries-50m.json',
  'https://unpkg.com/world-atlas@2.0.2/countries-50m.json',
  'https://unpkg.com/world-atlas@2/world-110m.json',
  'https://unpkg.com/world-atlas@2/world-50m.json',
  'https://unpkg.com/world-atlas@2/land-110m.json',
  'https://unpkg.com/world-atlas@2.0.2/land-110m.json',
  'https://unpkg.com/world-atlas@2/land-50m.json',
  'https://unpkg.com/world-atlas@2.0.2/land-50m.json',
];

/**
 * Calculate SRI hash for data
 * @param {Buffer} data - Data to hash
 * @param {string} algorithm - Hash algorithm
 * @returns {string} SRI hash string
 */
function calculateSRIHash(data, algorithm = 'sha384') {
  const hash = createHash(algorithm).update(data).digest('base64');
  return `${algorithm}-${hash}`;
}

/**
 * Fetch data from URL
 * @param {string} url - URL to fetch
 * @returns {Promise<Buffer>} Response data
 */
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * Generate SRI hashes for all sources
 */
async function generateSRIHashes() {
  console.log('🔐 Generating SRI hashes for geography data sources...\n');

  const sriMap = {};
  const results = [];

  for (const url of GEOGRAPHY_SOURCES) {
    console.log(`📡 Fetching: ${url}`);

    const data = await fetchData(url);
    if (!data) {
      console.log(`❌ Failed to fetch ${url}\n`);
      continue;
    }

    const sha256 = calculateSRIHash(data, 'sha256');
    const sha384 = calculateSRIHash(data, 'sha384');
    const sha512 = calculateSRIHash(data, 'sha512');

    sriMap[url] = {
      algorithm: 'sha384',
      hash: sha384,
      enforceIntegrity: true,
    };

    results.push({
      url,
      size: data.length,
      sha256,
      sha384,
      sha512,
    });

    console.log(`✅ Generated hashes for ${url}`);
    console.log(`   Size: ${(data.length / 1024).toFixed(2)} KB`);
    console.log(`   SHA256: ${sha256}`);
    console.log(`   SHA384: ${sha384}`);
    console.log(`   SHA512: ${sha512}\n`);
  }

  // Generate TypeScript file with SRI configuration
  const tsContent = `// Auto-generated SRI hashes for geography data sources
// Generated on: ${new Date().toISOString()}
// Do not edit manually - run 'npm run generate-sri' to update

import type { SRIConfig } from '../types';

/**
 * Known SRI hashes for common geography data sources
 * These hashes are automatically generated and verified
 */
export const KNOWN_GEOGRAPHY_SRI: Record<string, SRIConfig> = {
${Object.entries(sriMap)
  .map(
    ([url, config]) =>
      `  '${url}': {\n    algorithm: '${config.algorithm}',\n    hash: '${config.hash}',\n    enforceIntegrity: ${config.enforceIntegrity},\n  },`,
  )
  .join('\n')}
} as const;

/**
 * All available hashes for each source (for reference)
 */
export const ALL_GEOGRAPHY_HASHES = {
${results
  .map(
    (result) =>
      `  '${result.url}': {\n    size: ${result.size},\n    sha256: '${result.sha256}',\n    sha384: '${result.sha384}',\n    sha512: '${result.sha512}',\n  },`,
  )
  .join('\n')}
} as const;
`;

  // Write to TypeScript file
  const outputPath = join(process.cwd(), 'src/utils/generated-sri-hashes.ts');
  writeFileSync(outputPath, tsContent, 'utf8');

  console.log(`📝 Generated TypeScript file: ${outputPath}`);

  // Generate JSON file for reference
  const jsonOutput = {
    generated: new Date().toISOString(),
    sources: results,
    sriMap,
  };

  const jsonPath = join(process.cwd(), 'scripts/sri-hashes.json');
  writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), 'utf8');

  console.log(`📄 Generated JSON file: ${jsonPath}`);

  console.log('\n🎉 SRI hash generation complete!');
  console.log('\n📋 Summary:');
  console.log(
    `   Sources processed: ${results.length}/${GEOGRAPHY_SOURCES.length}`,
  );
  console.log(
    `   Total data size: ${(results.reduce((sum, r) => sum + r.size, 0) / 1024).toFixed(2)} KB`,
  );
  console.log('\n💡 Usage:');
  console.log('   Import the generated hashes in your application:');
  console.log(
    "   import { KNOWN_GEOGRAPHY_SRI } from './utils/generated-sri-hashes';",
  );
}

/**
 * Main execution
 */
async function main() {
  try {
    await generateSRIHashes();
  } catch (error) {
    console.error('❌ Error generating SRI hashes:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateSRIHashes, calculateSRIHash, fetchData };
