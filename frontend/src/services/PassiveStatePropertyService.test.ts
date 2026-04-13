import { describe, expect, it } from 'vitest';
import {
  arePassiveStatesEqual,
  buildPassiveStatesSaveData,
  normalizePassiveStateHostEntry,
  normalizePassiveStates,
} from './PassiveStatePropertyService';

describe('PassiveStatePropertyService', () => {
  it('会把被动状态列表规范化为唯一正整数数组', () => {
    expect(normalizePassiveStates([1, '2', 2, 0, -3, 'abc', 5.8])).toEqual([1, 2, 5]);
  });

  it('保存数据时空值会收口为空数组', () => {
    expect(buildPassiveStatesSaveData(undefined)).toEqual([]);
  });

  it('比较时按规范化后的数组判断相等', () => {
    expect(arePassiveStatesEqual([1, '2', 2], [1, 2])).toBe(true);
    expect(arePassiveStatesEqual([1, 3], [1, 2])).toBe(false);
  });

  it('宿主条目规范化时会强制补齐 passiveStates 数组', () => {
    expect(normalizePassiveStateHostEntry({ id: 1, name: '猎人' })).toMatchObject({
      id: 1,
      name: '猎人',
      passiveStates: [],
    });
  });
});
