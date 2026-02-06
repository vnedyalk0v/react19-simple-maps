#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Bundle size thresholds (in KB)
const SIZE_THRESHOLDS = {
  'dist/index.js': {
    raw: 120, // 120KB raw
    gzip: 35, // 35KB gzipped
  },
  'dist/utils.js': {
    raw: 80, // 80KB raw
    gzip: 25, // 25KB gzipped
  },
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeFile(filePath) {
  const fullPath = join(projectRoot, filePath);

  if (!existsSync(fullPath)) {
    return {
      exists: false,
      path: filePath,
    };
  }

  const content = readFileSync(fullPath);
  const rawSize = content.length;
  const gzipSize = gzipSync(content).length;

  const threshold = SIZE_THRESHOLDS[filePath];

  return {
    exists: true,
    path: filePath,
    rawSize,
    gzipSize,
    rawSizeFormatted: formatBytes(rawSize),
    gzipSizeFormatted: formatBytes(gzipSize),
    rawThreshold: threshold?.raw ? threshold.raw * 1024 : null,
    gzipThreshold: threshold?.gzip ? threshold.gzip * 1024 : null,
    rawWithinThreshold: threshold?.raw ? rawSize <= threshold.raw * 1024 : true,
    gzipWithinThreshold: threshold?.gzip
      ? gzipSize <= threshold.gzip * 1024
      : true,
  };
}

function generateReport() {
  const files = Object.keys(SIZE_THRESHOLDS);
  const results = files.map(analyzeFile);

  const report = {
    timestamp: new Date().toISOString(),
    files: results,
    summary: {
      totalFiles: results.length,
      existingFiles: results.filter((r) => r.exists).length,
      filesWithinThreshold: results.filter(
        (r) => r.exists && r.rawWithinThreshold && r.gzipWithinThreshold,
      ).length,
      totalRawSize: results
        .filter((r) => r.exists)
        .reduce((sum, r) => sum + r.rawSize, 0),
      totalGzipSize: results
        .filter((r) => r.exists)
        .reduce((sum, r) => sum + r.gzipSize, 0),
    },
  };

  report.summary.totalRawSizeFormatted = formatBytes(
    report.summary.totalRawSize,
  );
  report.summary.totalGzipSizeFormatted = formatBytes(
    report.summary.totalGzipSize,
  );
  report.summary.allWithinThreshold =
    report.summary.filesWithinThreshold === report.summary.existingFiles;

  return report;
}

function printReport(report) {
  console.log('\n📦 Bundle Size Analysis Report');
  console.log('================================\n');

  console.log(`📅 Generated: ${report.timestamp}`);
  console.log(
    `📊 Files analyzed: ${report.summary.existingFiles}/${report.summary.totalFiles}`,
  );
  console.log(
    `✅ Within thresholds: ${report.summary.filesWithinThreshold}/${report.summary.existingFiles}`,
  );
  console.log(`📦 Total raw size: ${report.summary.totalRawSizeFormatted}`);
  console.log(
    `🗜️  Total gzip size: ${report.summary.totalGzipSizeFormatted}\n`,
  );

  report.files.forEach((file) => {
    if (!file.exists) {
      console.log(`❌ ${file.path} - File not found`);
      return;
    }

    const rawStatus = file.rawWithinThreshold ? '✅' : '❌';
    const gzipStatus = file.gzipWithinThreshold ? '✅' : '❌';

    console.log(`📄 ${file.path}`);
    console.log(`   Raw:  ${file.rawSizeFormatted} ${rawStatus}`);
    console.log(`   Gzip: ${file.gzipSizeFormatted} ${gzipStatus}`);

    if (file.rawThreshold) {
      const rawPercentage = ((file.rawSize / file.rawThreshold) * 100).toFixed(
        1,
      );
      console.log(
        `   Raw threshold: ${formatBytes(file.rawThreshold)} (${rawPercentage}% used)`,
      );
    }

    if (file.gzipThreshold) {
      const gzipPercentage = (
        (file.gzipSize / file.gzipThreshold) *
        100
      ).toFixed(1);
      console.log(
        `   Gzip threshold: ${formatBytes(file.gzipThreshold)} (${gzipPercentage}% used)`,
      );
    }

    console.log('');
  });

  if (report.summary.allWithinThreshold) {
    console.log('🎉 All bundles are within size thresholds!');
  } else {
    console.log(
      '⚠️  Some bundles exceed size thresholds. Consider optimization.',
    );
    process.exit(1);
  }
}

function saveReport(report) {
  const reportPath = join(projectRoot, 'bundle-analysis.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to: ${reportPath}`);
}

function compareWithPrevious(currentReport) {
  const reportPath = join(projectRoot, 'bundle-analysis.json');

  if (!existsSync(reportPath)) {
    console.log('📊 No previous report found for comparison');
    return;
  }

  try {
    const previousReport = JSON.parse(readFileSync(reportPath, 'utf8'));

    console.log('\n📈 Size Comparison with Previous Build');
    console.log('=====================================\n');

    currentReport.files.forEach((currentFile) => {
      if (!currentFile.exists) return;

      const previousFile = previousReport.files?.find(
        (f) => f.path === currentFile.path,
      );
      if (!previousFile || !previousFile.exists) return;

      const rawDiff = currentFile.rawSize - previousFile.rawSize;
      const gzipDiff = currentFile.gzipSize - previousFile.gzipSize;

      const rawDiffFormatted =
        rawDiff >= 0
          ? `+${formatBytes(rawDiff)}`
          : `-${formatBytes(Math.abs(rawDiff))}`;
      const gzipDiffFormatted =
        gzipDiff >= 0
          ? `+${formatBytes(gzipDiff)}`
          : `-${formatBytes(Math.abs(gzipDiff))}`;

      const rawIcon = rawDiff > 0 ? '📈' : rawDiff < 0 ? '📉' : '➡️';
      const gzipIcon = gzipDiff > 0 ? '📈' : gzipDiff < 0 ? '📉' : '➡️';

      console.log(`📄 ${currentFile.path}`);
      console.log(`   Raw:  ${rawIcon} ${rawDiffFormatted}`);
      console.log(`   Gzip: ${gzipIcon} ${gzipDiffFormatted}\n`);
    });

    const totalRawDiff =
      currentReport.summary.totalRawSize -
      (previousReport.summary?.totalRawSize || 0);
    const totalGzipDiff =
      currentReport.summary.totalGzipSize -
      (previousReport.summary?.totalGzipSize || 0);

    console.log('📊 Total Change:');
    console.log(
      `   Raw:  ${totalRawDiff >= 0 ? '+' : ''}${formatBytes(totalRawDiff)}`,
    );
    console.log(
      `   Gzip: ${totalGzipDiff >= 0 ? '+' : ''}${formatBytes(totalGzipDiff)}\n`,
    );
  } catch (error) {
    console.log('⚠️  Could not compare with previous report:', error.message);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const shouldSave = !args.includes('--no-save');
  const shouldCompare = args.includes('--compare');

  console.log('🔍 Analyzing bundle sizes...\n');

  const report = generateReport();

  if (shouldCompare) {
    compareWithPrevious(report);
  }

  printReport(report);

  if (shouldSave) {
    saveReport(report);
  }
}

main();
