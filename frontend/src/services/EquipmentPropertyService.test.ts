import { describe, expect, it } from 'vitest';
import {
  normalizeArmorElementRateFloats,
  normalizeArmorElementRates,
  normalizeEquipUpgradeCosts,
  normalizeEquipmentDataEntry,
} from './EquipmentPropertyService';

describe('EquipmentPropertyService', () => {
  it('会补齐武器固定结构字段', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 8,
        name: '测试炮',
        vehicleParams: {
          repeat: { value: 2 },
        },
      },
      {
        isWeapon: true,
      },
    );

    expect(normalized).toMatchObject({
      id: 8,
      name: '测试炮',
      floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
      attackSkillId: 0,
      attackElementId: 0,
      weaponImageId: 1,
      areaOverride: 0,
      areaMode: 1,
      shapeType: 0,
      areaTargetCount: 0,
      repeatTime: 1,
      repeatTimeFloat: 0,
      qualityLock: false,
      upgradeCosts: [],
      vehicleParams: [
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 2, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
        { value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 },
      ],
    });
  });

  it('会按系统元素数量补齐防具元素字段', () => {
    const systemData = {
      elements: ['', '通常', '火炎', '冷气'],
    };

    expect(normalizeArmorElementRates([99, 1.2], systemData)).toEqual([0, 1.2, 0, 0]);
    expect(normalizeArmorElementRateFloats([99, 0.5, -3], systemData)).toEqual([0, 0.5, 0, 0]);
  });

  it('会兼容编辑器缓存里的包装 System.json 结构', () => {
    const wrappedSystemData = [null, {
      elements: ['', '通常', '火炎', '冷气'],
    }];

    expect(normalizeArmorElementRates([99, 1.2], wrappedSystemData)).toEqual([0, 1.2, 0, 0]);
    expect(normalizeArmorElementRateFloats([99, 0.5, -3], wrappedSystemData)).toEqual([0, 0.5, 0, 0]);
  });

  it('会补齐防具固定结构字段', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 9,
        name: '测试甲',
        etypeId: 8,
        qualityLock: true,
      },
      {
        isArmor: true,
        systemData: {
          elements: ['', '通常', '火炎'],
        },
      },
    );

    expect(normalized).toMatchObject({
      id: 9,
      name: '测试甲',
      etypeId: 8,
      hiddenAttackSkillId: 0,
      qualityLock: true,
      floatParams: [0, 0, 0, 0, 0, 0, 0, 0],
      elementRates: [0, 0, 0],
      elementRateFloats: [0, 0, 0],
    });
    expect(normalized?.extraParams).toHaveLength(6);
    expect(normalized?.vehicleParams).toHaveLength(8);
    expect(normalized?.upgradeParams).toHaveLength(3);
    expect(normalized?.upgradeCosts).toEqual([]);
    expect(normalized?.extraParams?.[0]).toEqual({ value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 });
    expect(normalized?.vehicleParams?.[7]).toEqual({ value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 });
    expect(normalized?.upgradeParams?.[0]).toEqual({ value: 0, floatValue: 0, upgradeValue: 0, upgradeFloatValue: 0 });
  });

  it('会在装备修复中保留武器受控线形范围', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 12,
        name: '远程T型炮',
        areaOverride: 1,
        areaMode: 2,
        shapeType: 3,
        areaTargetCount: 3,
        shapeParams: {
          1: { radius: 360 },
          2: { radius: 520, angleDeg: 42 },
          3: { length: 820, width: 104 },
        },
        repeatTime: 1,
      },
      {
        isWeapon: true,
      },
    );

    expect(normalized).toMatchObject({
      areaOverride: 1,
      areaMode: 2,
      shapeType: 3,
      areaTargetCount: 3,
      shapeParams: {
        3: { length: 820, width: 104 },
      },
    });
  });

  it('会标准化逐级强化耗材配置', () => {
    expect(normalizeEquipUpgradeCosts([
      {
        successRate: 120,
        goldCost: -50,
        requiredItemId: 3,
        requiredItemAmount: 0,
        protectItemId: 0,
        protectItemAmount: 9,
      },
      {
        goldCost: '120',
        successRate: '37.5',
        requiredItemId: 0,
        requiredItemAmount: 5,
        protectItemId: 4,
        protectItemAmount: -2,
      },
      null,
    ])).toEqual([
      {
        successRate: 100,
        goldCost: 0,
        requiredItemId: 3,
        requiredItemAmount: 1,
        protectItemId: 0,
        protectItemAmount: 0,
      },
      {
        successRate: 37.5,
        goldCost: 120,
        requiredItemId: 0,
        requiredItemAmount: 0,
        protectItemId: 4,
        protectItemAmount: 1,
      },
      {
        successRate: 100 / 3,
        goldCost: 0,
        requiredItemId: 0,
        requiredItemAmount: 0,
        protectItemId: 0,
        protectItemAmount: 0,
      },
    ]);
  });

  it('非底盘与C装置防具不会补 hiddenAttackSkillId', () => {
    const normalized = normalizeEquipmentDataEntry(
      {
        id: 10,
        name: '普通头盔',
        etypeId: 2,
      },
      {
        isArmor: true,
        systemData: {
          elements: ['', '通常', '火炎'],
        },
      },
    );

    expect(normalized).not.toHaveProperty('hiddenAttackSkillId');
  });
});
