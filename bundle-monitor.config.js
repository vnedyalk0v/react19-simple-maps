// Bundle monitoring configuration for react-simple-maps
export default {
  // Bundle size thresholds and targets
  targets: {
    'dist/index.js': {
      name: 'ESM Bundle (main)',
      description: 'Modern ESM bundle for bundlers and modern environments',
      priority: 'high',
      thresholds: {
        raw: { max: 120 * 1024, warning: 100 * 1024 },
        gzip: { max: 35 * 1024, warning: 30 * 1024 },
        brotli: { max: 30 * 1024, warning: 25 * 1024 },
      },
      optimizations: [
        'tree-shaking',
        'minification',
        'compression',
        'modern-syntax',
      ],
    },
    'dist/utils.js': {
      name: 'ESM Bundle (utils)',
      description: 'ESM utilities bundle for direct imports',
      priority: 'medium',
      thresholds: {
        raw: { max: 80 * 1024, warning: 65 * 1024 },
        gzip: { max: 25 * 1024, warning: 20 * 1024 },
        brotli: { max: 22 * 1024, warning: 18 * 1024 },
      },
      optimizations: ['tree-shaking', 'minification', 'compression'],
    },
    'dist/index.d.ts': {
      name: 'TypeScript Definitions (main)',
      description: 'TypeScript type definitions',
      priority: 'low',
      thresholds: {
        raw: { max: 50 * 1024, warning: 40 * 1024 },
        gzip: { max: 10 * 1024, warning: 8 * 1024 },
        brotli: { max: 8 * 1024, warning: 6 * 1024 },
      },
      optimizations: ['type-optimization'],
    },
    'dist/utils.d.ts': {
      name: 'TypeScript Definitions (utils)',
      description: 'TypeScript type definitions for utils',
      priority: 'low',
      thresholds: {
        raw: { max: 40 * 1024, warning: 32 * 1024 },
        gzip: { max: 8 * 1024, warning: 6 * 1024 },
        brotli: { max: 7 * 1024, warning: 5 * 1024 },
      },
      optimizations: ['type-optimization'],
    },
  },

  // React 19 optimization tracking
  react19Optimizations: {
    concurrentFeatures: {
      name: 'React 19 Concurrent Features',
      description:
        'Optimized concurrent rendering with useTransition, useDeferredValue, useOptimistic',
      expectedSavings: { min: 5, max: 10 }, // Percentage
      indicators: {
        positive: [
          'startTransition',
          'useDeferredValue',
          'useOptimistic',
          'Suspense',
        ],
        negative: [
          'useLayoutEffect',
          'componentDidMount',
          'componentDidUpdate',
        ],
      },
      weight: 0.3, // Importance weight for overall score
    },
    consoleStripping: {
      name: 'Console Statement Removal',
      description: 'Removal of console statements in production builds',
      expectedSavings: { min: 2, max: 5 },
      indicators: {
        positive: [], // No console statements is good
        negative: [
          'console.log',
          'console.warn',
          'console.debug',
          'console.info',
        ],
      },
      weight: 0.2,
    },
    treeShaking: {
      name: 'Enhanced Tree Shaking',
      description: 'Removal of unused code and dead code elimination',
      expectedSavings: { min: 10, max: 15 },
      indicators: {
        positive: ['sideEffects: false', 'ES modules'],
        negative: ['require(', 'module.exports', 'unused exports'],
      },
      weight: 0.3,
    },
    compression: {
      name: 'Advanced Compression',
      description: 'Terser optimization, gzip, and brotli compression',
      expectedSavings: { min: 15, max: 25 },
      indicators: {
        positive: ['terser', 'minified', 'compressed'],
        negative: ['unminified', 'development'],
      },
      weight: 0.2,
    },
  },

  // Monitoring settings
  monitoring: {
    // Historical data retention
    historyRetention: {
      maxReports: 50, // Keep last 50 reports
      maxAgeDays: 30, // Keep reports for 30 days
    },

    // Alert thresholds
    alerts: {
      sizeIncrease: {
        warning: 5, // Warn if bundle size increases by 5%
        critical: 10, // Critical if bundle size increases by 10%
      },
      thresholdViolation: {
        warning: 'warning', // Alert when warning threshold is exceeded
        critical: 'max', // Critical when max threshold is exceeded
      },
      optimizationRegression: {
        warning: 10, // Warn if optimization score drops by 10%
        critical: 20, // Critical if optimization score drops by 20%
      },
    },

    // CI/CD integration
    ci: {
      failOnCritical: true, // Fail CI if critical alerts are triggered
      failOnThresholdViolation: true, // Fail CI if max thresholds are exceeded
      generateComments: true, // Generate PR comments with bundle analysis
      compareWithBaseBranch: true, // Compare with base branch in PRs
    },

    // Reporting
    reports: {
      format: 'json', // Report format: json, markdown, html
      includeHistoricalData: true, // Include trend analysis
      includeOptimizationTips: true, // Include optimization recommendations
      includeGitInfo: true, // Include git commit/branch information
    },
  },

  // Performance budgets
  performanceBudgets: {
    // Overall project budgets
    total: {
      raw: 500 * 1024, // 500KB total raw size
      gzip: 150 * 1024, // 150KB total gzip size
      brotli: 120 * 1024, // 120KB total brotli size
    },

    // Per-bundle budgets (automatically calculated from targets)
    perBundle: 'auto',

    // Budget enforcement
    enforcement: {
      strict: false, // Strict mode fails on any budget violation
      warningThreshold: 0.8, // Warn when 80% of budget is used
      criticalThreshold: 0.95, // Critical when 95% of budget is used
    },
  },

  // Optimization recommendations
  recommendations: {
    // Automatic optimization suggestions
    autoSuggest: true,

    // Suggestion categories
    categories: {
      bundleSize: {
        enabled: true,
        suggestions: [
          'Consider code splitting for large bundles',
          'Review and remove unused dependencies',
          'Implement dynamic imports for non-critical code',
          'Use tree shaking to eliminate dead code',
        ],
      },
      react19: {
        enabled: true,
        suggestions: [
          'Migrate to React 19 concurrent features',
          'Use Server Components where applicable',
          'Implement optimistic updates for better UX',
          'Leverage React 19 resource preloading',
        ],
      },
      compression: {
        enabled: true,
        suggestions: [
          'Enable brotli compression for better compression ratios',
          'Review terser configuration for optimal minification',
          'Consider using webpack-bundle-analyzer for detailed analysis',
          'Implement content-based chunking strategies',
        ],
      },
    },
  },

  // Integration settings
  integrations: {
    // GitHub Actions
    github: {
      enabled: false, // Enable for GitHub integration
      token: process.env.GITHUB_TOKEN,
      commentOnPR: true,
      updateStatus: true,
    },

    // Slack notifications
    slack: {
      enabled: false, // Enable for Slack integration
      webhook: process.env.SLACK_WEBHOOK,
      channels: {
        alerts: '#dev-alerts',
        reports: '#dev-reports',
      },
    },

    // Custom webhooks
    webhooks: {
      enabled: false,
      endpoints: [],
    },
  },
};
