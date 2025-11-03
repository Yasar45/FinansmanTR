import { describe, expect, it } from 'vitest';
import { add, subtract, multiply, percentage } from '@/lib/money';

describe('money utils', () => {
  it('should add precisely', () => {
    expect(add(0.1, 0.2).toNumber()).toBeCloseTo(0.3);
  });

  it('should subtract precisely', () => {
    expect(subtract(1, 0.9).toNumber()).toBeCloseTo(0.1);
  });

  it('should multiply precisely', () => {
    expect(multiply(1.5, 2).toNumber()).toBeCloseTo(3);
  });

  it('should compute basis points', () => {
    expect(percentage(1000, 25).toNumber()).toBe(2.5);
  });
});
