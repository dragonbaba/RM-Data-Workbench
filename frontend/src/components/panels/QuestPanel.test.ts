import { describe, expect, it } from 'vitest';
import { canObjectiveUseCalculateType } from './QuestPanel';

describe('QuestPanel objective calculate type visibility', () => {
  it('allows cumulative mode only for quantity-based objectives', () => {
    expect(canObjectiveUseCalculateType(1)).toBe(true);
    expect(canObjectiveUseCalculateType(2)).toBe(true);
    expect(canObjectiveUseCalculateType(3)).toBe(true);
    expect(canObjectiveUseCalculateType(4)).toBe(true);
    expect(canObjectiveUseCalculateType(6)).toBe(true);
    expect(canObjectiveUseCalculateType(7)).toBe(true);
  });

  it('does not show cumulative mode for switch objectives', () => {
    expect(canObjectiveUseCalculateType(5)).toBe(false);
  });
});
