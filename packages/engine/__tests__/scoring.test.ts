import { describe, it, expect } from 'vitest';
import { calculateElo, getTier, Tier } from '../src/scoring';

describe('calculateElo', () => {
  it('winner gains, loser loses equal amount', () => {
    const { newA, newB } = calculateElo(1000, 1000, true);
    expect(newA).toBeGreaterThan(1000);
    expect(newB).toBeLessThan(1000);
    expect(newA - 1000).toBe(1000 - newB);
  });

  it('equal ratings: winner gets +16', () => {
    const { change } = calculateElo(1000, 1000, true);
    expect(change).toBe(16);
  });

  it('underdog wins: bigger change', () => {
    const { change: underdogWin } = calculateElo(800, 1200, true);
    const { change: favoriteWin } = calculateElo(1200, 800, true);
    expect(underdogWin).toBeGreaterThan(favoriteWin);
  });

  it('loser loses points', () => {
    const { change } = calculateElo(1000, 1000, false);
    expect(change).toBe(-16);
  });
});

describe('getTier', () => {
  it('returns correct tiers for boundary values', () => {
    expect(getTier(799)).toBe(Tier.BRONZE);
    expect(getTier(800)).toBe(Tier.SILVER);
    expect(getTier(1000)).toBe(Tier.GOLD);
    expect(getTier(1200)).toBe(Tier.PLATINUM);
    expect(getTier(1400)).toBe(Tier.DIAMOND);
    expect(getTier(1600)).toBe(Tier.MASTER);
  });
});
