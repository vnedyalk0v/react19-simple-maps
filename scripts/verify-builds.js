#!/usr/bin/env node

/**
 * Build Verification Script for @vnedyalk0v/react19-simple-maps
 *
 * This script verifies that ESM builds and type definitions have proper exports
 * and can be imported correctly.
 *
 * Usage: node scripts/verify-builds.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Expected exports from the package
const EXPECTED_EXPORTS = [
  'ComposableMap',
  'Geographies',
  'Geography',
  'Marker',
  'ZoomableGroup',
  'Sphere',
  'Graticule',
  'Line',
  'Annotation',
  'MapProvider',
  'MapContext',
  'useMapContext',
  'ZoomPanProvider',
  'ZoomPanContext',
  'useZoomPanContext',
  'useGeographies',
  'useZoomPan',
  'GeographyErrorBoundary',
  'MapWithMetadata',
  'createCoordinates',
  'createScaleExtent',
  'createTranslateExtent',
  'createLatitude',
  'createLongitude',
  'createParallels',
  'createGraticuleStep',
];

const BUILD_FILES = {
  es: 'dist/index.js',
  utils: 'dist/utils.js',
  types: 'dist/index.d.ts',
  typesUtils: 'dist/utils.d.ts',
};

class BuildVerifier {
  constructor() {
    this.results = {
      es: { success: false, exports: [], errors: [] },
      types: { success: false, exports: [], errors: [] },
      utils: { success: false, exports: [], errors: [] },
      typesUtils: { success: false, exports: [], errors: [] },
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m', // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m', // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m', // Reset
    };

    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  checkFileExists(filePath) {
    const fullPath = join(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      throw new Error(
        `Build file not found: ${filePath} (checked: ${fullPath})`,
      );
    }
    this.log(`✓ Found ${filePath}`, 'success');
    return fullPath;
  }

  async verifyESModule() {
    try {
      this.log('\n📦 Verifying ESM build...', 'info');
      const fullPath = this.checkFileExists(BUILD_FILES.es);

      // Dynamic import of ES module using file:// URL for better CI compatibility
      const fileUrl = `file://${fullPath}`;
      const esModule = await import(fileUrl);
      const exports = Object.keys(esModule);

      this.results.es.exports = exports;
      this.results.es.success = true;

      this.log(`✓ ESM exports: ${exports.length} found`, 'success');
      this.checkExports('ESM', exports);
    } catch (error) {
      this.results.es.errors.push(error.message);
      this.log(`✗ ESM verification failed: ${error.message}`, 'error');
    }
  }

  async verifyUtilsModule() {
    try {
      this.log('\n📦 Verifying utils ESM build...', 'info');
      const fullPath = this.checkFileExists(BUILD_FILES.utils);

      const fileUrl = `file://${fullPath}`;
      const utilsModule = await import(fileUrl);
      const exports = Object.keys(utilsModule);

      this.results.utils.exports = exports;
      this.results.utils.success = exports.length > 0;

      if (exports.length > 0) {
        this.log(`✓ Utils ESM exports: ${exports.length} found`, 'success');
      } else {
        throw new Error('Utils ESM build has no exports');
      }
    } catch (error) {
      this.results.utils.errors.push(error.message);
      this.log(`✗ Utils ESM verification failed: ${error.message}`, 'error');
    }
  }

  verifyTypeDefinitions(resultKey, filePath, label) {
    try {
      this.log(`\n📦 Verifying ${label} TypeScript definitions...`, 'info');
      const fullPath = this.checkFileExists(filePath);

      const typesContent = readFileSync(fullPath, 'utf8');

      const exportMatches =
        typesContent.match(
          /export\s+(?:declare\s+)?(?:const|function|class|interface|type)\s+(\w+)/g,
        ) || [];
      const exportDefaultMatches =
        typesContent.match(/export\s+\{\s*([^}]+)\s*\}/g) || [];

      let exports = [];

      exportMatches.forEach((match) => {
        const nameMatch = match.match(
          /export\s+(?:declare\s+)?(?:const|function|class|interface|type)\s+(\w+)/,
        );
        if (nameMatch) {
          exports.push(nameMatch[1]);
        }
      });

      exportDefaultMatches.forEach((match) => {
        const names = match
          .replace(/export\s*\{\s*/, '')
          .replace(/\s*\}/, '')
          .split(',');
        names.forEach((name) => {
          const cleanName = name.trim().split(' as ')[0].trim();
          if (cleanName && !exports.includes(cleanName)) {
            exports.push(cleanName);
          }
        });
      });

      this.results[resultKey].exports = exports;
      this.results[resultKey].success = exports.length > 0;

      this.log(
        `✓ ${label} TypeScript definitions: ${exports.length} exports found`,
        'success',
      );
    } catch (error) {
      this.results[resultKey].errors.push(error.message);
      this.log(
        `✗ ${label} TypeScript definitions verification failed: ${error.message}`,
        'error',
      );
    }
  }

  checkExports(buildType, actualExports) {
    const missing = EXPECTED_EXPORTS.filter(
      (exp) => !actualExports.includes(exp),
    );
    const extra = actualExports.filter(
      (exp) => !EXPECTED_EXPORTS.includes(exp),
    );

    if (missing.length > 0) {
      this.log(
        `⚠ ${buildType} missing exports: ${missing.join(', ')}`,
        'warning',
      );
    }

    if (extra.length > 0) {
      this.log(`ℹ ${buildType} extra exports: ${extra.join(', ')}`, 'info');
    }

    const coverage = (
      ((actualExports.length - extra.length) / EXPECTED_EXPORTS.length) *
      100
    ).toFixed(1);
    this.log(
      `📊 ${buildType} export coverage: ${coverage}%`,
      coverage >= 95 ? 'success' : 'warning',
    );
  }

  printSummary() {
    this.log('\n📋 Build Verification Summary', 'info');
    this.log('================================', 'info');

    const builds = ['es', 'utils', 'types', 'typesUtils'];
    let allPassed = true;

    builds.forEach((build) => {
      const result = this.results[build];
      const status = result.success ? '✓ PASS' : '✗ FAIL';
      const color = result.success ? 'success' : 'error';

      this.log(
        `${build.toUpperCase().padEnd(8)} ${status} (${result.exports.length} exports)`,
        color,
      );

      if (result.errors.length > 0) {
        result.errors.forEach((error) => {
          this.log(`  └─ ${error}`, 'error');
        });
        allPassed = false;
      }
    });

    this.log('\n' + '='.repeat(32), 'info');

    if (allPassed) {
      this.log('🎉 All builds verified successfully!', 'success');
      return true;
    } else {
      this.log('❌ Some builds failed verification!', 'error');
      return false;
    }
  }

  async run() {
    try {
      this.log('🔍 Starting build verification...', 'info');
      this.log(`Working directory: ${process.cwd()}`, 'info');

      await this.verifyESModule();
      await this.verifyUtilsModule();
      this.verifyTypeDefinitions('types', BUILD_FILES.types, 'Main');
      this.verifyTypeDefinitions('typesUtils', BUILD_FILES.typesUtils, 'Utils');

      const success = this.printSummary();
      process.exit(success ? 0 : 1);
    } catch (error) {
      this.log(`💥 Verification script failed: ${error.message}`, 'error');
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }
}

// Run verification
const verifier = new BuildVerifier();
verifier.run().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
