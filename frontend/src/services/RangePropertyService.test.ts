import { describe, expect, it } from 'vitest';
import {
  areShapeParamsEqual,
  normalizeCommonRangeDataEntry,
  normalizeCommonRangeValues,
  normalizeWeaponRangeValues,
} from './RangePropertyService';

describe('RangePropertyService', () => {
  it('会为自身目标强制收口到单体', () => {
    const values = normalizeCommonRangeValues({
      targetCamp: 3,
      targetLifeState: 3,
      selectMode: 2,
      areaMode: 4,
    });

    expect(values).toMatchObject({
      targetCamp: 3,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
      shapeType: 0,
      areaTargetCount: 0,
      repeatTime: 1,
      repeatTimeFloat: 0,
    });
  });

  it('会保留范围模式并补齐形状与重复字段', () => {
    const values = normalizeCommonRangeValues({
      targetCamp: 2,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 2,
      areaTargetCount: 3,
      repeatTime: 2,
    });

    expect(values).toMatchObject({
      targetCamp: 2,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 2,
      shapeType: 1,
      areaTargetCount: 3,
      repeatTime: 2,
      repeatTimeFloat: 0,
    });
  });

  it('会把条目补齐为完整通用范围结构', () => {
    const normalized = normalizeCommonRangeDataEntry({
      id: 1,
      name: '手雷',
    });

    expect(normalized).toMatchObject({
      id: 1,
      name: '手雷',
      targetCamp: 1,
      targetLifeState: 1,
      selectMode: 1,
      areaMode: 1,
      shapeType: 0,
      areaTargetCount: 0,
      repeatTime: 1,
      repeatTimeFloat: 0,
    });
  });

  it('会把武器范围规则收口到单一规范化服务', () => {
    const values = normalizeWeaponRangeValues({
      areaOverride: 1,
      areaMode: 2,
      shapeType: 9,
      areaTargetCount: 0,
      repeatTime: 3,
    });

    expect(values).toMatchObject({
      areaOverride: 1,
      areaMode: 2,
      shapeType: 1,
      areaTargetCount: 1,
      repeatTime: 3,
      repeatTimeFloat: 0,
    });
  });

  it('会把缺失的 shapeParams 视为默认协议结构', () => {
    expect(areShapeParamsEqual(undefined, {
      '1': { radius: 120 },
      '2': { radius: 180, angleDeg: 60 },
      '3': { width: 80, length: 240 },
    })).toBe(true);
  });
});
