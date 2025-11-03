import { logger } from '@/lib/logger';

const MAX_SAMPLES = 200;
const durations: number[] = [];

export function recordDashboardLoad(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return { p95: 0, sampleSize: durations.length };
  }

  durations.push(durationMs);
  if (durations.length > MAX_SAMPLES) {
    durations.shift();
  }

  const { p95 } = computePercentiles();
  if (p95 > 1500) {
    logger.warn({ scope: 'dashboard', p95, durationMs }, 'Dashboard load time above budget');
  } else {
    logger.info({ scope: 'dashboard', p95, durationMs }, 'Dashboard load time recorded');
  }

  return { p95, sampleSize: durations.length };
}

export function getDashboardPerformanceStats() {
  return computePercentiles();
}

function computePercentiles() {
  if (durations.length === 0) {
    return { p95: 0, sampleSize: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.max(0, Math.floor(0.95 * (sorted.length - 1)));
  return { p95: sorted[index], sampleSize: sorted.length };
}
