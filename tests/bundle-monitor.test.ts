import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers – import the pure functions from the bundle monitor script
// ---------------------------------------------------------------------------
const monitorPath = '../scripts/enhanced-bundle-monitor.js';

// ---------------------------------------------------------------------------
// SEC-004: Optimization status mapping (0% → not_started, 1-99% → partial, 100% → complete)
// ---------------------------------------------------------------------------
describe('Bundle monitor: optimization status mapping', () => {
  it('should map 0% completion to "not_started"', async () => {
    const { analyzeGlobalOptimizations } = await import(monitorPath);

    // Two bundles where consoleStripping is NOT applied (both have indicators)
    const bundles = [
      {
        optimizations: {
          consoleStripping: {
            name: 'Console Statement Removal',
            expectedSavings: '2-5%',
            applied: false,
            foundIndicators: ['console.log'],
            status: 'needs-optimization',
          },
        },
      },
      {
        optimizations: {
          consoleStripping: {
            name: 'Console Statement Removal',
            expectedSavings: '2-5%',
            applied: false,
            foundIndicators: ['console.warn'],
            status: 'needs-optimization',
          },
        },
      },
    ];

    const result = analyzeGlobalOptimizations(bundles);
    expect(result.consoleStripping.status).toBe('not_started');
    expect(result.consoleStripping.completionRate).toBe(0);
    expect(result.consoleStripping.appliedToBundles).toBe(0);
  });

  it('should map 50% completion to "partial"', async () => {
    const { analyzeGlobalOptimizations } = await import(monitorPath);

    const bundles = [
      {
        optimizations: {
          consoleStripping: {
            name: 'Console Statement Removal',
            expectedSavings: '2-5%',
            applied: true,
            foundIndicators: null,
            status: 'optimized',
          },
        },
      },
      {
        optimizations: {
          consoleStripping: {
            name: 'Console Statement Removal',
            expectedSavings: '2-5%',
            applied: false,
            foundIndicators: ['console.warn'],
            status: 'needs-optimization',
          },
        },
      },
    ];

    const result = analyzeGlobalOptimizations(bundles);
    expect(result.consoleStripping.status).toBe('partial');
    expect(result.consoleStripping.completionRate).toBe(50);
  });

  it('should map 100% completion to "complete"', async () => {
    const { analyzeGlobalOptimizations } = await import(monitorPath);

    const bundles = [
      {
        optimizations: {
          treeShaking: {
            name: 'Enhanced Tree Shaking',
            expectedSavings: '10-15%',
            applied: true,
            foundIndicators: null,
            status: 'optimized',
          },
        },
      },
      {
        optimizations: {
          treeShaking: {
            name: 'Enhanced Tree Shaking',
            expectedSavings: '10-15%',
            applied: true,
            foundIndicators: null,
            status: 'optimized',
          },
        },
      },
    ];

    const result = analyzeGlobalOptimizations(bundles);
    expect(result.treeShaking.status).toBe('complete');
    expect(result.treeShaking.completionRate).toBe(100);
  });

  it('should exclude not_applicable bundles from totals', async () => {
    const { analyzeGlobalOptimizations } = await import(monitorPath);

    // 1 applicable (not applied) + 1 not_applicable → 0/1 = 0% → not_started
    const bundles = [
      {
        optimizations: {
          consoleStripping: {
            name: 'Console Statement Removal',
            expectedSavings: '2-5%',
            applied: false,
            foundIndicators: ['console.log'],
            status: 'needs-optimization',
          },
        },
      },
      {
        optimizations: {
          consoleStripping: {
            name: 'Console Statement Removal',
            expectedSavings: '2-5%',
            applied: false,
            foundIndicators: null,
            status: 'not_applicable',
          },
        },
      },
    ];

    const result = analyzeGlobalOptimizations(bundles);
    expect(result.consoleStripping.totalBundles).toBe(1);
    expect(result.consoleStripping.appliedToBundles).toBe(0);
    expect(result.consoleStripping.status).toBe('not_started');
  });
});

// ---------------------------------------------------------------------------
// SEC-005: Git metadata redaction in bundle reports
// ---------------------------------------------------------------------------
describe('Bundle monitor: git metadata redaction', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the module registry so the next dynamic import of monitorPath
    // re-evaluates the module with the current process.env values.
    vi.resetModules();
    // Isolate env mutations per test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should redact git.branch to "<redacted>" by default', async () => {
    // Clear any redact flag so default behaviour is tested
    delete process.env.BUNDLE_REPORT_REDACT_GIT;

    const { generateEnhancedReport } = await import(monitorPath);
    const report = generateEnhancedReport();

    // git should be present but branch must be redacted
    expect(report.git).not.toBeNull();
    if (report.git && !('error' in report.git)) {
      expect(report.git.branch).toBe('<redacted>');
      // Should NOT contain a real branch name pattern
      expect(report.git.branch).not.toMatch(/^(fix|feat|chore|main|dev)\//);
    }
  });

  it('should omit git entirely when BUNDLE_REPORT_REDACT_GIT=true', async () => {
    process.env.BUNDLE_REPORT_REDACT_GIT = 'true';

    const { generateEnhancedReport } = await import(monitorPath);
    const report = generateEnhancedReport();

    expect(report.git).toBeNull();
  });

  it('should omit git entirely when BUNDLE_REPORT_REDACT_GIT=1', async () => {
    process.env.BUNDLE_REPORT_REDACT_GIT = '1';

    const { generateEnhancedReport } = await import(monitorPath);
    const report = generateEnhancedReport();

    expect(report.git).toBeNull();
  });

  it('persisted reports should never contain raw branch names', async () => {
    delete process.env.BUNDLE_REPORT_REDACT_GIT;

    const { generateEnhancedReport } = await import(monitorPath);
    const report = generateEnhancedReport();
    const serialized = JSON.stringify(report);

    // Must not contain typical branch name patterns that could leak info
    // (allow "<redacted>" and null, but not "fix/...", "feat/...", etc.)
    expect(serialized).not.toMatch(
      /"branch"\s*:\s*"(fix|feat|chore|release|hotfix)\//,
    );
  });
});
