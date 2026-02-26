import { describe, it, expect } from 'vitest';
import { createPRNG } from '../src/prng.js';

describe('createPRNG', () => {
  it('returns a function', () => {
    const rng = createPRNG(42);
    expect(typeof rng).toBe('function');
  });

  it('produces numbers between 0 and 1', () => {
    const rng = createPRNG(42);
    for (let i = 0; i < 1000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed produces same sequence', () => {
    const rng1 = createPRNG(12345);
    const rng2 = createPRNG(12345);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = createPRNG(1);
    const rng2 = createPRNG(2);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});
