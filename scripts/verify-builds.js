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
import { dirname, join, relative, sep } from 'path';
import assert from 'node:assert/strict';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { execFileSync } from 'node:child_process';
import { readBundleFiles } from './bundle-files.js';

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
      this.esModule = esModule;
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
      await this.verifySharedConfiguration(utilsModule);
      this.verifyPackagedChunks();
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

  async verifySharedConfiguration(utils) {
    assert.ok(
      this.esModule,
      'Main ESM entry must import successfully before checking shared configuration',
    );
    const dom = new JSDOM('<div id="map"></div>');
    const globals = [
      'window',
      'document',
      'navigator',
      'fetch',
      'IS_REACT_ACT_ENVIRONMENT',
    ];
    const originalGlobals = new Map(
      globals.map((key) => [
        key,
        Object.getOwnPropertyDescriptor(globalThis, key),
      ]),
    );
    const security = utils.DEFAULT_GEOGRAPHY_FETCH_CONFIG;
    const integrity = utils.DEFAULT_SRI_CONFIG;
    let requests = 0;
    let root;
    try {
      for (const [key, value] of Object.entries({
        window: dom.window,
        document: dom.window.document,
        navigator: dom.window.navigator,
        IS_REACT_ACT_ENVIRONMENT: true,
        fetch: async () => {
          requests++;
          return new Response(
            JSON.stringify({ type: 'FeatureCollection', features: [] }),
            { headers: { 'content-type': 'application/json' } },
          );
        },
      }))
        Object.defineProperty(globalThis, key, {
          value,
          configurable: true,
          writable: true,
        });

      const url = 'https://8.8.8.8/cross-entry.json';
      const renderGeographies = async () => {
        let caught;
        root = createRoot(dom.window.document.getElementById('map'));
        await act(async () => {
          root.render(
            createElement(
              this.esModule.ComposableMap,
              null,
              createElement(
                this.esModule.Geographies,
                {
                  geography: url,
                  onGeographyError: (error) => {
                    caught = error;
                  },
                },
                () => null,
              ),
            ),
          );
        });
        await act(async () => root.unmount());
        root = undefined;
        return caught;
      };

      utils.enableStrictSRI();
      await assert.rejects(utils.fetchGeographiesCache(url), /integrity|SRI/i);
      assert.match(
        (await renderGeographies())?.message ?? '',
        /integrity|SRI/i,
        'Main entry must honor strict integrity configuration set through utils',
      );
      assert.equal(
        requests,
        0,
        'Strict integrity must reject unknown sources before fetching',
      );

      utils.configureSRI(integrity);
      utils.configureGeographySecurity({ MAX_RESPONSE_SIZE: 1 });
      await assert.rejects(utils.fetchGeographiesCache(url), /too large/i);
      assert.match(
        (await renderGeographies())?.message ?? '',
        /too large/i,
        'Main entry must honor geography security configuration set through utils',
      );
      this.log(
        '✓ Shared integrity and geography security configuration enforced across entrypoints',
        'success',
      );
    } finally {
      if (root) await act(async () => root.unmount());
      utils.configureSRI(integrity);
      utils.configureGeographySecurity(security);
      dom.window.close();
      for (const [key, descriptor] of originalGlobals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  }

  verifyPackagedChunks() {
    const [pack] = JSON.parse(
      execFileSync(
        process.platform === 'win32' ? 'npm.cmd' : 'npm',
        ['pack', '--dry-run', '--ignore-scripts', '--json'],
        {
          encoding: 'utf8',
          shell: process.platform === 'win32',
        },
      ),
    );
    const packaged = new Set(pack.files.map((file) => file.path));
    for (const entry of [BUILD_FILES.es, BUILD_FILES.utils]) {
      const reachable = new Map();
      readBundleFiles(join(process.cwd(), entry), reachable);
      for (const path of reachable.keys()) {
        assert.ok(
          packaged.has(relative(process.cwd(), path).split(sep).join('/')),
          `Missing published chunk: ${path}`,
        );
      }
    }
    this.log(
      '✓ Published package includes every entrypoint dependency',
      'success',
    );
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
