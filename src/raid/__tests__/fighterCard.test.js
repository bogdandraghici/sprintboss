// src/raid/__tests__/fighterCard.test.js
import { describe, it, expect } from 'vitest';
import { cardStats, weaponClassLabel } from '../fighterCard';

describe('cardStats', () => {
  const f = { done: 3, open: 5, stale: 2, blocked: 1, status: 'fighting' };

  it('returns the five numeric cells in order', () => {
    const stats = cardStats(f, 4);
    expect(stats.map((s) => s.label)).toEqual([
      'Completed', 'Moved 24h', 'In flight', 'Stale', 'Blocked',
    ]);
  });

  it('maps values from the fighter and the moved count', () => {
    const stats = cardStats(f, 4);
    expect(stats.map((s) => s.value)).toEqual([3, 4, 5, 2, 1]);
  });

  it('tones only the done/stale/blocked cells', () => {
    const byKey = Object.fromEntries(cardStats(f, 4).map((s) => [s.key, s.tone]));
    expect(byKey).toEqual({
      done: 'done', moved: null, open: null, stale: 'stale', blocked: 'blocked',
    });
  });
});

describe('weaponClassLabel', () => {
  it('maps known weapons to role names', () => {
    // Andrei Scheau = bow, Cristina Stanica = staff, Calin Nicoara = hammer,
    // Alex Preda = daggers, Serban Chiricescu = sword (from ROSTER).
    expect(weaponClassLabel('Andrei Scheau')).toBe('Archer');
    expect(weaponClassLabel('Cristina Stanica')).toBe('Mage');
    expect(weaponClassLabel('Calin Nicoara')).toBe('Breaker');
    expect(weaponClassLabel('Alex Preda')).toBe('Rogue');
    expect(weaponClassLabel('Serban Chiricescu')).toBe('Swordfighter');
  });

  it('falls back to the recruit weapon (sword) for unknown names', () => {
    expect(weaponClassLabel('Nobody At All')).toBe('Swordfighter');
  });
});
