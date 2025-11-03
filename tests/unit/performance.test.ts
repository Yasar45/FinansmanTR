import { describe, expect, it, vi } from 'vitest';

import { getDashboardPerformanceStats, recordDashboardLoad } from '@/lib/performance';

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }
}));

describe('performance budget tracking', () => {
  it('records durations and computes 95th percentile under budget', () => {
    const samples = [800, 900, 1200, 700, 600];
    for (const sample of samples) {
      recordDashboardLoad(sample);
    }
    const stats = getDashboardPerformanceStats();
    expect(stats.sampleSize).toBe(samples.length);
    expect(stats.p95).toBeLessThanOrEqual(1200);
  });

  it('caps invalid durations without altering stats', () => {
    const { sampleSize: before } = getDashboardPerformanceStats();
    const result = recordDashboardLoad(-50);
    const { sampleSize: after } = getDashboardPerformanceStats();
    expect(result.sampleSize).toBe(before);
    expect(after).toBe(before);
  });
});
