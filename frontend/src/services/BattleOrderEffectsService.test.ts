import { describe, expect, it } from 'vitest';
import {
  areBattleOrderEffectsEqual,
  buildBattleOrderEffectsSaveData,
  normalizeBattleOrderEffects,
} from './BattleOrderEffectsService';

describe('BattleOrderEffectsService', () => {
  it('会把缺失的顺位字段归一化为结构化默认值', () => {
    expect(normalizeBattleOrderEffects(undefined)).toEqual({
      userNext: 0,
      targetCurrent: 0,
      targetNext: 0,
      targetFollow: false,
      speedConvert: 0,
    });
  });

  it('会把输入值转换为可保存的 orderEffects 结构', () => {
    expect(buildBattleOrderEffectsSaveData({
      userNext: '2',
      targetCurrent: -1.8,
      targetNext: '3',
      targetFollow: true,
      speedConvert: '15',
    })).toEqual({
      userNext: 2,
      targetCurrent: -1,
      targetNext: 3,
      targetFollow: true,
      speedConvert: 15,
    });
  });

  it('仅在结构化顺位字段变化时才视为不相等', () => {
    expect(areBattleOrderEffectsEqual(
      {
        userNext: 1,
        targetCurrent: 0,
        targetNext: 0,
        targetFollow: false,
        speedConvert: 0,
      },
      {
        userNext: 1,
        targetCurrent: 0,
        targetNext: 0,
        targetFollow: false,
        speedConvert: 0,
      },
    )).toBe(true);
  });
});
