#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync, brotliCompressSync } from 'zlib';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Enhanced bundle monitoring with React 19 optimizations tracking
const BUNDLE_TARGETS = {
  'dist/index.js': {
    name: 'ESM Bundle (main)',
    maxRaw: 120 * 1024, // 120KB
    maxGzip: 35 * 1024, // 35KB
    maxBrotli: 30 * 1024, // 30KB
    priority: 'high',
    description: 'Modern ESM bundle for bundlers',
  },
  'dist/utils.js': {
    name: 'ESM Bundle (utils)',
    maxRaw: 80 * 1024, // 80KB
    maxGzip: 25 * 1024, // 25KB
    maxBrotli: 22 * 1024, // 22KB
    priority: 'medium',
    description: 'ESM utilities bundle for direct imports',
  },
  'dist/index.d.ts': {
    name: 'TypeScript Definitions (main)',
    maxRaw: 50 * 1024, // 50KB
    maxGzip: 10 * 1024, // 10KB
    maxBrotli: 8 * 1024, // 8KB
    priority: 'low',
    description: 'TypeScript type definitions',
  },
  'dist/utils.d.ts': {
    name: 'TypeScript Definitions (utils)',
    maxRaw: 40 * 1024, // 40KB
    maxGzip: 8 * 1024, // 8KB
    maxBrotli: 7 * 1024, // 7KB
    priority: 'low',
    description: 'TypeScript type definitions for utils',
  },
};

// React 19 optimization tracking
const REACT19_OPTIMIZATIONS = {
  concurrentFeatures: {
    name: 'React 19 Concurrent Features',
    expectedSavings: '5-10%',
    indicators: ['useTransition', 'useDeferredValue', 'useOptimistic'],
  },
  consoleStripping: {
    name: 'Console Statement Removal',
    expectedSavings: '2-5%',
    indicators: ['console.log', 'console.warn', 'console.debug'],
  },
  treeShaking: {
    name: 'Enhanced Tree Shaking',
    expectedSavings: '10-15%',
    indicators: ['unused exports', 'dead code'],
  },
  compression: {
    name: 'Advanced Compression',
    expectedSavings: '15-25%',
    indicators: ['terser optimization', 'gzip', 'brotli'],
  },
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle(filePath) {
  const fullPath = join(projectRoot, filePath);
  const config = BUNDLE_TARGETS[filePath];

  if (!existsSync(fullPath)) {
    return {
      exists: false,
      path: filePath,
      name: config?.name || filePath,
      error: 'File not found',
    };
  }

  try {
    const content = readFileSync(fullPath);
    const rawSize = content.length;
    const gzipSize = gzipSync(content).length;
    const brotliSize = brotliCompressSync
      ? brotliCompressSync(content).length
      : null;

    // Analyze content for React 19 optimizations
    const contentStr = content.toString();
    const optimizationAnalysis = analyzeOptimizations(contentStr, filePath);

    return {
      exists: true,
      path: filePath,
      name: config.name,
      description: config.description,
      priority: config.priority,
      sizes: {
        raw: rawSize,
        gzip: gzipSize,
        brotli: brotliSize,
        rawFormatted: formatBytes(rawSize),
        gzipFormatted: formatBytes(gzipSize),
        brotliFormatted: brotliSize ? formatBytes(brotliSize) : 'N/A',
      },
      thresholds: {
        raw: config.maxRaw,
        gzip: config.maxGzip,
        brotli: config.maxBrotli,
        rawFormatted: formatBytes(config.maxRaw),
        gzipFormatted: formatBytes(config.maxGzip),
        brotliFormatted: formatBytes(config.maxBrotli),
      },
      compliance: {
        raw: rawSize <= config.maxRaw,
        gzip: gzipSize <= config.maxGzip,
        brotli: brotliSize ? brotliSize <= config.maxBrotli : true,
      },
      utilization: {
        raw: parseFloat(((rawSize / config.maxRaw) * 100).toFixed(1)),
        gzip: parseFloat(((gzipSize / config.maxGzip) * 100).toFixed(1)),
        brotli: brotliSize
          ? parseFloat(((brotliSize / config.maxBrotli) * 100).toFixed(1))
          : null,
        rawFormatted: ((rawSize / config.maxRaw) * 100).toFixed(1) + '%',
        gzipFormatted: ((gzipSize / config.maxGzip) * 100).toFixed(1) + '%',
        brotliFormatted: brotliSize
          ? ((brotliSize / config.maxBrotli) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      optimizations: optimizationAnalysis,
    };
  } catch (error) {
    return {
      exists: false,
      path: filePath,
      name: config?.name || filePath,
      error: error.message,
    };
  }
}

/**
 * Optimizations that are not applicable to TypeScript definition files.
 * These checks look for runtime code patterns that never appear in .d.ts
 * bundles, so marking them as "optimized" or "applied" would be misleading.
 */
const RUNTIME_ONLY_OPTIMIZATIONS = new Set([
  'concurrentFeatures',
  'consoleStripping',
]);

function analyzeOptimizations(content, filePath = '') {
  const analysis = {};
  const isDefinitionFile = filePath.endsWith('.d.ts');

  Object.entries(REACT19_OPTIMIZATIONS).forEach(([key, optimization]) => {
    // For .d.ts bundles, runtime-only optimizations are not applicable
    if (isDefinitionFile && RUNTIME_ONLY_OPTIMIZATIONS.has(key)) {
      analysis[key] = {
        name: optimization.name,
        expectedSavings: optimization.expectedSavings,
        applied: false,
        foundIndicators: null,
        status: 'not_applicable',
      };
      return;
    }

    const indicators = optimization.indicators;
    const foundIndicators = indicators.filter((indicator) =>
      content.includes(indicator),
    );

    const hasIndicators = foundIndicators.length > 0;

    analysis[key] = {
      name: optimization.name,
      expectedSavings: optimization.expectedSavings,
      applied: !hasIndicators, // Optimization applied if indicators not found in output
      foundIndicators: hasIndicators ? foundIndicators : null,
      status: !hasIndicators ? 'optimized' : 'needs-optimization',
    };
  });

  return analysis;
}

function generateEnhancedReport() {
  const bundlePaths = Object.keys(BUNDLE_TARGETS);
  const analyses = bundlePaths.map(analyzeBundle);

  // Get git information for tracking.
  // - BUNDLE_REPORT_REDACT_GIT=true  → omit the entire git object from the report
  // - Otherwise, the branch name is always redacted to avoid leaking sensitive
  //   branch names (e.g. "fix/security-findings-sec001-003") into CI artifacts.
  const redactGit =
    process.env.BUNDLE_REPORT_REDACT_GIT === 'true' ||
    process.env.BUNDLE_REPORT_REDACT_GIT === '1';
  let gitInfo = {};
  if (!redactGit) {
    try {
      gitInfo = {
        commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
        branch: '<redacted>',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      gitInfo = { error: 'Git information unavailable' };
    }
  }

  const existingBundles = analyses.filter((a) => a.exists);
  const totalRawSize = existingBundles.reduce((sum, a) => sum + a.sizes.raw, 0);
  const totalGzipSize = existingBundles.reduce(
    (sum, a) => sum + a.sizes.gzip,
    0,
  );
  const totalBrotliSize = existingBundles.reduce(
    (sum, a) => sum + (a.sizes.brotli || 0),
    0,
  );

  return {
    timestamp: new Date().toISOString(),
    git: redactGit ? null : gitInfo,
    bundles: analyses,
    summary: {
      totalBundles: analyses.length,
      existingBundles: existingBundles.length,
      compliantBundles: existingBundles.filter(
        (a) => a.compliance.raw && a.compliance.gzip && a.compliance.brotli,
      ).length,
      totalSizes: {
        raw: totalRawSize,
        gzip: totalGzipSize,
        brotli: totalBrotliSize,
        rawFormatted: formatBytes(totalRawSize),
        gzipFormatted: formatBytes(totalGzipSize),
        brotliFormatted: formatBytes(totalBrotliSize),
      },
    },
    react19Optimizations: analyzeGlobalOptimizations(existingBundles),
  };
}

function analyzeGlobalOptimizations(bundles) {
  const globalAnalysis = {};

  Object.keys(REACT19_OPTIMIZATIONS).forEach((key) => {
    const bundleResults = bundles
      .map((bundle) => bundle.optimizations?.[key])
      .filter(Boolean);
    // Exclude not_applicable bundles from the totals
    const applicableResults = bundleResults.filter(
      (result) => result.status !== 'not_applicable',
    );
    const optimizedCount = applicableResults.filter(
      (result) => result.applied,
    ).length;
    const totalCount = applicableResults.length;

    let completionRate;
    let status;
    if (totalCount === 0) {
      completionRate = 0;
      status = 'not_applicable';
    } else {
      completionRate = (optimizedCount / totalCount) * 100;
      if (completionRate === 0) {
        status = 'not_started';
      } else if (completionRate >= 100) {
        status = 'complete';
      } else {
        status = 'partial';
      }
    }

    globalAnalysis[key] = {
      ...REACT19_OPTIMIZATIONS[key],
      appliedToBundles: optimizedCount,
      totalBundles: totalCount,
      completionRate: parseFloat(completionRate.toFixed(1)),
      completionRateFormatted: completionRate.toFixed(1) + '%',
      status,
    };
  });

  return globalAnalysis;
}

export {
  generateEnhancedReport,
  analyzeBundle,
  analyzeGlobalOptimizations,
  BUNDLE_TARGETS,
  REACT19_OPTIMIZATIONS,
};

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const report = generateEnhancedReport();
  console.log('📊 Enhanced Bundle Analysis Report');
  console.log('==================================\n');

  // Print summary
  console.log(`📅 Generated: ${report.timestamp}`);
  if (report.git && report.git.commit) {
    console.log(
      `🔗 Git: ${report.git.commit.substring(0, 8)}`,
    );
  }
  console.log(
    `📦 Bundles: ${report.summary.compliantBundles}/${report.summary.existingBundles} compliant`,
  );
  console.log(
    `📏 Total Size: ${report.summary.totalSizes.rawFormatted} raw, ${report.summary.totalSizes.gzipFormatted} gzip\n`,
  );

  // Save detailed report
  const reportsDir = join(projectRoot, 'reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = join(reportsDir, `bundle-analysis-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved: ${reportPath}`);
}
