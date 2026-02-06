#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateEnhancedReport } from './enhanced-bundle-monitor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Bundle monitoring dashboard with historical tracking
class BundleDashboard {
  constructor() {
    this.reportsDir = join(projectRoot, 'reports');
    this.currentReport = null;
    this.historicalReports = [];
  }

  async generateCurrentReport() {
    this.currentReport = generateEnhancedReport();
    return this.currentReport;
  }

  loadHistoricalReports(limit = 10) {
    if (!existsSync(this.reportsDir)) {
      return [];
    }

    const reportFiles = readdirSync(this.reportsDir)
      .filter(
        (file) => file.startsWith('bundle-analysis-') && file.endsWith('.json'),
      )
      .sort((a, b) => {
        const timeA = parseInt(
          a.match(/bundle-analysis-(\d+)\.json/)?.[1] || '0',
        );
        const timeB = parseInt(
          b.match(/bundle-analysis-(\d+)\.json/)?.[1] || '0',
        );
        return timeB - timeA; // Most recent first
      })
      .slice(0, limit);

    this.historicalReports = reportFiles
      .map((file) => {
        try {
          const content = readFileSync(join(this.reportsDir, file), 'utf8');
          return JSON.parse(content);
        } catch (error) {
          console.warn(`Failed to load report ${file}:`, error.message);
          return null;
        }
      })
      .filter(Boolean);

    return this.historicalReports;
  }

  generateTrendAnalysis() {
    if (this.historicalReports.length < 2) {
      return { error: 'Insufficient historical data for trend analysis' };
    }

    const latest = this.historicalReports[0];
    const previous = this.historicalReports[1];
    const oldest = this.historicalReports[this.historicalReports.length - 1];

    return {
      shortTerm: this.compareBundleReports(previous, latest),
      longTerm: this.compareBundleReports(oldest, latest),
      optimizationProgress: this.analyzeOptimizationProgress(),
      recommendations: this.generateRecommendations(),
    };
  }

  compareBundleReports(oldReport, newReport) {
    const comparison = {
      timestamp: {
        old: oldReport.timestamp,
        new: newReport.timestamp,
      },
      totalSize: {
        raw: {
          old: oldReport.summary.totalSizes.raw,
          new: newReport.summary.totalSizes.raw,
          change:
            newReport.summary.totalSizes.raw - oldReport.summary.totalSizes.raw,
          changePercent: (
            ((newReport.summary.totalSizes.raw -
              oldReport.summary.totalSizes.raw) /
              oldReport.summary.totalSizes.raw) *
            100
          ).toFixed(2),
        },
        gzip: {
          old: oldReport.summary.totalSizes.gzip,
          new: newReport.summary.totalSizes.gzip,
          change:
            newReport.summary.totalSizes.gzip -
            oldReport.summary.totalSizes.gzip,
          changePercent: (
            ((newReport.summary.totalSizes.gzip -
              oldReport.summary.totalSizes.gzip) /
              oldReport.summary.totalSizes.gzip) *
            100
          ).toFixed(2),
        },
      },
      bundleChanges: this.compareBundles(oldReport.bundles, newReport.bundles),
    };

    return comparison;
  }

  compareBundles(oldBundles, newBundles) {
    const changes = [];

    newBundles.forEach((newBundle) => {
      const oldBundle = oldBundles.find((b) => b.path === newBundle.path);
      if (!oldBundle || !oldBundle.exists || !newBundle.exists) return;

      const rawChange = newBundle.sizes.raw - oldBundle.sizes.raw;
      const gzipChange = newBundle.sizes.gzip - oldBundle.sizes.gzip;

      changes.push({
        path: newBundle.path,
        name: newBundle.name,
        rawChange,
        gzipChange,
        rawChangePercent: ((rawChange / oldBundle.sizes.raw) * 100).toFixed(2),
        gzipChangePercent: ((gzipChange / oldBundle.sizes.gzip) * 100).toFixed(
          2,
        ),
        trend:
          rawChange > 0 ? 'increased' : rawChange < 0 ? 'decreased' : 'stable',
      });
    });

    return changes;
  }

  analyzeOptimizationProgress() {
    if (this.historicalReports.length < 2) return null;

    const latest = this.historicalReports[0];
    const previous = this.historicalReports[1];

    const progress = {};

    Object.keys(latest.react19Optimizations).forEach((key) => {
      const latestOpt = latest.react19Optimizations[key];
      const previousOpt = previous.react19Optimizations?.[key];

      if (previousOpt) {
        progress[key] = {
          name: latestOpt.name,
          previousRate: previousOpt.completionRate,
          currentRate: latestOpt.completionRate,
          improvement: latestOpt.completionRate - previousOpt.completionRate,
          status: latestOpt.status,
        };
      }
    });

    return progress;
  }

  generateRecommendations() {
    if (!this.currentReport) return [];

    const recommendations = [];

    // Check bundle size compliance
    this.currentReport.bundles.forEach((bundle) => {
      if (!bundle.exists) return;

      if (!bundle.compliance.raw) {
        recommendations.push({
          type: 'size-violation',
          priority: 'high',
          bundle: bundle.name,
          message: `${bundle.name} exceeds raw size limit (${bundle.sizes.rawFormatted} > ${bundle.thresholds.rawFormatted})`,
          suggestion:
            'Consider code splitting, tree shaking, or removing unused dependencies',
        });
      }

      if (!bundle.compliance.gzip) {
        recommendations.push({
          type: 'compression-issue',
          priority: 'medium',
          bundle: bundle.name,
          message: `${bundle.name} exceeds gzip size limit (${bundle.sizes.gzipFormatted} > ${bundle.thresholds.gzipFormatted})`,
          suggestion:
            'Review compression settings and consider additional minification',
        });
      }
    });

    // Check React 19 optimization status
    Object.entries(this.currentReport.react19Optimizations).forEach(
      ([key, optimization]) => {
        if (optimization.status !== 'complete') {
          recommendations.push({
            type: 'optimization-incomplete',
            priority: 'medium',
            optimization: optimization.name,
            message: `${optimization.name} is only ${optimization.completionRateFormatted} complete`,
            suggestion: `Apply ${optimization.name} to remaining bundles for ${optimization.expectedSavings} size reduction`,
          });
        }
      },
    );

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  printDashboard() {
    console.log('📊 React Simple Maps - Bundle Dashboard');
    console.log('=====================================\n');

    if (!this.currentReport) {
      console.log('❌ No current report available');
      return;
    }

    // Current status
    console.log('📈 Current Bundle Status');
    console.log(`📅 Generated: ${this.currentReport.timestamp}`);
    console.log(
      `📦 Total Size: ${this.currentReport.summary.totalSizes.rawFormatted} raw, ${this.currentReport.summary.totalSizes.gzipFormatted} gzip`,
    );
    console.log(
      `✅ Compliance: ${this.currentReport.summary.compliantBundles}/${this.currentReport.summary.existingBundles} bundles\n`,
    );

    // Bundle details
    console.log('📋 Bundle Details');
    this.currentReport.bundles.forEach((bundle) => {
      if (!bundle.exists) {
        console.log(`❌ ${bundle.name}: Not found`);
        return;
      }

      const complianceIcon =
        bundle.compliance.raw && bundle.compliance.gzip ? '✅' : '⚠️';
      console.log(`${complianceIcon} ${bundle.name}`);
      console.log(
        `   Raw: ${bundle.sizes.rawFormatted} (${bundle.utilization.rawFormatted} of limit)`,
      );
      console.log(
        `   Gzip: ${bundle.sizes.gzipFormatted} (${bundle.utilization.gzipFormatted} of limit)`,
      );
    });

    // React 19 optimizations
    console.log('\n🚀 React 19 Optimizations');
    Object.entries(this.currentReport.react19Optimizations).forEach(
      ([key, opt]) => {
        const statusIcon = opt.status === 'complete' ? '✅' : '🔄';
        console.log(
          `${statusIcon} ${opt.name}: ${opt.completionRateFormatted} complete (${opt.expectedSavings} potential savings)`,
        );
      },
    );

    // Trends (if available)
    if (this.historicalReports.length > 1) {
      const trends = this.generateTrendAnalysis();
      console.log('\n📈 Recent Trends');

      const shortTerm = trends.shortTerm;
      const rawTrend = parseFloat(shortTerm.totalSize.raw.changePercent);
      const trendIcon = rawTrend > 0 ? '📈' : rawTrend < 0 ? '📉' : '➡️';

      console.log(
        `${trendIcon} Size change: ${shortTerm.totalSize.raw.changePercent}% raw, ${shortTerm.totalSize.gzip.changePercent}% gzip`,
      );
    }

    // Recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations');
      recommendations.slice(0, 5).forEach((rec) => {
        const priorityIcon =
          rec.priority === 'high'
            ? '🔴'
            : rec.priority === 'medium'
              ? '🟡'
              : '🟢';
        console.log(`${priorityIcon} ${rec.message}`);
        console.log(`   💡 ${rec.suggestion}`);
      });
    }

    console.log('\n📄 Run with --detailed for full analysis');
  }

  async run(options = {}) {
    await this.generateCurrentReport();
    this.loadHistoricalReports();

    if (options.detailed) {
      const trends = this.generateTrendAnalysis();
      console.log(
        JSON.stringify(
          {
            current: this.currentReport,
            trends,
            recommendations: this.generateRecommendations(),
          },
          null,
          2,
        ),
      );
    } else {
      this.printDashboard();
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    detailed: args.includes('--detailed'),
  };

  const dashboard = new BundleDashboard();
  dashboard.run(options).catch(console.error);
}

export default BundleDashboard;
